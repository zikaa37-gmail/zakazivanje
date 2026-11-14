<?php

namespace App\Http\Controllers\Api;

use App\Events\ClientActivity;
use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\BusinessSetting;
use App\Services\AppointmentNotifier;
use App\Services\BookingService;
use App\Services\CancellationFeeService;
use App\Services\ClientDisciplineService;
use App\Services\ReviewService;
use App\Services\WaitlistService;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class MyAppointmentController extends Controller
{
    public function index(Request $request, ReviewService $reviews, CancellationFeeService $fees)
    {
        $data = $request->validate(['scope' => ['required', Rule::in(['upcoming', 'past'])]]);
        $upcoming = $data['scope'] === 'upcoming';

        return Appointment::query()
            ->where('client_id', $request->user()->id)
            ->when($upcoming,
                fn ($q) => $q->where('ends_at', '>=', now())->whereIn('status', Appointment::BLOCKING_STATUSES),
                fn ($q) => $q->where(fn ($w) => $w->where('ends_at', '<', now())->orWhereNotIn('status', Appointment::BLOCKING_STATUSES)))
            ->with(['items', 'staffMember:id,first_name,last_name,title,color', 'review'])
            ->orderBy('starts_at', $upcoming ? 'asc' : 'desc')
            ->limit(100)
            ->get()
            ->map(fn (Appointment $a) => [...$a->toArray(), 'can_cancel' => $this->canCancel($a), 'can_reschedule' => $this->canMove($a), 'late_cancel' => $fees->isLate($a), 'can_pay' => $this->canPay($a), 'can_review' => $reviews->canReview($a)]);
    }

    public function cancellationStatus(Request $request, CancellationFeeService $fees)
    {
        return $fees->status($request->user());
    }

    public function cancelPreview(Request $request, Appointment $appointment, CancellationFeeService $fees)
    {
        abort_unless($appointment->client_id === $request->user()->id, 404);

        return $fees->preview($appointment);
    }

    public function cancel(Request $request, Appointment $appointment, BookingService $bookings, AppointmentNotifier $notifier, WaitlistService $waitlist, CancellationFeeService $fees)
    {
        abort_unless($appointment->client_id === $request->user()->id, 404);

        if (! $this->canCancel($appointment)) {
            $label = BusinessSetting::current()->cancellationLabel();
            throw ValidationException::withMessages(['appointment' => ["Otkazivanje je moguće {$label} — pozovi salon."]]);
        }

        $preview = $fees->preview($appointment);
        if ($preview['late'] && ! $request->boolean('accept_late')) {
            throw ValidationException::withMessages(['accept_late' => ['Potvrdi kasno otkazivanje.']]);
        }

        $fee = DB::transaction(function () use ($appointment, $bookings, $fees) {
            $fee = $fees->record($appointment);
            $bookings->cancel($appointment, 'client');

            return $fee;
        });
        ClientActivity::dispatch($request->user(), ClientActivity::CANCELLED, ['appointment_id' => $appointment->id, 'starts_at' => $appointment->starts_at->format('Y-m-d H:i'), 'hours_before' => (int) now()->diffInHours($appointment->starts_at), 'free_change' => $appointment->free_change_reason !== null]);
        app(ClientDisciplineService::class)->refresh($request->user());
        $notifier->cancelledByClient($appointment);
        $waitlist->slotFreed($appointment);

        return [...$appointment->toArray(), 'cancellation_fee' => $fee];
    }

    public function reschedule(Request $request, Appointment $appointment, BookingService $bookings, AppointmentNotifier $notifier, WaitlistService $waitlist)
    {
        abort_unless($appointment->client_id === $request->user()->id, 404);

        $data = $request->validate([
            'staff_member_id' => ['nullable', 'integer', 'exists:staff_members,id'],
            'starts_at' => ['required', 'date_format:Y-m-d H:i'],
        ]);

        if (! $this->canMove($appointment)) {
            $label = BusinessSetting::current()->cancellationLabel();
            throw ValidationException::withMessages(['appointment' => ["Promena termina je moguća {$label} — pozovi salon."]]);
        }

        $previous = $appointment->starts_at->format('Y-m-d H:i');
        $previousStaff = $appointment->staff_member_id;
        $freeChange = $appointment->free_change_reason !== null;
        $start = CarbonImmutable::createFromFormat('Y-m-d H:i', $data['starts_at']);
        app(ClientDisciplineService::class)->ensureCanBook($request->user(), $start, ClientActivity::RESCHEDULE_FAILED);
        try {
            $moved = $bookings->moveByClient($appointment, $data['staff_member_id'] ?? null, $start);
        } catch (ValidationException $e) {
            ClientActivity::dispatch($request->user(), ClientActivity::RESCHEDULE_FAILED, ['appointment_id' => $appointment->id, 'starts_at' => $data['starts_at'], 'reason' => collect($e->errors())->flatten()->first()]);
            throw $e;
        }
        ClientActivity::dispatch($request->user(), ClientActivity::RESCHEDULED, ['appointment_id' => $appointment->id, 'from' => $previous, 'to' => $data['starts_at'], 'free_change' => $freeChange]);
        if ($freeChange) {
            $moved->update(['free_change_reason' => null]);
        }

        if ($previous !== $moved->starts_at->format('Y-m-d H:i') || $moved->wasChanged('staff_member_id')) {
            $notifier->rescheduledByClient($moved, $previous);
            $waitlist->slotFreedAt(substr($previous, 0, 10), $previousStaff, $moved->client_id);
        }

        return [...$moved->toArray(), 'can_cancel' => $this->canCancel($moved), 'can_reschedule' => $this->canMove($moved), 'late_cancel' => app(CancellationFeeService::class)->isLate($moved), 'can_pay' => $this->canPay($moved)];
    }

    private function canPay(Appointment $appointment): bool
    {
        return BusinessSetting::current()->online_payment_enabled
            && ! $appointment->paid_at
            && $appointment->total > 0
            && in_array($appointment->status, Appointment::BLOCKING_STATUSES, true)
            && $appointment->ends_at->isFuture();
    }

    private function canCancel(Appointment $appointment): bool
    {
        if (! in_array($appointment->status, Appointment::BLOCKING_STATUSES, true)) {
            return false;
        }

        return $this->canMove($appointment) || (BusinessSetting::current()->cancellation_fee_enabled && $appointment->starts_at->isFuture());
    }

    private function canMove(Appointment $appointment): bool
    {
        if (! in_array($appointment->status, Appointment::BLOCKING_STATUSES, true)) {
            return false;
        }

        return $appointment->free_change_reason
            ? $appointment->starts_at->isFuture()
            : now()->lt(BusinessSetting::current()->cancellationDeadline($appointment->starts_at));
    }
}

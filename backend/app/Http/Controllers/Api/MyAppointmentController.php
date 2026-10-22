<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\BusinessSetting;
use App\Services\AppointmentNotifier;
use App\Services\BookingService;
use App\Services\ReviewService;
use App\Services\WaitlistService;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class MyAppointmentController extends Controller
{
    public function index(Request $request, ReviewService $reviews)
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
            ->map(fn (Appointment $a) => [...$a->toArray(), 'can_cancel' => $this->canCancel($a), 'can_pay' => $this->canPay($a), 'can_review' => $reviews->canReview($a)]);
    }

    public function cancel(Request $request, Appointment $appointment, BookingService $bookings, AppointmentNotifier $notifier, WaitlistService $waitlist)
    {
        abort_unless($appointment->client_id === $request->user()->id, 404);

        if (! $this->canCancel($appointment)) {
            $label = BusinessSetting::current()->cancellationLabel();
            throw ValidationException::withMessages(['appointment' => ["Otkazivanje je moguće {$label} — pozovi salon."]]);
        }

        $bookings->cancel($appointment, 'client');
        $notifier->cancelledByClient($appointment);
        $waitlist->slotFreed($appointment);

        return $appointment;
    }

    public function reschedule(Request $request, Appointment $appointment, BookingService $bookings, AppointmentNotifier $notifier, WaitlistService $waitlist)
    {
        abort_unless($appointment->client_id === $request->user()->id, 404);

        $data = $request->validate([
            'staff_member_id' => ['nullable', 'integer', 'exists:staff_members,id'],
            'starts_at' => ['required', 'date_format:Y-m-d H:i'],
        ]);

        if (! $this->canCancel($appointment)) {
            $label = BusinessSetting::current()->cancellationLabel();
            throw ValidationException::withMessages(['appointment' => ["Promena termina je moguća {$label} — pozovi salon."]]);
        }

        $previous = $appointment->starts_at->format('Y-m-d H:i');
        $previousStaff = $appointment->staff_member_id;
        $moved = $bookings->moveByClient($appointment, $data['staff_member_id'] ?? null, CarbonImmutable::createFromFormat('Y-m-d H:i', $data['starts_at']));

        if ($previous !== $moved->starts_at->format('Y-m-d H:i') || $moved->wasChanged('staff_member_id')) {
            $notifier->rescheduledByClient($moved, $previous);
            $waitlist->slotFreedAt(substr($previous, 0, 10), $previousStaff, $moved->client_id);
        }

        return [...$moved->toArray(), 'can_cancel' => $this->canCancel($moved), 'can_pay' => $this->canPay($moved)];
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
        return in_array($appointment->status, Appointment::BLOCKING_STATUSES, true)
            && now()->lt(BusinessSetting::current()->cancellationDeadline($appointment->starts_at));
    }
}

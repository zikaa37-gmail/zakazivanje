<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\AppointmentRecurrence;
use App\Models\StaffMember;
use App\Models\User;
use App\Services\AppointmentNotifier;
use App\Services\AvailabilityService;
use App\Services\BookingService;
use App\Services\RecurrenceService;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AppointmentController extends Controller
{
    public function __construct(
        private AvailabilityService $availability,
        private BookingService $bookings,
        private RecurrenceService $recurrences,
        private AppointmentNotifier $notifier,
    ) {}

    public function index(Request $request)
    {
        $data = $request->validate([
            'from' => ['required', 'date_format:Y-m-d'],
            'to' => ['required', 'date_format:Y-m-d', 'after_or_equal:from'],
            'staff_member_id' => ['nullable', 'integer'],
            'status' => ['nullable', Rule::in(Appointment::STATUSES)],
            'search' => ['nullable', 'string', 'max:100'],
        ]);

        $search = trim($data['search'] ?? '');

        return Appointment::query()
            ->whereBetween('starts_at', [CarbonImmutable::parse($data['from'])->startOfDay(), CarbonImmutable::parse($data['to'])->endOfDay()])
            ->when($data['staff_member_id'] ?? null, fn ($q, $id) => $q->where('staff_member_id', $id))
            ->when($data['status'] ?? null, fn ($q, $status) => $q->where('status', $status))
            ->when($search !== '', fn ($q) => $q->whereHas('client', fn ($c) => $c
                ->where('first_name', 'like', "%{$search}%")
                ->orWhere('last_name', 'like', "%{$search}%")
                ->orWhere('phone', 'like', "%{$search}%")))
            ->with(['items', 'staffMember:id,first_name,last_name,color', 'client:id,first_name,last_name,phone,email', 'recurrence:id,interval_weeks,active'])
            ->orderBy('starts_at')
            ->limit(500)
            ->get();
    }

    public function pendingCount()
    {
        return ['count' => Appointment::where('status', Appointment::STATUS_PENDING)->where('starts_at', '>=', now())->count()];
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'client_id' => ['required', 'integer', Rule::exists('users', 'id')->where('role', User::ROLE_CLIENT)],
            'service_ids' => ['required', 'array', 'min:1'],
            'service_ids.*' => ['integer', 'distinct', 'exists:services,id'],
            'staff_member_id' => ['required', 'integer', 'exists:staff_members,id'],
            'starts_at' => ['required', 'date_format:Y-m-d H:i'],
            'note' => ['nullable', 'string', 'max:500'],
            'admin_note' => ['nullable', 'string', 'max:1000'],
            'recurrence' => ['nullable', 'array'],
            'recurrence.interval_weeks' => ['required_with:recurrence', 'integer', Rule::in([1, 2, 3, 4])],
            'recurrence.ends_on' => ['nullable', 'date_format:Y-m-d'],
            'recurrence.count' => ['nullable', 'integer', 'min:2', 'max:104'],
        ], [
            'client_id.exists' => 'Izaberi klijenta.',
        ]);

        $client = User::findOrFail($data['client_id']);
        $start = CarbonImmutable::createFromFormat('Y-m-d H:i', $data['starts_at']);

        if (empty($data['recurrence'])) {
            $appointment = $this->bookings->book(
                $client,
                $this->availability->servicesInOrder($data['service_ids']),
                $data['staff_member_id'],
                $start,
                Appointment::SOURCE_ADMIN,
                $data['note'] ?? null,
                $data['admin_note'] ?? null,
            );

            $this->notifier->booked($appointment);

            return response()->json(['appointments' => [$appointment], 'skipped' => []], 201);
        }

        $interval = (int) $data['recurrence']['interval_weeks'];
        $endsOn = match (true) {
            ! empty($data['recurrence']['count']) => $start->addWeeks($interval * ($data['recurrence']['count'] - 1)),
            ! empty($data['recurrence']['ends_on']) => CarbonImmutable::parse($data['recurrence']['ends_on']),
            default => null,
        };

        if ($endsOn && $endsOn->lt($start->startOfDay())) {
            throw ValidationException::withMessages(['recurrence.ends_on' => ['Kraj ponavljanja ne može biti pre prvog termina.']]);
        }

        $result = $this->recurrences->create($client, $data['service_ids'], $data['staff_member_id'], $start, $interval, $endsOn, $data['note'] ?? null);

        if (empty($result['created'])) {
            throw ValidationException::withMessages(['starts_at' => ['Nijedan termin iz ponavljanja nije slobodan.']]);
        }

        $labels = [1 => 'svake nedelje', 2 => 'svake druge nedelje', 3 => 'svake treće nedelje', 4 => 'svake četvrte nedelje'];
        $this->notifier->booked($result['created'][0], $labels[$interval]);

        return response()->json(['appointments' => $result['created'], 'skipped' => $result['skipped']], 201);
    }

    public function updateStatus(Request $request, Appointment $appointment)
    {
        $data = $request->validate(['status' => ['required', Rule::in(Appointment::STATUSES)]]);

        if ($data['status'] === Appointment::STATUS_CANCELLED) {
            $this->bookings->cancel($appointment, 'admin');
            $this->notifier->cancelledBySalon($appointment);

            return $appointment;
        }

        $previous = $appointment->status;

        if (in_array($data['status'], Appointment::BLOCKING_STATUSES, true)
            && ! in_array($appointment->status, Appointment::BLOCKING_STATUSES, true)
            && ! $this->availability->isFree($appointment->staff_member_id, CarbonImmutable::parse($appointment->starts_at), CarbonImmutable::parse($appointment->ends_at), $appointment->id)) {
            throw ValidationException::withMessages(['status' => ['U tom terminu već postoji drugi termin.']]);
        }

        $appointment->update([
            'status' => $data['status'],
            'confirmed_at' => $data['status'] === Appointment::STATUS_CONFIRMED ? ($appointment->confirmed_at ?? now()) : $appointment->confirmed_at,
            'cancelled_at' => null,
            'cancelled_by' => null,
        ]);

        $this->notifier->statusChanged($appointment, $previous);

        return $appointment;
    }

    public function reschedule(Request $request, Appointment $appointment)
    {
        $data = $request->validate([
            'staff_member_id' => ['required', 'integer', 'exists:staff_members,id'],
            'starts_at' => ['required', 'date_format:Y-m-d H:i'],
            'notify' => ['sometimes', 'boolean'],
        ]);

        if (! in_array($appointment->status, Appointment::BLOCKING_STATUSES, true)) {
            throw ValidationException::withMessages(['appointment' => ['Pomera se samo termin koji je na čekanju ili potvrđen.']]);
        }

        $serviceIds = $appointment->items->pluck('service_id')->filter()->values()->all();
        $staff = $this->availability->eligibleStaff($this->availability->servicesInOrder($serviceIds), $data['staff_member_id'])->first();
        if (! $staff) {
            throw ValidationException::withMessages(['staff_member_id' => ['Taj zaposleni ne radi ove usluge.']]);
        }

        $start = CarbonImmutable::createFromFormat('Y-m-d H:i', $data['starts_at']);
        $end = $start->addMinutes($appointment->items->sum('duration_minutes'));

        $moved = DB::transaction(function () use ($appointment, $staff, $start, $end) {
            StaffMember::whereKey($staff->id)->lockForUpdate()->first();

            if (! $this->availability->isFree($staff->id, $start, $end, $appointment->id)) {
                throw ValidationException::withMessages(['starts_at' => ['U tom terminu je već zauzeto.']]);
            }

            $changed = $appointment->staff_member_id !== $staff->id || ! CarbonImmutable::parse($appointment->starts_at)->equalTo($start);
            $appointment->update([
                'staff_member_id' => $staff->id,
                'starts_at' => $start,
                'ends_at' => $end,
                'reminder_sent_at' => null,
            ]);

            return $changed;
        });

        if ($moved && ($data['notify'] ?? true)) {
            $this->notifier->rescheduled($appointment);
        }

        return $appointment->load(['items', 'staffMember:id,first_name,last_name,color', 'client:id,first_name,last_name,phone,email', 'recurrence:id,interval_weeks,active']);
    }

    public function cancel(Request $request, Appointment $appointment)
    {
        $data = $request->validate(['scope' => ['required', Rule::in(['this', 'series'])]]);

        if ($data['scope'] === 'series' && $appointment->recurrence) {
            $count = $this->recurrences->stop($appointment->recurrence, CarbonImmutable::parse($appointment->starts_at));

            return ['message' => "Otkazano termina: {$count}. Ponavljanje je zaustavljeno."];
        }

        $this->bookings->cancel($appointment, 'admin');
        $this->notifier->cancelledBySalon($appointment);

        return ['message' => 'Termin je otkazan.'];
    }

    public function recurrences()
    {
        return AppointmentRecurrence::query()
            ->where('active', true)
            ->with(['client:id,first_name,last_name,phone', 'staffMember:id,first_name,last_name,color'])
            ->orderBy('weekday')
            ->orderBy('start_time')
            ->get();
    }
}

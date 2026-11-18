<?php

namespace App\Services;

use App\Enums\UserRole;
use App\Models\Appointment;
use App\Models\BlockedTime;
use App\Models\StaffAbsence;
use App\Models\StaffMember;
use App\Models\User;
use App\Notifications\StaffAbsenceNotification;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Validation\ValidationException;

class StaffAbsenceService
{
    public function __construct(private AvailabilityService $availability) {}

    public function create(User $by, array $data): StaffAbsence
    {
        $this->ensureNoOverlap($data['staff_member_id'], $data['starts_on'], $data['ends_on']);

        $absence = StaffAbsence::create([...$data, 'status' => StaffAbsence::STATUS_PENDING, 'requested_by' => $by->id]);

        if ($by->isManager()) {
            return $this->approve($absence, $by);
        }

        $this->send($this->managers(), new StaffAbsenceNotification($absence, StaffAbsenceNotification::REQUESTED));

        return $absence;
    }

    public function update(StaffAbsence $absence, array $data): StaffAbsence
    {
        $this->ensureNoOverlap($absence->staff_member_id, $data['starts_on'], $data['ends_on'], $absence->id);

        DB::transaction(function () use ($absence, $data) {
            $absence->update($data);
            $absence->blockedTime?->update([
                'starts_at' => CarbonImmutable::parse($absence->starts_on)->startOfDay(),
                'ends_at' => CarbonImmutable::parse($absence->ends_on)->addDay()->startOfDay(),
                'reason' => $absence->typeLabel(),
            ]);
        });

        return $absence;
    }

    public function approve(StaffAbsence $absence, User $by): StaffAbsence
    {
        DB::transaction(function () use ($absence, $by) {
            $block = BlockedTime::create([
                'staff_member_id' => $absence->staff_member_id,
                'starts_at' => CarbonImmutable::parse($absence->starts_on)->startOfDay(),
                'ends_at' => CarbonImmutable::parse($absence->ends_on)->addDay()->startOfDay(),
                'reason' => $absence->typeLabel(),
            ]);
            $absence->update([
                'status' => StaffAbsence::STATUS_APPROVED,
                'decided_by' => $by->id,
                'decided_at' => now(),
                'blocked_time_id' => $block->id,
            ]);
        });

        $this->notifyStaff($absence, $by, StaffAbsenceNotification::APPROVED);

        return $absence;
    }

    public function reject(StaffAbsence $absence, User $by): StaffAbsence
    {
        DB::transaction(function () use ($absence, $by) {
            $block = $absence->blockedTime;
            $absence->update([
                'status' => StaffAbsence::STATUS_REJECTED,
                'decided_by' => $by->id,
                'decided_at' => now(),
                'blocked_time_id' => null,
            ]);
            $block?->delete();
        });

        $this->notifyStaff($absence, $by, StaffAbsenceNotification::REJECTED);

        return $absence;
    }

    public function remove(StaffAbsence $absence): void
    {
        DB::transaction(function () use ($absence) {
            $block = $absence->blockedTime;
            $absence->delete();
            $block?->delete();
        });
    }

    public function affectedAppointments(StaffAbsence $absence): Collection
    {
        return $this->appointmentsBetween(
            $absence->staff_member_id,
            CarbonImmutable::parse($absence->starts_on)->startOfDay(),
            CarbonImmutable::parse($absence->ends_on)->endOfDay(),
        );
    }

    public function appointmentsBetween(int $staffMemberId, CarbonImmutable $from, CarbonImmutable $to): Collection
    {
        return Appointment::query()
            ->blocking()
            ->where('staff_member_id', $staffMemberId)
            ->whereBetween('starts_at', [$from, $to])
            ->with(['items', 'client:id,first_name,last_name,nickname,phone,email'])
            ->orderBy('starts_at')
            ->get()
            ->map(fn (Appointment $a) => [
                ...$a->toArray(),
                'alternatives' => $this->alternatives($a)->map(fn (StaffMember $s) => $s->only(['id', 'first_name', 'last_name', 'color']))->values(),
            ])
            ->values();
    }

    public function alternatives(Appointment $appointment): Collection
    {
        $serviceIds = $appointment->items->pluck('service_id')->filter()->values()->all();
        $start = CarbonImmutable::parse($appointment->starts_at);
        $end = CarbonImmutable::parse($appointment->ends_at);

        return $this->availability->eligibleStaff($this->availability->servicesInOrder($serviceIds))
            ->reject(fn (StaffMember $s) => $s->id === $appointment->staff_member_id)
            ->filter(fn (StaffMember $s) => $this->availability->withinWorkingHours($s, $start, $end) && $this->availability->isFreeForSalon($s->id, $start, $end, null, $appointment->processing()));
    }

    private function ensureNoOverlap(int $staffMemberId, string $startsOn, string $endsOn, ?int $exceptId = null): void
    {
        $overlaps = StaffAbsence::query()
            ->where('staff_member_id', $staffMemberId)
            ->where('status', '!=', StaffAbsence::STATUS_REJECTED)
            ->when($exceptId, fn ($q) => $q->whereKeyNot($exceptId))
            ->where('starts_on', '<=', $endsOn)
            ->where('ends_on', '>=', $startsOn)
            ->exists();
        if ($overlaps) {
            throw ValidationException::withMessages(['starts_on' => ['Za taj period već postoji drugo odsustvo. Izmeni postojeće umesto da upisuješ novo.']]);
        }
    }

    private function notifyStaff(StaffAbsence $absence, User $by, string $type): void
    {
        $recipients = User::query()
            ->where('active', true)
            ->where(fn ($q) => $q->where('staff_member_id', $absence->staff_member_id)->orWhere('id', $absence->requested_by))
            ->whereKeyNot($by->id)
            ->get();

        $this->send($recipients, new StaffAbsenceNotification($absence, $type));
    }

    private function send(Collection $recipients, StaffAbsenceNotification $notification): void
    {
        app(Inbox::class)->deliver($recipients, $notification);
        Notification::send($recipients, $notification);
    }

    private function managers(): Collection
    {
        return User::query()->where('active', true)->whereIn('role', [UserRole::Owner, UserRole::Manager])->get();
    }
}

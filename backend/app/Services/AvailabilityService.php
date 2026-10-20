<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\BlockedTime;
use App\Models\BusinessSetting;
use App\Models\Service;
use App\Models\StaffMember;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;

class AvailabilityService
{
    public function eligibleStaff(Collection $services, ?int $staffMemberId = null): Collection
    {
        $serviceIds = $services->pluck('id')->unique();

        return StaffMember::query()
            ->where('active', true)
            ->when($staffMemberId, fn ($q) => $q->whereKey($staffMemberId))
            ->whereHas('services', fn ($q) => $q->whereIn('services.id', $serviceIds), '=', $serviceIds->count())
            ->with('workingHours')
            ->orderBy('sort_order')
            ->get();
    }

    public function duration(Collection $services): int
    {
        return (int) $services->sum('duration_minutes');
    }

    public function slots(Collection $services, ?int $staffMemberId, CarbonImmutable $date): array
    {
        $settings = BusinessSetting::current();
        $date = $date->startOfDay();

        if ($date->gt(CarbonImmutable::today()->addDays($settings->booking_horizon_days))) {
            return [];
        }

        $earliest = CarbonImmutable::now()->addMinutes($settings->booking_lead_minutes);
        $duration = $this->duration($services);
        $slots = [];

        foreach ($this->eligibleStaff($services, $staffMemberId) as $staff) {
            $busy = $this->busyIntervals($staff->id, $date, $date->endOfDay());

            foreach ($staff->workingHours->where('weekday', $date->isoWeekday()) as $hours) {
                $start = $date->setTimeFromTimeString($hours->starts_at);
                $end = $date->setTimeFromTimeString($hours->ends_at);

                for ($t = $start; $t->addMinutes($duration)->lte($end); $t = $t->addMinutes($settings->slot_interval_minutes)) {
                    $slotEnd = $t->addMinutes($duration);
                    if ($t->lt($earliest) || $this->overlapsAny($busy, $t, $slotEnd)) {
                        continue;
                    }
                    $slots[$t->format('H:i')][] = $staff->id;
                }
            }
        }

        ksort($slots);

        return collect($slots)->map(fn ($ids, $time) => ['time' => $time, 'staff_member_ids' => array_values(array_unique($ids))])->values()->all();
    }

    public function days(Collection $services, ?int $staffMemberId, CarbonImmutable $from, int $count): array
    {
        return collect(range(0, $count - 1))
            ->map(fn ($i) => $from->addDays($i))
            ->map(fn (CarbonImmutable $day) => [
                'date' => $day->toDateString(),
                'available' => count($this->slots($services, $staffMemberId, $day)) > 0,
            ])
            ->all();
    }

    public function withinWorkingHours(StaffMember $staff, CarbonImmutable $start, CarbonImmutable $end): bool
    {
        return $staff->workingHours
            ->where('weekday', $start->isoWeekday())
            ->contains(fn ($hours) => $start->gte($start->setTimeFromTimeString($hours->starts_at)) && $end->lte($start->setTimeFromTimeString($hours->ends_at)));
    }

    public function isFree(int $staffMemberId, CarbonImmutable $start, CarbonImmutable $end, ?int $ignoreAppointmentId = null): bool
    {
        return ! $this->overlapsAny($this->busyIntervals($staffMemberId, $start, $end, $ignoreAppointmentId), $start, $end);
    }

    private function busyIntervals(int $staffMemberId, CarbonImmutable $from, CarbonImmutable $to, ?int $ignoreAppointmentId = null): Collection
    {
        $appointments = Appointment::query()
            ->blocking()
            ->where('staff_member_id', $staffMemberId)
            ->overlapping($from, $to)
            ->when($ignoreAppointmentId, fn ($q) => $q->whereKeyNot($ignoreAppointmentId))
            ->get(['starts_at', 'ends_at']);

        $blocks = BlockedTime::query()->affecting($staffMemberId)
            ->where('starts_at', '<', $to)->where('ends_at', '>', $from)
            ->get(['starts_at', 'ends_at']);

        return $appointments->concat($blocks)->map(fn ($row) => [
            CarbonImmutable::parse($row->starts_at),
            CarbonImmutable::parse($row->ends_at),
        ]);
    }

    private function overlapsAny(Collection $busy, CarbonImmutable $start, CarbonImmutable $end): bool
    {
        return $busy->contains(fn ($interval) => $interval[0]->lt($end) && $interval[1]->gt($start));
    }

    public function servicesInOrder(array $ids): Collection
    {
        $services = Service::whereIn('id', $ids)->where('active', true)->get()->keyBy('id');

        return collect($ids)->map(fn ($id) => $services->get($id))->filter()->values();
    }
}

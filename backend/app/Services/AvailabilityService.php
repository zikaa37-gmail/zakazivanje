<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\BlockedTime;
use App\Models\BusinessSetting;
use App\Models\OpeningHour;
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

    public function slots(Collection $services, ?int $staffMemberId, CarbonImmutable $date, int|array|null $ignoreAppointmentId = null, array $linkedSegments = []): array
    {
        if ($services->isEmpty()) {
            return [];
        }

        $settings = BusinessSetting::current();
        $date = $date->startOfDay();

        if ($date->gt(CarbonImmutable::today()->addDays($settings->booking_horizon_days)) || $this->pausedOn($services, $date)) {
            return [];
        }

        $earliest = $settings->earliestOnlineStart();
        $duration = $this->duration($services);
        $openingHours = OpeningHour::week();
        $slots = [];

        foreach ($this->eligibleStaff($services, $staffMemberId) as $staff) {
            $busy = $this->busyIntervals($staff->id, $date, $date->endOfDay(), $ignoreAppointmentId);

            foreach ($staff->hoursOn($date, $openingHours) as $hours) {
                $start = $date->setTimeFromTimeString($hours['starts_at']);
                $end = $date->setTimeFromTimeString($hours['ends_at']);

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

        if ($linkedSegments !== []) {
            $planner = $this->chainPlanner($linkedSegments, $date, (array) $ignoreAppointmentId);
            $slots = array_filter($slots, fn ($ids, $time) => $planner($date->setTimeFromTimeString($time)->addMinutes($duration)) !== null, ARRAY_FILTER_USE_BOTH);
        }

        return collect($slots)->map(fn ($ids, $time) => ['time' => $time, 'staff_member_ids' => array_values(array_unique($ids))])->values()->all();
    }

    public function days(Collection $services, ?int $staffMemberId, CarbonImmutable $from, int $count, int|array|null $ignoreAppointmentId = null, array $linkedSegments = []): array
    {
        return collect(range(0, $count - 1))
            ->map(fn ($i) => $from->addDays($i))
            ->map(fn (CarbonImmutable $day) => [
                'date' => $day->toDateString(),
                'available' => count($this->slots($services, $staffMemberId, $day, $ignoreAppointmentId, $linkedSegments)) > 0,
                'open' => $this->isOpenDay($services, $staffMemberId, $day),
            ])
            ->all();
    }

    public function isOpenDay(Collection $services, ?int $staffMemberId, CarbonImmutable $date): bool
    {
        if ($services->isEmpty()) {
            return false;
        }

        $settings = BusinessSetting::current();
        if ($date->lt($settings->earliestOnlineStart()->startOfDay()) || $date->gt(CarbonImmutable::today()->addDays($settings->booking_horizon_days)) || $this->pausedOn($services, $date)) {
            return false;
        }
        $openingHours = OpeningHour::week();

        return $this->eligibleStaff($services, $staffMemberId)->contains(fn (StaffMember $staff) => $staff->hoursOn($date, $openingHours)->isNotEmpty());
    }

    public function withinWorkingHours(StaffMember $staff, CarbonImmutable $start, CarbonImmutable $end): bool
    {
        return $staff->hoursOn($start, OpeningHour::week())
            ->contains(fn ($hours) => $start->gte($start->setTimeFromTimeString($hours['starts_at'])) && $end->lte($start->setTimeFromTimeString($hours['ends_at'])));
    }

    public function isFree(int $staffMemberId, CarbonImmutable $start, CarbonImmutable $end, int|array|null $ignoreAppointmentId = null): bool
    {
        return ! $this->overlapsAny($this->busyIntervals($staffMemberId, $start, $end, $ignoreAppointmentId), $start, $end);
    }

    public function linkedSegments(Collection $linked): array
    {
        if ($linked->isEmpty()) {
            return [];
        }

        if ($this->eligibleStaff($linked)->isNotEmpty()) {
            return [$linked->values()];
        }

        return $linked->map(fn (Service $service) => collect([$service]))->values()->all();
    }

    public function chainPlanner(array $segments, CarbonImmutable $date, array $ignoreAppointmentIds = [], ?int $firstStaffId = null, array $preferredStaff = []): \Closure
    {
        $day = $date->startOfDay();
        $openingHours = OpeningHour::week();

        $plans = collect($segments)->values()->map(fn (Collection $services, int $i) => [
            'services' => $services,
            'duration' => $this->duration($services),
            'staff' => $this->eligibleStaff($services, $i === 0 ? $firstStaffId : null)
                ->map(fn (StaffMember $staff) => [
                    'model' => $staff,
                    'hours' => $staff->hoursOn($day, $openingHours),
                    'busy' => $this->busyIntervals($staff->id, $day, $day->endOfDay(), $ignoreAppointmentIds),
                ])
                ->sortBy(fn ($c) => ($preferredStaff[$i] ?? null) === $c['model']->id ? -1 : $c['busy']->count())
                ->values(),
        ]);

        return function (CarbonImmutable $start) use ($plans, $day): ?array {
            $chain = [];
            $at = $start;
            foreach ($plans as $plan) {
                $end = $at->addMinutes($plan['duration']);
                $pick = $plan['staff']->first(fn ($c) => ! $this->overlapsAny($c['busy'], $at, $end)
                    && $c['hours']->contains(fn ($h) => $at->gte($day->setTimeFromTimeString($h['starts_at'])) && $end->lte($day->setTimeFromTimeString($h['ends_at']))));
                if (! $pick) {
                    return null;
                }
                $chain[] = ['staff' => $pick['model'], 'services' => $plan['services'], 'starts_at' => $at, 'ends_at' => $end];
                $at = $end;
            }

            return $chain;
        };
    }

    private function busyIntervals(int $staffMemberId, CarbonImmutable $from, CarbonImmutable $to, int|array|null $ignoreAppointmentId = null): Collection
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

    public function pausedOn(Collection $services, CarbonImmutable $date): ?Service
    {
        return $services->first(fn (Service $service) => $service->isPausedOn($date));
    }

    public function servicesInOrder(array $ids, bool $online = false): Collection
    {
        $services = Service::whereIn('id', $ids)
            ->when($online, fn ($q) => $q->offeredOnline(), fn ($q) => $q->where('active', true))
            ->get()
            ->keyBy('id');

        return collect($ids)->map(fn ($id) => $services->get($id))->filter()->values();
    }
}

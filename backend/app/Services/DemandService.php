<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\BusinessSetting;
use App\Models\OpeningHour;
use App\Models\StaffMember;
use Carbon\CarbonImmutable;
use Carbon\CarbonPeriod;
use Illuminate\Support\Facades\Cache;

class DemandService
{
    private const HISTORY_DAYS = 90;

    private const COUNTED = [Appointment::STATUS_PENDING, Appointment::STATUS_CONFIRMED, Appointment::STATUS_COMPLETED, Appointment::STATUS_NO_SHOW];

    public function buckets(): array
    {
        $percent = BusinessSetting::current()->discipline_off_peak_percent;

        return Cache::remember("demand:buckets:".today()->toDateString().":{$percent}", now()->endOfDay(), fn () => $this->compute($percent));
    }

    public function isOffPeak(CarbonImmutable $start): bool
    {
        $buckets = $this->buckets();
        $key = $start->isoWeekday().'-'.$start->hour;

        return ! $this->hasHistory($buckets) || ($buckets[$key]['off_peak'] ?? true);
    }

    public function hasHistory(array $buckets): bool
    {
        return collect($buckets)->sum('booked') > 0;
    }

    public function forget(): void
    {
        Cache::forget('demand:buckets:'.today()->toDateString().':'.BusinessSetting::current()->discipline_off_peak_percent);
    }

    private function compute(int $percent): array
    {
        $to = CarbonImmutable::yesterday();
        $from = $to->subDays(self::HISTORY_DAYS - 1);
        $openingHours = OpeningHour::week();
        $buckets = [];

        $add = function (string $field, CarbonImmutable $start, CarbonImmutable $end) use (&$buckets) {
            for ($t = $start; $t->lt($end); $t = $t->startOfHour()->addHour()) {
                $slice = min($end->getTimestamp(), $t->startOfHour()->addHour()->getTimestamp()) - $t->getTimestamp();
                $key = $t->isoWeekday().'-'.$t->hour;
                $buckets[$key] ??= ['weekday' => $t->isoWeekday(), 'hour' => $t->hour, 'available' => 0, 'booked' => 0];
                $buckets[$key][$field] += $slice / 60;
            }
        };

        $staff = StaffMember::with('workingHours')->get();
        foreach (CarbonPeriod::create($from, $to) as $day) {
            $day = CarbonImmutable::parse($day);
            foreach ($staff as $member) {
                foreach ($member->hoursOn($day, $openingHours) as $hours) {
                    $add('available', $day->setTimeFromTimeString($hours['starts_at']), $day->setTimeFromTimeString($hours['ends_at']));
                }
            }
        }

        Appointment::query()
            ->whereIn('status', self::COUNTED)
            ->whereBetween('starts_at', [$from->startOfDay(), $to->endOfDay()])
            ->get(['starts_at', 'ends_at'])
            ->each(fn (Appointment $a) => $add('booked', CarbonImmutable::parse($a->starts_at), CarbonImmutable::parse($a->ends_at)));

        $rows = collect($buckets)
            ->filter(fn ($b) => $b['available'] > 0)
            ->map(fn ($b) => [...$b, 'rate' => round(min(1, $b['booked'] / $b['available']), 3)]);

        $sorted = $rows->sortBy('rate')->values();
        $take = max(1, (int) ceil($sorted->count() * $percent / 100));
        $threshold = $sorted[$take - 1]['rate'] ?? 0;

        return $rows
            ->map(fn ($b) => [...$b, 'available' => (int) round($b['available']), 'booked' => (int) round($b['booked']), 'off_peak' => $b['rate'] <= $threshold])
            ->sortBy(fn ($b) => $b['weekday'] * 100 + $b['hour'])
            ->all();
    }
}

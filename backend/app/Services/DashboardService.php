<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\AppointmentItem;
use App\Models\BlockedTime;
use App\Models\OpeningHour;
use App\Models\StaffMember;
use App\Models\User;
use Carbon\CarbonImmutable;
use Carbon\CarbonPeriod;

class DashboardService
{
    private const COUNTED = [Appointment::STATUS_PENDING, Appointment::STATUS_CONFIRMED, Appointment::STATUS_COMPLETED, Appointment::STATUS_NO_SHOW];

    public function today(CarbonImmutable $date): array
    {
        $appointments = Appointment::query()
            ->whereDate('starts_at', $date->toDateString())
            ->where('status', '!=', Appointment::STATUS_CANCELLED)
            ->with(['items', 'staffMember:id,first_name,last_name,color', 'client:id,first_name,last_name,phone'])
            ->orderBy('starts_at')
            ->get();

        $next = $appointments->first(fn (Appointment $a) => in_array($a->status, Appointment::BLOCKING_STATUSES, true) && $a->ends_at->isFuture());

        $pending = Appointment::query()
            ->where('status', Appointment::STATUS_PENDING)
            ->where('starts_at', '>=', now())
            ->with(['items', 'staffMember:id,first_name,last_name,color', 'client:id,first_name,last_name,phone'])
            ->orderBy('starts_at')
            ->limit(10)
            ->get();

        $openingHours = OpeningHour::week();
        $staff = StaffMember::query()
            ->where('active', true)
            ->with('workingHours')
            ->orderBy('sort_order')
            ->get()
            ->map(function (StaffMember $s) use ($date, $appointments, $openingHours) {
                $hours = $s->hoursOn($date, $openingHours);

                return [
                    'id' => $s->id,
                    'name' => trim($s->first_name.' '.$s->last_name),
                    'color' => $s->color,
                    'hours' => $hours->map(fn ($h) => $h['starts_at'].' – '.$h['ends_at'])->join(', '),
                    'appointments' => $appointments->where('staff_member_id', $s->id)->count(),
                ];
            })
            ->filter(fn ($s) => $s['hours'] !== '' || $s['appointments'] > 0)
            ->values();

        return [
            'date' => $date->toDateString(),
            'appointments' => $appointments,
            'next' => $next,
            'pending' => $pending,
            'staff' => $staff,
            'expected_revenue' => round($appointments->whereIn('status', [Appointment::STATUS_PENDING, Appointment::STATUS_CONFIRMED, Appointment::STATUS_COMPLETED])->sum('total'), 2),
        ];
    }

    public function stats(CarbonImmutable $from, CarbonImmutable $to): array
    {
        $current = $this->summary($from, $to);
        $days = $from->diffInDays($to) + 1;
        $previous = $this->summary($from->subDays($days), $from->subDay());

        $appointments = Appointment::query()
            ->whereBetween('starts_at', [$from->startOfDay(), $to->endOfDay()])
            ->get(['id', 'starts_at', 'status', 'total', 'staff_member_id', 'ends_at']);

        $series = collect(CarbonPeriod::create($from, $to))->map(function ($day) use ($appointments) {
            $date = $day->format('Y-m-d');
            $ofDay = $appointments->filter(fn ($a) => $a->starts_at->format('Y-m-d') === $date);

            return [
                'date' => $date,
                'appointments' => $ofDay->whereIn('status', self::COUNTED)->count(),
                'revenue' => round($ofDay->where('status', Appointment::STATUS_COMPLETED)->sum('total'), 2),
            ];
        })->values();

        $counted = $appointments->whereIn('status', self::COUNTED)->pluck('id');
        $topServices = AppointmentItem::query()
            ->whereIn('appointment_id', $counted)
            ->selectRaw('name, count(*) as count, sum(price - discount) as revenue')
            ->groupBy('name')
            ->orderByDesc('count')
            ->limit(6)
            ->get()
            ->map(fn ($row) => ['name' => $row->name, 'count' => (int) $row->count, 'revenue' => round((float) $row->revenue, 2)]);

        return [
            'from' => $from->toDateString(),
            'to' => $to->toDateString(),
            'summary' => $current,
            'previous' => $previous,
            'series' => $series,
            'top_services' => $topServices,
            'staff_utilization' => $this->utilization($from, $to, $appointments),
        ];
    }

    private function summary(CarbonImmutable $from, CarbonImmutable $to): array
    {
        $rows = Appointment::query()
            ->whereBetween('starts_at', [$from->startOfDay(), $to->endOfDay()])
            ->get(['status', 'total']);

        $counted = $rows->whereIn('status', self::COUNTED);
        $completed = $rows->where('status', Appointment::STATUS_COMPLETED);
        $noShows = $rows->where('status', Appointment::STATUS_NO_SHOW)->count();
        $finished = $completed->count() + $noShows;

        return [
            'appointments' => $counted->count(),
            'completed' => $completed->count(),
            'cancelled' => $rows->where('status', Appointment::STATUS_CANCELLED)->count(),
            'no_shows' => $noShows,
            'no_show_rate' => $finished > 0 ? round($noShows / $finished * 100, 1) : 0,
            'revenue' => round($completed->sum('total'), 2),
            'average_ticket' => $completed->count() > 0 ? round($completed->avg('total'), 2) : 0,
            'new_clients' => User::where('role', User::ROLE_CLIENT)->whereBetween('created_at', [$from->startOfDay(), $to->endOfDay()])->count(),
        ];
    }

    private function utilization(CarbonImmutable $from, CarbonImmutable $to, $appointments): array
    {
        $blocks = BlockedTime::query()->where('starts_at', '<', $to->endOfDay())->where('ends_at', '>', $from->startOfDay())->get();
        $openingHours = OpeningHour::week();

        return StaffMember::query()
            ->where('active', true)
            ->with('workingHours')
            ->orderBy('sort_order')
            ->get()
            ->map(function (StaffMember $staff) use ($from, $to, $appointments, $blocks, $openingHours) {
                $available = 0;
                foreach (CarbonPeriod::create($from, $to) as $day) {
                    foreach ($staff->hoursOn(CarbonImmutable::parse($day), $openingHours) as $hours) {
                        $start = CarbonImmutable::parse($day->format('Y-m-d').' '.$hours['starts_at']);
                        $end = CarbonImmutable::parse($day->format('Y-m-d').' '.$hours['ends_at']);
                        $blocked = $blocks
                            ->filter(fn ($b) => $b->staff_member_id === null || $b->staff_member_id === $staff->id)
                            ->sum(fn ($b) => max(0, min($end->getTimestamp(), $b->ends_at->getTimestamp()) - max($start->getTimestamp(), $b->starts_at->getTimestamp())) / 60);
                        $available += max(0, $start->diffInMinutes($end) - $blocked);
                    }
                }

                $booked = $appointments
                    ->where('staff_member_id', $staff->id)
                    ->whereIn('status', self::COUNTED)
                    ->sum(fn ($a) => $a->starts_at->diffInMinutes($a->ends_at));

                return [
                    'id' => $staff->id,
                    'name' => trim($staff->first_name.' '.$staff->last_name),
                    'color' => $staff->color,
                    'booked_minutes' => (int) $booked,
                    'available_minutes' => (int) round($available),
                    'rate' => $available > 0 ? round(min(100, $booked / $available * 100), 1) : 0,
                ];
            })
            ->values()
            ->all();
    }
}

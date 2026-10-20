<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\AppointmentRecurrence;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class RecurrenceService
{
    public const WEEKS_AHEAD = 8;

    public function __construct(
        private BookingService $bookings,
        private AvailabilityService $availability,
    ) {}

    public function create(User $client, array $serviceIds, int $staffMemberId, CarbonImmutable $firstStart, int $intervalWeeks, ?CarbonImmutable $endsOn, ?string $note): array
    {
        return DB::transaction(function () use ($client, $serviceIds, $staffMemberId, $firstStart, $intervalWeeks, $endsOn, $note) {
            $recurrence = AppointmentRecurrence::create([
                'client_id' => $client->id,
                'staff_member_id' => $staffMemberId,
                'service_ids' => $serviceIds,
                'weekday' => $firstStart->isoWeekday(),
                'start_time' => $firstStart->format('H:i'),
                'interval_weeks' => $intervalWeeks,
                'starts_on' => $firstStart->toDateString(),
                'ends_on' => $endsOn?->toDateString(),
                'note' => $note,
            ]);

            return $this->generate($recurrence);
        });
    }

    public function generate(AppointmentRecurrence $recurrence, ?CarbonImmutable $until = null): array
    {
        $until ??= CarbonImmutable::today()->addWeeks(self::WEEKS_AHEAD);
        if ($recurrence->ends_on && $until->gt($recurrence->ends_on)) {
            $until = CarbonImmutable::parse($recurrence->ends_on);
        }

        $services = $this->availability->servicesInOrder($recurrence->service_ids);
        if ($services->isEmpty()) {
            throw ValidationException::withMessages(['service_ids' => ['Usluge iz ponavljanja više ne postoje.']]);
        }

        $step = $recurrence->interval_weeks;
        $date = $recurrence->generated_until
            ? CarbonImmutable::parse($recurrence->generated_until)->addWeeks($step)
            : CarbonImmutable::parse($recurrence->starts_on);

        $created = [];
        $skipped = $recurrence->skipped_dates ?? [];

        for (; $date->lte($until); $date = $date->addWeeks($step)) {
            $start = $date->setTimeFromTimeString($recurrence->start_time);
            if ($start->isPast()) {
                continue;
            }

            try {
                $created[] = $this->bookings->book(
                    $recurrence->client,
                    $services,
                    $recurrence->staff_member_id,
                    $start,
                    Appointment::SOURCE_RECURRING,
                    $recurrence->note,
                    null,
                    $recurrence->id,
                );
            } catch (ValidationException) {
                $skipped[] = $start->format('Y-m-d H:i');
            }

            $recurrence->generated_until = $date->toDateString();
        }

        $recurrence->skipped_dates = array_values(array_unique($skipped));
        $recurrence->save();

        return ['recurrence' => $recurrence, 'created' => $created, 'skipped' => $recurrence->skipped_dates];
    }

    public function stop(AppointmentRecurrence $recurrence, ?CarbonImmutable $from = null): int
    {
        $from ??= CarbonImmutable::now();

        return DB::transaction(function () use ($recurrence, $from) {
            $recurrence->update(['active' => false]);

            return $recurrence->appointments()
                ->blocking()
                ->where('starts_at', '>=', $from)
                ->update(['status' => Appointment::STATUS_CANCELLED, 'cancelled_at' => now(), 'cancelled_by' => 'admin']);
        });
    }
}

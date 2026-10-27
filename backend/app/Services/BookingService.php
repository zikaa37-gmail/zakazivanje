<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\AppointmentItem;
use App\Models\BusinessSetting;
use App\Models\Service;
use App\Models\StaffMember;
use App\Models\User;
use App\Models\WaitlistEntry;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class BookingService
{
    public function __construct(
        private AvailabilityService $availability,
        private PriceQuoteService $quotes,
        private ClientDisciplineService $discipline,
    ) {}

    public function book(
        User $client,
        Collection $services,
        ?int $staffMemberId,
        CarbonImmutable $start,
        string $source = Appointment::SOURCE_ONLINE,
        ?string $note = null,
        ?string $adminNote = null,
        ?int $recurrenceId = null,
    ): Appointment {
        if ($services->isEmpty()) {
            throw ValidationException::withMessages(['service_ids' => ['Izaberi bar jednu uslugu.']]);
        }
        $this->ensureAudience($client, $services);

        return DB::transaction(function () use ($client, $services, $staffMemberId, $start, $source, $note, $adminNote, $recurrenceId) {
            $online = $source === Appointment::SOURCE_ONLINE;
            $end = $start->addMinutes($this->availability->duration($services));

            $candidates = $this->availability->eligibleStaff($services, $staffMemberId);
            if ($candidates->isEmpty()) {
                throw ValidationException::withMessages(['staff_member_id' => ['Izabrani zaposleni ne radi ove usluge.']]);
            }

            StaffMember::whereKey($candidates->pluck('id'))->lockForUpdate()->get();

            if ($online) {
                $this->ensureBookingRules($start);
            }

            $staff = $candidates
                ->filter(fn (StaffMember $s) => (! $online || $this->availability->withinWorkingHours($s, $start, $end))
                    && $this->availability->isFree($s->id, $start, $end))
                ->sortBy(fn (StaffMember $s) => Appointment::blocking()->where('staff_member_id', $s->id)->whereDate('starts_at', $start->toDateString())->count())
                ->first();

            if (! $staff) {
                throw ValidationException::withMessages(['starts_at' => ['Termin je u međuvremenu zauzet. Izaberi drugo vreme.']]);
            }

            $quote = $this->quoteFor($client, $services, $start);
            $automatic = $source !== Appointment::SOURCE_ONLINE
                || ($staff->confirmationMode() === BusinessSetting::CONFIRMATION_AUTOMATIC && ! $this->discipline->restrictions($client)['force_pending']);

            $appointment = Appointment::create([
                'client_id' => $client->id,
                'staff_member_id' => $staff->id,
                'recurrence_id' => $recurrenceId,
                'starts_at' => $start,
                'ends_at' => $end,
                'status' => $automatic ? Appointment::STATUS_CONFIRMED : Appointment::STATUS_PENDING,
                'confirmed_at' => $automatic ? now() : null,
                'source' => $source,
                'price' => $quote['subtotal'],
                'discount' => $quote['discount'],
                'total' => $quote['total'],
                'note' => $note,
                'admin_note' => $adminNote,
            ]);

            $appointment->items()->saveMany($this->items($services, $quote));
            WaitlistEntry::query()->active()->where('client_id', $client->id)->whereDate('date', $start->toDateString())->update(['fulfilled_at' => now()]);

            return $appointment->load(['items', 'staffMember:id,first_name,last_name,title,color', 'client:id,first_name,last_name,phone,email']);
        });
    }

    public function moveByClient(Appointment $appointment, ?int $staffMemberId, CarbonImmutable $start): Appointment
    {
        return DB::transaction(function () use ($appointment, $staffMemberId, $start) {
            $services = $this->availability->servicesInOrder($appointment->items->pluck('service_id')->filter()->values()->all());
            if ($services->isEmpty()) {
                throw ValidationException::withMessages(['starts_at' => ['Usluge iz ovog termina više ne postoje — pozovi salon.']]);
            }

            $this->ensureBookingRules($start);
            $end = $start->addMinutes($this->availability->duration($services));

            $candidates = $this->availability->eligibleStaff($services, $staffMemberId);
            StaffMember::whereKey($candidates->pluck('id'))->lockForUpdate()->get();

            $staff = $candidates
                ->filter(fn (StaffMember $s) => $this->availability->withinWorkingHours($s, $start, $end)
                    && $this->availability->isFree($s->id, $start, $end, $appointment->id))
                ->sortBy(fn (StaffMember $s) => $s->id === $appointment->staff_member_id ? -1 : Appointment::blocking()->where('staff_member_id', $s->id)->whereDate('starts_at', $start->toDateString())->count())
                ->first();

            if (! $staff) {
                throw ValidationException::withMessages(['starts_at' => ['Termin je u međuvremenu zauzet. Izaberi drugo vreme.']]);
            }

            $automatic = $staff->confirmationMode() === BusinessSetting::CONFIRMATION_AUTOMATIC
                && ! $this->discipline->restrictions($appointment->client)['force_pending'];

            $appointment->update([
                'staff_member_id' => $staff->id,
                'starts_at' => $start,
                'ends_at' => $end,
                'status' => $automatic ? Appointment::STATUS_CONFIRMED : Appointment::STATUS_PENDING,
                'confirmed_at' => $automatic ? now() : null,
                'reminder_sent_at' => null,
            ]);

            return $appointment->load(['items', 'staffMember:id,first_name,last_name,title,color']);
        });
    }

    public function ensureAudience(User $client, Collection $services): void
    {
        $audiences = $services->pluck('audience')->reject(fn ($a) => $a === Service::AUDIENCE_ALL)->unique();
        if ($audiences->count() > 1) {
            throw ValidationException::withMessages(['service_ids' => ['Muške i ženske usluge ne mogu u isti termin.']]);
        }
        $mismatch = $services->first(fn (Service $s) => ! $s->suits($client->gender));
        if ($mismatch) {
            $for = $mismatch->audience === User::GENDER_FEMALE ? 'žene' : 'muškarce';
            throw ValidationException::withMessages(['service_ids' => ["Usluga „{$mismatch->name}\" je samo za {$for}."]]);
        }
        if ($client->gender === null && $audiences->isNotEmpty()) {
            $client->update(['gender' => $audiences->first()]);
        }
    }

    public function quoteFor(User $client, Collection $services, CarbonImmutable $date): array
    {
        $completed = Appointment::where('client_id', $client->id)->where('status', Appointment::STATUS_COMPLETED);

        $byService = AppointmentItem::query()
            ->whereIn('appointment_id', (clone $completed)->select('id'))
            ->whereNotNull('service_id')
            ->groupBy('service_id')
            ->selectRaw('service_id, count(*) as aggregate')
            ->pluck('aggregate', 'service_id')
            ->map(fn ($n) => (int) $n)
            ->all();

        return $this->quotes->quote($services, $date, $byService, $completed->count());
    }

    public function cancel(Appointment $appointment, string $by): Appointment
    {
        $appointment->update([
            'status' => Appointment::STATUS_CANCELLED,
            'cancelled_at' => now(),
            'cancelled_by' => $by,
        ]);

        return $appointment;
    }

    private function ensureBookingRules(CarbonImmutable $start): void
    {
        $settings = BusinessSetting::current();

        if ($start->lt($settings->earliestOnlineStart())) {
            throw ValidationException::withMessages(['starts_at' => [$settings->booking_min_days_ahead > 0
                ? ($settings->booking_min_days_ahead === 1 ? 'Online se zakazuje najranije za sutra.' : "Online se zakazuje najranije {$settings->booking_min_days_ahead} dana unapred.")
                : 'Termin je previše blizu — izaberi kasnije vreme.']]);
        }

        if ($start->gt(CarbonImmutable::today()->addDays($settings->booking_horizon_days)->endOfDay())) {
            throw ValidationException::withMessages(['starts_at' => ["Zakazivanje je moguće najviše {$settings->booking_horizon_days} dana unapred."]]);
        }
    }

    private function items(Collection $services, array $quote): array
    {
        $byService = [];

        foreach ($quote['packages'] as $package) {
            $inPackage = $services->whereIn('id', $package['service_ids']);
            $sum = max($inPackage->sum('price'), 0.01);
            foreach ($inPackage as $service) {
                $byService[$service->id] = [
                    'discount' => round($package['discount'] * $service->price / $sum, 2),
                    'promotion_id' => $package['promotion_id'],
                    'promotion_name' => $package['name'],
                ];
            }
        }

        foreach ($quote['lines'] as $line) {
            $byService[$line['service_id']] = [
                'discount' => $line['discount'],
                'promotion_id' => $line['promotion_id'],
                'promotion_name' => $line['promotion_name'],
            ];
        }

        return $services->map(fn ($service) => new AppointmentItem([
            'service_id' => $service->id,
            'name' => $service->name,
            'duration_minutes' => $service->duration_minutes,
            'price' => $service->price,
            ...($byService[$service->id] ?? ['discount' => 0, 'promotion_id' => null, 'promotion_name' => null]),
        ]))->all();
    }
}

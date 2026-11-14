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
use Illuminate\Support\Str;
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
        ?string $promoCode = null,
        ?Collection $linked = null,
    ): Appointment {
        if ($services->isEmpty()) {
            throw ValidationException::withMessages(['service_ids' => ['Izaberi bar jednu uslugu.']]);
        }
        $linked = ($linked ?? collect())->reject(fn (Service $s) => $services->contains('id', $s->id))->values();
        $this->ensureAudience($client, $services->concat($linked));

        return DB::transaction(function () use ($client, $services, $staffMemberId, $start, $source, $note, $adminNote, $recurrenceId, $promoCode, $linked) {
            $online = $source === Appointment::SOURCE_ONLINE;
            $end = $start->addMinutes($this->availability->duration($services));

            $candidates = $this->availability->eligibleStaff($services, $staffMemberId);
            if ($candidates->isEmpty()) {
                throw ValidationException::withMessages(['staff_member_id' => ['Izabrani zaposleni ne radi ove usluge.']]);
            }

            StaffMember::whereKey($candidates->pluck('id'))->lockForUpdate()->get();

            if ($online) {
                $this->ensureBookingRules($start);
                $this->ensureNotPaused($services, $start);
            }

            $staff = $candidates
                ->filter(fn (StaffMember $s) => (! $online || $this->availability->withinWorkingHours($s, $start, $end))
                    && $this->availability->isFree($s->id, $start, $end))
                ->sortBy(fn (StaffMember $s) => Appointment::blocking()->where('staff_member_id', $s->id)->whereDate('starts_at', $start->toDateString())->count())
                ->first();

            if (! $staff) {
                throw ValidationException::withMessages(['starts_at' => ['Termin je u međuvremenu zauzet. Izaberi drugo vreme.']]);
            }

            $chain = $linked->isEmpty() ? [] : $this->planLinked($linked, $end, $online);

            $quote = $this->quoteFor($client, $services->concat($linked), $start, $promoCode);
            if ($promoCode && $quote['code_error']) {
                throw ValidationException::withMessages(['promo_code' => [$quote['code_error']]]);
            }
            $automatic = $source !== Appointment::SOURCE_ONLINE || $this->confirmsAutomatically($staff, $services, $client);
            $items = $this->items($services->concat($linked), $quote);
            $group = $chain === [] ? null : (string) Str::uuid();

            $appointment = Appointment::create([
                'client_id' => $client->id,
                'staff_member_id' => $staff->id,
                'recurrence_id' => $recurrenceId,
                'starts_at' => $start,
                'ends_at' => $end,
                'status' => $automatic ? Appointment::STATUS_CONFIRMED : Appointment::STATUS_PENDING,
                'confirmed_at' => $automatic ? now() : null,
                'source' => $source,
                ...($group ? $this->totals($items, $services) : ['price' => $quote['subtotal'], 'discount' => $quote['discount'], 'total' => $quote['total']]),
                'note' => $note,
                'admin_note' => $adminNote,
                'link_group' => $group,
            ]);

            $appointment->items()->saveMany($this->itemsFor($items, $services));

            foreach ($chain as $part) {
                $linkedAutomatic = $source !== Appointment::SOURCE_ONLINE || $this->confirmsAutomatically($part['staff'], $part['services'], $client);
                $linkedAppointment = Appointment::create([
                    'client_id' => $client->id,
                    'staff_member_id' => $part['staff']->id,
                    'starts_at' => $part['starts_at'],
                    'ends_at' => $part['ends_at'],
                    'status' => $linkedAutomatic ? Appointment::STATUS_CONFIRMED : Appointment::STATUS_PENDING,
                    'confirmed_at' => $linkedAutomatic ? now() : null,
                    'source' => $source,
                    ...$this->totals($items, $part['services']),
                    'note' => $note,
                    'link_group' => $group,
                ]);
                $linkedAppointment->items()->saveMany($this->itemsFor($items, $part['services']));
            }
            WaitlistEntry::query()->active()->where('client_id', $client->id)->whereDate('date', $start->toDateString())->update(['fulfilled_at' => now()]);

            return $appointment->load(['items', 'staffMember:id,first_name,last_name,title,color', 'client:id,first_name,last_name,phone,email']);
        });
    }

    public function moveByClient(Appointment $appointment, ?int $staffMemberId, CarbonImmutable $start): Appointment
    {
        $siblings = $appointment->linkedSiblings();
        if ($siblings->isNotEmpty()) {
            return $this->moveChainByClient($appointment, $siblings, $staffMemberId, $start);
        }

        return DB::transaction(function () use ($appointment, $staffMemberId, $start) {
            $services = $this->availability->servicesInOrder($appointment->items->pluck('service_id')->filter()->values()->all());
            if ($services->isEmpty()) {
                throw ValidationException::withMessages(['starts_at' => ['Usluge iz ovog termina više ne postoje — pozovi salon.']]);
            }

            $this->ensureBookingRules($start);
            $this->ensureNotPaused($services, $start);
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

            $automatic = $this->confirmsAutomatically($staff, $services, $appointment->client);

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

    public function moveChainByClient(Appointment $appointment, Collection $siblings, ?int $staffMemberId, CarbonImmutable $start): Appointment
    {
        $group = $siblings->push($appointment)->sortBy('starts_at')->values();

        return DB::transaction(function () use ($group, $appointment, $staffMemberId, $start) {
            $segments = $group->map(fn (Appointment $a) => $this->availability->servicesInOrder($a->items->pluck('service_id')->filter()->values()->all()))->all();
            if (collect($segments)->contains(fn (Collection $services) => $services->isEmpty())) {
                throw ValidationException::withMessages(['starts_at' => ['Usluge iz ovog termina više ne postoje — pozovi salon.']]);
            }

            $this->ensureBookingRules($start);
            $this->ensureNotPaused(collect($segments)->flatten(1), $start);
            $this->lockStaffFor($segments);

            $chain = $this->availability->chainPlanner($segments, $start, $group->pluck('id')->all(), $staffMemberId, $group->pluck('staff_member_id')->all())($start);
            if (! $chain) {
                throw ValidationException::withMessages(['starts_at' => ['Termin je u međuvremenu zauzet. Izaberi drugo vreme.']]);
            }

            foreach ($group as $i => $member) {
                $part = $chain[$i];
                $automatic = $this->confirmsAutomatically($part['staff'], $part['services'], $member->client);
                $member->update([
                    'staff_member_id' => $part['staff']->id,
                    'starts_at' => $part['starts_at'],
                    'ends_at' => $part['ends_at'],
                    'status' => $automatic ? Appointment::STATUS_CONFIRMED : Appointment::STATUS_PENDING,
                    'confirmed_at' => $automatic ? now() : null,
                    'reminder_sent_at' => null,
                ]);
            }

            return $appointment->refresh()->load(['items', 'staffMember:id,first_name,last_name,title,color']);
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

    public function quoteFor(User $client, Collection $services, CarbonImmutable $date, ?string $promoCode = null): array
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

        return $this->quotes->quote($services, $date, $byService, $completed->count(), $promoCode, $client->id);
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

    private function ensureNotPaused(Collection $services, CarbonImmutable $start): void
    {
        if ($paused = $this->availability->pausedOn($services, $start)) {
            throw ValidationException::withMessages(['service_ids' => ["Usluga „{$paused->name}“ nije dostupna do {$paused->paused_until->format('d.m.Y.')}"]]);
        }
    }

    private function confirmsAutomatically(StaffMember $staff, Collection $services, User $client): bool
    {
        if ($this->discipline->restrictions($client)['force_pending']) {
            return false;
        }

        $modes = $services->pluck('booking_confirmation');
        if ($modes->contains(BusinessSetting::CONFIRMATION_MANUAL)) {
            return false;
        }
        if ($modes->isNotEmpty() && $modes->every(fn ($mode) => $mode === BusinessSetting::CONFIRMATION_AUTOMATIC)) {
            return true;
        }

        return $staff->confirmationMode() === BusinessSetting::CONFIRMATION_AUTOMATIC;
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

    private function planLinked(Collection $linked, CarbonImmutable $from, bool $online): array
    {
        if ($online) {
            $this->ensureNotPaused($linked, $from);
        }
        $segments = $this->availability->linkedSegments($linked);
        if (collect($segments)->contains(fn (Collection $services) => $this->availability->eligibleStaff($services)->isEmpty())) {
            throw ValidationException::withMessages(['linked_service_ids' => ['Povezanu uslugu trenutno ne radi niko od zaposlenih.']]);
        }
        $this->lockStaffFor($segments);

        $chain = $this->availability->chainPlanner($segments, $from)($from);
        if (! $chain) {
            throw ValidationException::withMessages(['starts_at' => ['Povezana usluga nije slobodna odmah posle ovog termina. Izaberi drugo vreme.']]);
        }

        return $chain;
    }

    private function lockStaffFor(array $segments): void
    {
        $ids = collect($segments)->flatMap(fn (Collection $services) => $this->availability->eligibleStaff($services)->pluck('id'))->unique()->values();
        StaffMember::whereKey($ids)->lockForUpdate()->get();
    }

    private function totals(array $items, Collection $services): array
    {
        $own = collect($this->itemsFor($items, $services));
        $price = round($own->sum('price'), 2);
        $discount = round($own->sum('discount'), 2);

        return ['price' => $price, 'discount' => $discount, 'total' => round(max(0, $price - $discount), 2)];
    }

    private function itemsFor(array $items, Collection $services): array
    {
        $ids = $services->pluck('id')->all();

        return array_values(array_filter($items, fn (AppointmentItem $item) => in_array($item->service_id, $ids, true)));
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

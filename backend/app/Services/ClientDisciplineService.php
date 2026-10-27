<?php

namespace App\Services;

use App\Events\ClientActivity;
use App\Models\Appointment;
use App\Models\BusinessSetting;
use App\Models\User;
use App\Notifications\ClientDisciplineNotification;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Notification;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpException;

class ClientDisciplineService
{
    public function __construct(private DemandService $demand) {}

    public const BUSY_MESSAGE = 'Termin je u međuvremenu zauzet. Izaberi drugo vreme.';

    public const SUSPENDED_MESSAGE = 'Tvoj nalog je suspendovan i ne možeš da zakazuješ termine. Za više informacija pozovi salon.';

    private const LATE_CANCEL_HOURS = 24;

    public function points(User $client): float
    {
        $settings = BusinessSetting::current();
        $since = now()->subDays($settings->discipline_window_days);

        $appointments = Appointment::query()
            ->where('client_id', $client->id)
            ->where(fn ($q) => $q
                ->where(fn ($q) => $q->where('status', Appointment::STATUS_CANCELLED)->where('cancelled_by', 'client')->where('cancelled_at', '>=', $since))
                ->orWhere(fn ($q) => $q->where('status', Appointment::STATUS_NO_SHOW)->where('starts_at', '>=', $since)))
            ->get(['status', 'starts_at', 'cancelled_at']);

        return round($appointments->sum(fn (Appointment $a) => match (true) {
            $a->status === Appointment::STATUS_NO_SHOW => $settings->discipline_no_show_points,
            $a->cancelled_at && $a->cancelled_at->diffInHours($a->starts_at, false) < self::LATE_CANCEL_HOURS => $settings->discipline_late_cancel_points,
            default => $settings->discipline_cancel_points,
        }), 1);
    }

    public function zoneFor(float $points): string
    {
        $settings = BusinessSetting::current();

        return match (true) {
            $settings->discipline_auto_suspend && $points >= $settings->discipline_red_points => User::ZONE_RED,
            $points >= $settings->discipline_orange_points => User::ZONE_ORANGE,
            $points >= $settings->discipline_yellow_points => User::ZONE_YELLOW,
            default => User::ZONE_GREEN,
        };
    }

    public function refresh(User $client): User
    {
        if ($client->role !== User::ROLE_CLIENT) {
            return $client;
        }

        $points = $this->points($client);
        $manualActive = $client->zone_manual && (! $client->zone_until || $client->zone_until->gte(today()));
        $enabled = BusinessSetting::current()->discipline_enabled;
        $zone = $manualActive ? $client->discipline_zone : ($enabled ? $this->zoneFor($points) : User::ZONE_GREEN);
        $previous = $client->discipline_zone ?? User::ZONE_GREEN;

        $client->forceFill([
            'discipline_points' => $points,
            'discipline_zone' => $zone,
            'zone_manual' => $manualActive,
            'zone_until' => $manualActive ? $client->zone_until : null,
            'zone_reason' => $manualActive || $zone !== User::ZONE_GREEN ? ($manualActive ? $client->zone_reason : 'Automatski (poeni: '.$points.')') : null,
            'zone_changed_at' => $zone !== $previous ? now() : $client->zone_changed_at,
        ])->save();

        if ($zone !== $previous) {
            ClientActivity::dispatch($client, ClientActivity::ZONE_CHANGED, ['from' => $previous, 'to' => $zone, 'points' => $points, 'manual' => false]);
            if ($this->rank($zone) > $this->rank($previous)) {
                Notification::send($this->owners(), new ClientDisciplineNotification($client, ClientDisciplineNotification::ZONE_RAISED, $previous));
            }
        }

        return $client;
    }

    public function setManual(User $client, ?string $zone, ?string $reason, ?string $until, User $actor): User
    {
        $previous = $client->discipline_zone ?? User::ZONE_GREEN;

        if ($zone === null) {
            $client->forceFill(['zone_manual' => false, 'zone_until' => null, 'zone_reason' => null])->save();
            ClientActivity::dispatch($client, ClientActivity::ZONE_CHANGED, ['from' => $previous, 'to' => 'auto', 'manual' => true], $actor);

            return $this->refresh($client);
        }

        $client->forceFill([
            'discipline_zone' => $zone,
            'discipline_points' => $this->points($client),
            'zone_manual' => true,
            'zone_until' => $until,
            'zone_reason' => $reason,
            'zone_changed_at' => now(),
        ])->save();

        if ($zone === User::ZONE_RED) {
            $client->refreshTokens()->update(['revoked_at' => now()]);
        }

        ClientActivity::dispatch($client, ClientActivity::ZONE_CHANGED, ['from' => $previous, 'to' => $zone, 'manual' => true, 'reason' => $reason, 'until' => $until], $actor);

        return $client;
    }

    public function restrictions(?User $client): array
    {
        $settings = BusinessSetting::current();
        $zone = $client?->role === User::ROLE_CLIENT && $settings->discipline_enabled ? ($client->discipline_zone ?? User::ZONE_GREEN) : User::ZONE_GREEN;

        return [
            'zone' => $zone,
            'suspended' => $zone === User::ZONE_RED,
            'silent_block' => $zone === User::ZONE_ORANGE,
            'force_pending' => $zone !== User::ZONE_GREEN,
            'off_peak_only' => $zone === User::ZONE_YELLOW && $settings->discipline_yellow_off_peak,
            'earliest' => $zone === User::ZONE_YELLOW ? CarbonImmutable::today()->addDays($settings->discipline_yellow_min_days) : null,
            'latest' => $zone === User::ZONE_YELLOW ? CarbonImmutable::today()->addDays($settings->discipline_yellow_horizon_days) : null,
        ];
    }

    public function hidesDate(?User $client, CarbonImmutable $date): bool
    {
        $rules = $this->restrictions($client);

        return $rules['suspended'] || $rules['silent_block']
            || ($rules['earliest'] && $date->lt($rules['earliest']))
            || ($rules['latest'] && $date->gt($rules['latest']));
    }

    public function allowsSlot(?User $client, CarbonImmutable $start): bool
    {
        return ! $this->restrictions($client)['off_peak_only'] || $this->demand->isOffPeak($start);
    }

    public function ensureCanBook(User $client, CarbonImmutable $start, string $failureType = ClientActivity::BOOKING_FAILED): void
    {
        $rules = $this->restrictions($client);

        if ($rules['suspended']) {
            ClientActivity::dispatch($client, $failureType, ['starts_at' => $start->format('Y-m-d H:i'), 'reason' => 'suspended']);
            throw new HttpException(403, self::SUSPENDED_MESSAGE);
        }

        if ($this->hidesDate($client, $start->startOfDay())) {
            ClientActivity::dispatch($client, $failureType, ['starts_at' => $start->format('Y-m-d H:i'), 'reason' => $rules['silent_block'] ? 'silent_block' : 'yellow_window', 'zone' => $rules['zone']]);
            $this->notifyBlockedAttempt($client);
            throw ValidationException::withMessages(['starts_at' => [self::BUSY_MESSAGE]]);
        }

        if (! $this->allowsSlot($client, $start)) {
            ClientActivity::dispatch($client, $failureType, ['starts_at' => $start->format('Y-m-d H:i'), 'reason' => 'peak_slot', 'zone' => $rules['zone']]);
            throw ValidationException::withMessages(['starts_at' => [self::BUSY_MESSAGE]]);
        }
    }

    public function ensureNotSuspended(User $client): void
    {
        if ($this->restrictions($client)['suspended']) {
            throw new HttpException(403, self::SUSPENDED_MESSAGE);
        }
    }

    public function logAvailability(?User $client, array $data): void
    {
        if ($client?->role !== User::ROLE_CLIENT || ! Cache::add("activity:availability:{$client->id}", true, now()->addMinutes(30))) {
            return;
        }

        $rules = $this->restrictions($client);
        ClientActivity::dispatch($client, ClientActivity::AVAILABILITY_VIEWED, [...$data, ...($rules['zone'] !== User::ZONE_GREEN ? ['zone' => $rules['zone']] : [])]);

        if ($rules['silent_block']) {
            $this->notifyBlockedAttempt($client);
        }
    }

    public function stats(User $client): array
    {
        $appointments = Appointment::where('client_id', $client->id)->get(['status', 'cancelled_by', 'starts_at', 'cancelled_at']);
        $cancelled = $appointments->where('status', Appointment::STATUS_CANCELLED);
        $byClient = $cancelled->where('cancelled_by', 'client');
        $finished = $appointments->whereIn('status', [Appointment::STATUS_COMPLETED, Appointment::STATUS_NO_SHOW])->count() + $byClient->count();

        return [
            'total' => $appointments->count(),
            'completed' => $appointments->where('status', Appointment::STATUS_COMPLETED)->count(),
            'upcoming' => $appointments->whereIn('status', Appointment::BLOCKING_STATUSES)->where('starts_at', '>=', now())->count(),
            'cancelled_by_client' => $byClient->count(),
            'late_cancelled' => $byClient->filter(fn ($a) => $a->cancelled_at && $a->cancelled_at->diffInHours($a->starts_at, false) < self::LATE_CANCEL_HOURS)->count(),
            'cancelled_by_salon' => $cancelled->count() - $byClient->count(),
            'no_shows' => $appointments->where('status', Appointment::STATUS_NO_SHOW)->count(),
            'reliability' => $finished > 0 ? round($appointments->where('status', Appointment::STATUS_COMPLETED)->count() / $finished * 100) : null,
        ];
    }

    private function notifyBlockedAttempt(User $client): void
    {
        if (Cache::add("discipline:blocked-attempt:{$client->id}", true, now()->endOfDay())) {
            Notification::send($this->owners(), new ClientDisciplineNotification($client, ClientDisciplineNotification::BLOCKED_ATTEMPT));
        }
    }

    private function rank(string $zone): int
    {
        return array_search($zone, User::ZONES, true) ?: 0;
    }

    private function owners()
    {
        return User::where('role', User::ROLE_OWNER)->where('active', true)->whereNotNull('email')->get();
    }
}

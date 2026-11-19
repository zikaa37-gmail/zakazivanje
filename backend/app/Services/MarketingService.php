<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MarketingService
{
    public const SOURCE_PATTERN = '/^[a-z0-9_-]{1,30}$/';

    public const CAMPAIGN_PATTERN = '/^[a-z0-9_-]{1,60}$/';

    public function referral(Request $request): array
    {
        $source = $request->input('referral.source');
        $campaign = $request->input('referral.campaign');

        if (! is_string($source) || ! preg_match(self::SOURCE_PATTERN, $source)) {
            return ['source' => null, 'campaign' => null];
        }

        return ['source' => $source, 'campaign' => is_string($campaign) && preg_match(self::CAMPAIGN_PATTERN, $campaign) ? $campaign : null];
    }

    public function recordVisit(string $source, ?string $campaign): void
    {
        $this->increment('visits', $source, $campaign);
    }

    public function recordLogin(User $user, array $referral): void
    {
        if (! $referral['source'] || $user->role !== User::ROLE_CLIENT || $user->created_at?->gt(now()->subHour())) {
            return;
        }

        $this->increment('logins', $referral['source'], $referral['campaign']);
    }

    private function increment(string $field, string $source, ?string $campaign): void
    {
        DB::table('marketing_visits')->upsert(
            [['visited_on' => today()->toDateString(), 'source' => $source, 'campaign' => $campaign ?? '', 'visits' => 0, 'logins' => 0, $field => 1]],
            ['visited_on', 'source', 'campaign'],
            [$field => DB::raw("{$field} + 1")],
        );
    }

    public function report(CarbonImmutable $from, CarbonImmutable $to): array
    {
        $rows = [];
        $add = function (string $source, ?string $campaign, string $field, int $value) use (&$rows) {
            $key = $source.'|'.($campaign ?? '');
            $rows[$key] ??= ['source' => $source, 'campaign' => $campaign ?: null, 'visits' => 0, 'registrations' => 0, 'logins' => 0, 'bookings' => 0, 'new_clients' => 0, 'completed' => 0, 'revenue' => 0];
            $rows[$key][$field] += $value;
        };

        DB::table('marketing_visits')
            ->whereBetween('visited_on', [$from->toDateString(), $to->toDateString()])
            ->selectRaw('source, campaign, SUM(visits) as visits, SUM(logins) as logins')
            ->groupBy('source', 'campaign')
            ->get()
            ->each(function ($r) use ($add) {
                $add($r->source, $r->campaign ?: null, 'visits', (int) $r->visits);
                $add($r->source, $r->campaign ?: null, 'logins', (int) $r->logins);
            });

        User::query()
            ->where('role', User::ROLE_CLIENT)
            ->whereNotNull('signup_source')
            ->whereBetween('created_at', [$from->startOfDay(), $to->endOfDay()])
            ->selectRaw('signup_source, signup_campaign, COUNT(*) as total')
            ->groupBy('signup_source', 'signup_campaign')
            ->get()
            ->each(fn ($r) => $add($r->signup_source, $r->signup_campaign, 'registrations', (int) $r->total));

        $referred = Appointment::query()
            ->whereNotNull('referral_source')
            ->whereBetween('created_at', [$from->startOfDay(), $to->endOfDay()])
            ->get(['id', 'client_id', 'referral_source', 'referral_campaign', 'status', 'total']);
        $firstByClient = Appointment::query()
            ->whereIn('client_id', $referred->pluck('client_id')->unique())
            ->groupBy('client_id')
            ->selectRaw('client_id, MIN(id) as first_id')
            ->pluck('first_id', 'client_id');

        $referred
            ->each(function (Appointment $a) use ($add, $firstByClient) {
                $add($a->referral_source, $a->referral_campaign, 'bookings', 1);
                if ((int) ($firstByClient[$a->client_id] ?? 0) === $a->id) {
                    $add($a->referral_source, $a->referral_campaign, 'new_clients', 1);
                }
                if ($a->status === Appointment::STATUS_COMPLETED) {
                    $add($a->referral_source, $a->referral_campaign, 'completed', 1);
                    $add($a->referral_source, $a->referral_campaign, 'revenue', (int) $a->total);
                }
            });

        return collect($rows)->sortByDesc('visits')->values()->all();
    }
}

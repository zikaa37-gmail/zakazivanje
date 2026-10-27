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
        DB::table('marketing_visits')->upsert(
            [['visited_on' => today()->toDateString(), 'source' => $source, 'campaign' => $campaign ?? '', 'visits' => 1]],
            ['visited_on', 'source', 'campaign'],
            ['visits' => DB::raw('visits + 1')],
        );
    }

    public function report(CarbonImmutable $from, CarbonImmutable $to): array
    {
        $rows = [];
        $add = function (string $source, ?string $campaign, string $field, int $value) use (&$rows) {
            $key = $source.'|'.($campaign ?? '');
            $rows[$key] ??= ['source' => $source, 'campaign' => $campaign ?: null, 'visits' => 0, 'registrations' => 0, 'bookings' => 0, 'completed' => 0, 'revenue' => 0];
            $rows[$key][$field] += $value;
        };

        DB::table('marketing_visits')
            ->whereBetween('visited_on', [$from->toDateString(), $to->toDateString()])
            ->selectRaw('source, campaign, SUM(visits) as total')
            ->groupBy('source', 'campaign')
            ->get()
            ->each(fn ($r) => $add($r->source, $r->campaign ?: null, 'visits', (int) $r->total));

        User::query()
            ->where('role', User::ROLE_CLIENT)
            ->whereNotNull('signup_source')
            ->whereBetween('created_at', [$from->startOfDay(), $to->endOfDay()])
            ->selectRaw('signup_source, signup_campaign, COUNT(*) as total')
            ->groupBy('signup_source', 'signup_campaign')
            ->get()
            ->each(fn ($r) => $add($r->signup_source, $r->signup_campaign, 'registrations', (int) $r->total));

        Appointment::query()
            ->whereNotNull('referral_source')
            ->whereBetween('created_at', [$from->startOfDay(), $to->endOfDay()])
            ->get(['referral_source', 'referral_campaign', 'status', 'total'])
            ->each(function (Appointment $a) use ($add) {
                $add($a->referral_source, $a->referral_campaign, 'bookings', 1);
                if ($a->status === Appointment::STATUS_COMPLETED) {
                    $add($a->referral_source, $a->referral_campaign, 'completed', 1);
                    $add($a->referral_source, $a->referral_campaign, 'revenue', (int) $a->total);
                }
            });

        return collect($rows)->sortByDesc('visits')->values()->all();
    }
}

<?php

namespace App\Console\Commands;

use App\Models\BusinessSetting;
use App\Models\User;
use App\Services\ReportService;
use Carbon\CarbonImmutable;
use Illuminate\Console\Command;
use Throwable;

class SendScheduledReports extends Command
{
    protected $signature = 'reports:send-scheduled {--date= : Dan za koji se šalje (Y-m-d), podrazumevano danas}';

    protected $description = 'Šalje dnevne, nedeljne i mesečne izveštaje osoblju ako je automatsko slanje uključeno';

    public function handle(ReportService $reports): int
    {
        $pruned = $reports->pruneFiles();
        $settings = BusinessSetting::current();

        if (! $settings->report_auto_enabled) {
            $this->info("Automatsko slanje je isključeno (obrisano starih PDF-ova: {$pruned}).");

            return self::SUCCESS;
        }

        $date = CarbonImmutable::parse($this->option('date') ?: 'today');
        $periods = array_keys(array_filter([
            'day' => $settings->report_auto_daily,
            'week' => $settings->report_auto_weekly && $date->isSunday(),
            'month' => $settings->report_auto_monthly && $date->isLastOfMonth(),
        ]));

        $recipients = User::whereIn('role', User::STAFF_ROLES)->where('active', true)->with('staffMember')->get();
        $sent = 0;

        foreach ($periods as $period) {
            $summary = null;
            foreach ($recipients as $user) {
                $staff = $user->isOwner() || $user->staff_member_id === null ? null : $user->staffMember;
                if (! $staff && ! $user->isOwner() && $user->staff_member_id !== null) {
                    continue;
                }

                try {
                    $report = $staff ? $reports->build($staff, $period, $date) : ($summary ??= $reports->build(null, $period, $date));
                    $reports->send($user, $report, $settings->report_auto_channel);
                    $sent++;
                } catch (Throwable $e) {
                    $this->warn("{$user->email}: {$e->getMessage()}");
                }
            }
        }

        $this->info("Poslato izveštaja: {$sent}.");

        return self::SUCCESS;
    }
}

<?php

namespace App\Console\Commands;

use App\Models\Appointment;
use App\Models\BusinessSetting;
use App\Services\AppointmentNotifier;
use Illuminate\Console\Command;

class SendAppointmentReminders extends Command
{
    protected $signature = 'appointments:send-reminders';

    protected $description = 'Šalje podsetnike klijentima pre termina (Podešavanja → Obaveštenja)';

    public function handle(AppointmentNotifier $notifier): int
    {
        $hours = BusinessSetting::current()->reminder_hours;
        if ($hours === 0) {
            return self::SUCCESS;
        }

        $sent = 0;
        $skipped = 0;
        $windowEnd = now()->addHours($hours);

        Appointment::query()
            ->where('status', Appointment::STATUS_CONFIRMED)
            ->whereNull('reminder_sent_at')
            ->whereBetween('starts_at', [now(), $windowEnd])
            ->with(['client', 'items', 'staffMember'])
            ->each(function (Appointment $appointment) use ($notifier, $hours, &$sent, &$skipped) {
                $bookedInsideWindow = $appointment->created_at->gt($appointment->starts_at->copy()->subHours($hours));

                if (! $bookedInsideWindow) {
                    $notifier->reminder($appointment);
                    $sent++;
                } else {
                    $skipped++;
                }

                $appointment->forceFill(['reminder_sent_at' => now()])->saveQuietly();
            });

        $this->info("Podsetnika poslato: {$sent}, preskočeno (zakazano u poslednjih {$hours} h): {$skipped}.");

        return self::SUCCESS;
    }
}

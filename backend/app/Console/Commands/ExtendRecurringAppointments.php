<?php

namespace App\Console\Commands;

use App\Models\AppointmentRecurrence;
use App\Services\RecurrenceService;
use Illuminate\Console\Command;

class ExtendRecurringAppointments extends Command
{
    protected $signature = 'appointments:extend-recurring';

    protected $description = 'Pravi termine za ponavljanja do 8 nedelja unapred';

    public function handle(RecurrenceService $recurrences): int
    {
        $created = 0;
        $skipped = 0;

        AppointmentRecurrence::where('active', true)->each(function (AppointmentRecurrence $recurrence) use ($recurrences, &$created, &$skipped) {
            $before = count($recurrence->skipped_dates ?? []);
            $result = $recurrences->generate($recurrence);
            $created += count($result['created']);
            $skipped += count($result['skipped']) - $before;
        });

        $this->info("Napravljeno termina: {$created}, preskočeno (zauzeto): {$skipped}.");

        return self::SUCCESS;
    }
}

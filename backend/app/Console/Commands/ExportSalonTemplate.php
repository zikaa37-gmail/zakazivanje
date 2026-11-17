<?php

namespace App\Console\Commands;

use App\Services\SalonTemplateService;
use Illuminate\Console\Command;

class ExportSalonTemplate extends Command
{
    protected $signature = 'salon:export {slug : naziv foldera u database/data/salons}';

    protected $description = 'Čuva podatke salona (podešavanja, radno vreme, usluge, zaposleni, akcije, nalozi osoblja, logo) kao šablon';

    public function handle(SalonTemplateService $templates): int
    {
        $dir = SalonTemplateService::directory($this->argument('slug'));
        $counts = $templates->export($dir);
        $this->info("Sačuvano u {$dir}");
        $this->table(array_keys($counts), [array_values($counts)]);

        return self::SUCCESS;
    }
}

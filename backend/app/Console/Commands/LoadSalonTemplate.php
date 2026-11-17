<?php

namespace App\Console\Commands;

use App\Services\SalonTemplateService;
use Database\Seeders\DemoDataSeeder;
use Illuminate\Console\Command;

class LoadSalonTemplate extends Command
{
    protected $signature = 'salon:load
        {slug : naziv foldera u database/data/salons}
        {--password= : lozinka za naloge iz šablona (bez nje dobijaju nasumičnu i koriste „Zaboravljena lozinka")}
        {--keep-logins : zadrži naloge za brzu prijavu (QUICK_LOGIN_EMAILS); radnici se vezuju za zaposlene iz šablona}
        {--demo : posle učitavanja napravi demo klijente i termine}
        {--force : bez pitanja}';

    protected $description = 'BRIŠE sve podatke u bazi i učitava salon iz šablona';

    public function handle(SalonTemplateService $templates): int
    {
        $dir = SalonTemplateService::directory($this->argument('slug'));
        $templates->read($dir);

        if (! $this->option('force') && ! $this->confirm('Ovo briše SVE podatke u bazi ('.config('database.connections.'.config('database.default').'.database').'). Nastaviti?')) {
            return self::FAILURE;
        }

        $kept = $this->option('keep-logins') ? $templates->keptUsers(config('auth_jwt.quick_login_emails')) : collect();
        $templates->wipe();
        $counts = $templates->load($dir, $this->option('password') ?: null, $kept);
        $this->info("Učitano iz {$dir}");
        $this->table(array_keys($counts), [array_values($counts)]);

        if ($this->option('demo')) {
            $this->call('db:seed', ['--class' => DemoDataSeeder::class, '--force' => true]);
        }

        return self::SUCCESS;
    }
}

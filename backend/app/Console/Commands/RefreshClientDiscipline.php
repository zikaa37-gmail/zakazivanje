<?php

namespace App\Console\Commands;

use App\Models\Appointment;
use App\Models\BusinessSetting;
use App\Models\User;
use App\Services\ClientDisciplineService;
use Illuminate\Console\Command;

class RefreshClientDiscipline extends Command
{
    protected $signature = 'clients:refresh-discipline';

    protected $description = 'Preračunava poene i zone klijenata (poeni zastarevaju, ručne zone ističu)';

    public function handle(ClientDisciplineService $discipline): int
    {
        $since = now()->subDays(BusinessSetting::current()->discipline_window_days + 1);
        $recent = Appointment::query()
            ->where(fn ($q) => $q->where('cancelled_at', '>=', $since)->orWhere(fn ($q) => $q->where('status', Appointment::STATUS_NO_SHOW)->where('starts_at', '>=', $since)))
            ->distinct()
            ->pluck('client_id');

        $clients = User::query()
            ->where('role', User::ROLE_CLIENT)
            ->where(fn ($q) => $q->where('discipline_zone', '!=', User::ZONE_GREEN)->orWhere('discipline_points', '>', 0)->orWhere('zone_manual', true)->orWhereIn('id', $recent))
            ->get();

        $clients->each(fn (User $client) => $discipline->refresh($client));
        $this->info("Preračunato klijenata: {$clients->count()}.");

        return self::SUCCESS;
    }
}

<?php

namespace App\Listeners;

use App\Events\ClientActivity;
use App\Models\ClientActivityLog;
use App\Models\User;

class RecordClientActivity
{
    public function handle(ClientActivity $event): void
    {
        if ($event->client->role !== User::ROLE_CLIENT) {
            return;
        }

        $request = request();

        ClientActivityLog::create([
            'user_id' => $event->client->id,
            'type' => $event->type,
            'data' => $event->data ?: null,
            'actor_id' => $event->actor?->id,
            'ip' => app()->runningInConsole() ? null : $request->ip(),
            'user_agent' => app()->runningInConsole() ? null : mb_substr((string) $request->userAgent(), 0, 250),
        ]);
    }
}

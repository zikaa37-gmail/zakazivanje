<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Pusher\Pusher;
use Throwable;

class Realtime
{
    public const STAFF_CHANNEL = 'private-salon';

    public const EVENT = 'appointment';

    private ?Pusher $client = null;

    public function configured(): bool
    {
        return (bool) (config('services.pusher.key') && config('services.pusher.secret') && config('services.pusher.app_id'));
    }

    public function publicConfig(): ?array
    {
        return $this->configured() ? ['key' => config('services.pusher.key'), 'cluster' => config('services.pusher.cluster')] : null;
    }

    public static function userChannel(int $userId): string
    {
        return 'private-user-'.$userId;
    }

    public function canJoin(User $user, string $channel): bool
    {
        return match (true) {
            $channel === self::STAFF_CHANNEL => $user->isStaff(),
            $channel === self::userChannel($user->id) => true,
            default => false,
        };
    }

    public function authorize(string $channel, string $socketId): string
    {
        return $this->client()->authorizeChannel($channel, $socketId);
    }

    public function toStaff(Appointment $appointment, string $kind, ?string $message = null, array $staffIds = []): void
    {
        $this->push(self::STAFF_CHANNEL, $this->payload($appointment, $kind, $message, $staffIds));
    }

    public function toClient(Appointment $appointment, string $kind, ?string $message = null): void
    {
        if ($appointment->client_id) {
            $this->push(self::userChannel($appointment->client_id), $this->payload($appointment, $kind, $message));
        }
    }

    public function describe(Appointment $appointment, bool $withClient = true): string
    {
        $appointment->loadMissing(['items', 'staffMember', 'client']);
        $start = CarbonImmutable::parse($appointment->starts_at);
        $parts = [
            $withClient && $appointment->client ? trim($appointment->client->first_name.' '.$appointment->client->last_name) : null,
            $start->format('d.m.').' u '.$start->format('H:i'),
            $appointment->items->pluck('name')->join(' + '),
            $appointment->staffMember?->first_name,
        ];

        return implode(' · ', array_filter($parts));
    }

    private function payload(Appointment $appointment, string $kind, ?string $message, array $staffIds = []): array
    {
        return [
            'kind' => $kind,
            'appointment_id' => $appointment->id,
            'status' => $appointment->status,
            'starts_at' => CarbonImmutable::parse($appointment->starts_at)->format('Y-m-d H:i'),
            'staff_member_ids' => array_values(array_unique(array_filter([$appointment->staff_member_id, ...$staffIds]))),
            'actor_id' => Auth::id(),
            'message' => $message,
        ];
    }

    private function push(string $channel, array $data): void
    {
        if (! $this->configured()) {
            return;
        }

        defer(fn () => $this->send($channel, $data));
    }

    protected function send(string $channel, array $data): void
    {
        try {
            $this->client()->trigger($channel, self::EVENT, $data);
        } catch (Throwable $e) {
            Log::warning('Realtime push failed: '.$e->getMessage());
        }
    }

    private function client(): Pusher
    {
        return $this->client ??= new Pusher(
            config('services.pusher.key'),
            config('services.pusher.secret'),
            config('services.pusher.app_id'),
            ['cluster' => config('services.pusher.cluster') ?: 'eu', 'useTLS' => true, 'timeout' => 5],
        );
    }
}

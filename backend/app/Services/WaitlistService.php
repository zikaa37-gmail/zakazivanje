<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\BusinessSetting;
use App\Models\User;
use App\Models\WaitlistEntry;
use App\Notifications\WaitlistNotification;
use Carbon\CarbonImmutable;

class WaitlistService
{
    public const RENOTIFY_AFTER_MINUTES = 30;

    public function __construct(private AvailabilityService $availability) {}

    public function freeTimes(WaitlistEntry $entry): array
    {
        $services = $this->availability->servicesInOrder($entry->service_ids);
        if ($services->isEmpty()) {
            return [];
        }

        return collect($this->availability->slots($services, $entry->staff_member_id, CarbonImmutable::parse($entry->date)))
            ->pluck('time')
            ->filter(fn ($time) => $entry->fitsTime($time) && (! $entry->client || app(ClientDisciplineService::class)->allowsSlot($entry->client, CarbonImmutable::parse($entry->date)->setTimeFromTimeString($time))))
            ->values()
            ->all();
    }

    public function slotFreed(Appointment $appointment): int
    {
        return $this->slotFreedAt(CarbonImmutable::parse($appointment->starts_at)->toDateString(), $appointment->staff_member_id, $appointment->client_id);
    }

    public function slotFreedAt(string $date, ?int $staffMemberId, ?int $exceptClientId = null): int
    {
        if ($date < now()->toDateString() || ! BusinessSetting::current()->waitlist_enabled) {
            return 0;
        }

        $sent = 0;
        WaitlistEntry::query()
            ->active()
            ->whereDate('date', $date)
            ->when($exceptClientId, fn ($q) => $q->where('client_id', '!=', $exceptClientId))
            ->where(fn ($q) => $q->whereNull('staff_member_id')->orWhere('staff_member_id', $staffMemberId))
            ->where(fn ($q) => $q->whereNull('notified_at')->orWhere('notified_at', '<', now()->subMinutes(self::RENOTIFY_AFTER_MINUTES)))
            ->with('client')
            ->orderBy('created_at')
            ->get()
            ->each(function (WaitlistEntry $entry) use (&$sent) {
                $times = $this->freeTimes($entry);
                if ($times === [] || ! $entry->client || app(ClientDisciplineService::class)->hidesDate($entry->client, CarbonImmutable::parse($entry->date)) || $entry->client->notificationChannels(['mail' => 'mail', 'whatsapp' => 'whatsapp']) === []) {
                    return;
                }
                $entry->update(['notified_at' => now()]);
                $entry->client->notify(new WaitlistNotification($entry, $times));
                $sent++;
            });

        return $sent;
    }

    public function fulfil(User $client, string $date): void
    {
        WaitlistEntry::query()->active()->where('client_id', $client->id)->whereDate('date', $date)->update(['fulfilled_at' => now()]);
    }
}

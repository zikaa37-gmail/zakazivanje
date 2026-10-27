<?php

namespace App\Notifications;

use App\Models\BusinessSetting;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ClientDisciplineNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public const ZONE_RAISED = 'discipline_zone_raised';

    public const BLOCKED_ATTEMPT = 'discipline_blocked_attempt';

    public const ZONE_LABELS = [
        User::ZONE_GREEN => 'zelena (bez ograničenja)',
        User::ZONE_YELLOW => 'žuta (otežano zakazivanje)',
        User::ZONE_ORANGE => 'narandžasta (tiho blokiran — sve izgleda popunjeno)',
        User::ZONE_RED => 'crvena (suspendovan)',
    ];

    public function __construct(
        public User $client,
        public string $type,
        public ?string $previousZone = null,
    ) {
        $this->afterCommit();
    }

    public function logType(): string
    {
        return $this->type;
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $business = BusinessSetting::current()->name;
        $name = $this->client->fullName();
        $zone = self::ZONE_LABELS[$this->client->discipline_zone] ?? $this->client->discipline_zone;
        $url = rtrim(config('app.frontend_url'), '/').'/admin/clients?history='.$this->client->id;

        $message = (new MailMessage)->greeting('Zdravo, '.$notifiable->first_name.'!')->salutation('Pozdrav, '.$business);

        if ($this->type === self::BLOCKED_ATTEMPT) {
            return $message
                ->subject("Klijent {$name} pokušava da zakaže — {$business}")
                ->line("{$name} je danas pokušao/la da zakaže termin, a nalog je u zoni: {$zone}.")
                ->line('Klijent vidi da su svi termini popunjeni.')
                ->action('Istorijat klijenta', $url);
        }

        return $message
            ->subject("Klijent {$name} je prešao u višu zonu — {$business}")
            ->line("{$name} je automatski prešao/la iz zone „".(self::ZONE_LABELS[$this->previousZone] ?? $this->previousZone)."“ u zonu „{$zone}“.")
            ->line('Poeni za otkazivanja i nedolaske: '.$this->client->discipline_points.'.')
            ->action('Istorijat klijenta', $url);
    }
}

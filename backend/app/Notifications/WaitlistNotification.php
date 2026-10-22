<?php

namespace App\Notifications;

use App\Models\BusinessSetting;
use App\Models\Service;
use App\Models\User;
use App\Models\WaitlistEntry;
use App\Notifications\Channels\WhatsAppChannel;
use Carbon\CarbonImmutable;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Queue\SerializesModels;

class WaitlistNotification extends Notification implements ShouldQueue
{
    use Queueable, SerializesModels;

    public const TYPE = 'waitlist_slot';

    public function __construct(public WaitlistEntry $entry, public array $times)
    {
        $this->afterCommit();
    }

    public function via(User $notifiable): array
    {
        return $notifiable->notificationChannels(['mail' => 'mail', 'whatsapp' => WhatsAppChannel::class]);
    }

    public function logType(): string
    {
        return self::TYPE;
    }

    public function toMail(User $notifiable): MailMessage
    {
        $business = BusinessSetting::current();

        return (new MailMessage)
            ->subject('Oslobodio se termin — '.$business->name)
            ->greeting('Zdravo, '.$notifiable->first_name.'!')
            ->line('Oslobodio se termin za dan sa liste čekanja: **'.$this->day().'**.')
            ->line('Slobodno: '.$this->timesLabel().' ('.$this->services().').')
            ->line('Ko prvi zakaže, njegov je termin.')
            ->action('Zakaži sada', $this->link())
            ->salutation('Pozdrav, '.$business->name);
    }

    public function toWhatsApp(User $notifiable): string
    {
        $business = BusinessSetting::current();

        return "*{$business->name}* — oslobodio se termin {$this->day()}: {$this->timesLabel()}.\nZakaži: {$this->link()}";
    }

    private function day(): string
    {
        $days = ['nedelja', 'ponedeljak', 'utorak', 'sreda', 'četvrtak', 'petak', 'subota'];
        $date = CarbonImmutable::parse($this->entry->date);

        return $days[$date->dayOfWeek].' '.$date->format('d.m.Y.');
    }

    private function timesLabel(): string
    {
        $times = array_slice($this->times, 0, 4);

        return implode(', ', $times).(count($this->times) > 4 ? ' i još' : '');
    }

    private function services(): string
    {
        return Service::whereIn('id', $this->entry->service_ids)->pluck('name')->join(' + ');
    }

    private function link(): string
    {
        $query = http_build_query(array_filter([
            'services' => implode(',', $this->entry->service_ids),
            'staff' => $this->entry->staff_member_id,
            'date' => CarbonImmutable::parse($this->entry->date)->toDateString(),
        ]));

        return rtrim(config('app.frontend_url'), '/').'/book?'.$query;
    }
}

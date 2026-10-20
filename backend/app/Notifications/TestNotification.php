<?php

namespace App\Notifications;

use App\Models\BusinessSetting;
use App\Notifications\Channels\WhatsAppChannel;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class TestNotification extends Notification
{
    public function __construct(private readonly string $channel) {}

    public function via(object $notifiable): array
    {
        return [$this->channel === 'whatsapp' ? WhatsAppChannel::class : 'mail'];
    }

    public function logType(): string
    {
        return 'test';
    }

    public function toMail(object $notifiable): MailMessage
    {
        $name = BusinessSetting::current()->name;

        return (new MailMessage)
            ->subject('Probno obaveštenje — '.$name)
            ->greeting('Zdravo, '.$notifiable->first_name.'!')
            ->line('Ovo je probna poruka. Ako je vidiš, mejl obaveštenja rade.')
            ->salutation('Pozdrav, '.$name);
    }

    public function toWhatsApp(object $notifiable): string
    {
        return '*'.BusinessSetting::current()->name.'* — probna poruka. WhatsApp obaveštenja rade.';
    }
}

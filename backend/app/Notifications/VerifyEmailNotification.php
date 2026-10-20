<?php

namespace App\Notifications;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class VerifyEmailNotification extends Notification
{
    public function __construct(private readonly string $token) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $url = rtrim(config('app.frontend_url'), '/').'/verify-email?token='.$this->token;

        return (new MailMessage)
            ->subject('Potvrda email adrese — Zakazivanje')
            ->greeting('Zdravo, '.$notifiable->first_name.'!')
            ->line('Hvala na registraciji. Potvrdi svoju email adresu klikom na dugme ispod.')
            ->action('Potvrdi email', $url)
            ->line('Ako nisi ti napravio/la nalog, slobodno ignoriši ovaj email.');
    }
}

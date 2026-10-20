<?php

namespace App\Notifications;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ResetPasswordNotification extends Notification
{
    public function __construct(private readonly string $token) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $url = rtrim(config('app.frontend_url'), '/').'/reset-password?token='.$this->token.'&email='.urlencode($notifiable->getEmailForPasswordReset());

        return (new MailMessage)
            ->subject('Resetovanje lozinke — Zakazivanje')
            ->greeting('Zdravo, '.$notifiable->first_name.'!')
            ->line('Primili smo zahtev za resetovanje lozinke za tvoj nalog.')
            ->action('Resetuj lozinku', $url)
            ->line('Link važi 60 minuta. Ako nisi ti tražio/la reset lozinke, slobodno ignoriši ovaj email.');
    }
}

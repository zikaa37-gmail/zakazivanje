<?php

namespace App\Notifications;

use App\Models\BusinessSetting;
use App\Models\User;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class VerifyEmailNotification extends Notification
{
    public function __construct(private readonly string $token, private readonly ?string $next = null) {}

    public function logType(): string
    {
        return 'email_verification';
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $url = rtrim(config('app.frontend_url'), '/').'/verify-email?token='.$this->token.($this->next ? '&next='.urlencode($this->next) : '');

        return (new MailMessage)
            ->subject('Aktivacija naloga — '.BusinessSetting::current()->name)
            ->greeting('Zdravo, '.$notifiable->first_name.'!')
            ->salutation('Pozdrav, '.BusinessSetting::current()->name)
            ->line('Hvala na registraciji. Aktiviraj nalog klikom na dugme ispod — posle toga si odmah prijavljen/a.')
            ->action('Aktiviraj nalog', $url)
            ->line('Link važi '.User::VERIFICATION_DAYS.' dana. Posle toga se registruj ponovo istim mejlom i stići će novi link.')
            ->line('Ako nisi ti napravio/la nalog, slobodno ignoriši ovaj email.');
    }
}

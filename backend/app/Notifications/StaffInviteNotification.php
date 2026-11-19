<?php

namespace App\Notifications;

use App\Models\BusinessSetting;
use App\Models\User;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class StaffInviteNotification extends Notification
{
    public function __construct(private readonly string $token) {}

    public function logType(): string
    {
        return 'staff_invite';
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $business = BusinessSetting::current()->name;
        $url = rtrim(config('app.frontend_url'), '/').'/reset-password?token='.$this->token.'&email='.urlencode($notifiable->getEmailForPasswordReset());
        $role = $notifiable->role === User::ROLE_OWNER ? 'vlasnika' : 'radnika';

        return (new MailMessage)
            ->subject('Pristup aplikaciji — '.$business)
            ->greeting('Zdravo, '.$notifiable->first_name.'!')
            ->salutation('Pozdrav, '.$business)
            ->line("Dobio/la si nalog {$role} u aplikaciji za zakazivanje salona {$business}.")
            ->line('Postavi lozinku i prijavi se svojim email-om.')
            ->action('Postavi lozinku', $url)
            ->line('Link važi 60 minuta. Kasnije možeš da zatražiš novi preko „Zaboravljena lozinka".');
    }
}

<?php

namespace App\Notifications;

use App\Models\Appointment;
use App\Models\BusinessSetting;
use App\Models\User;
use App\Notifications\Channels\WhatsAppChannel;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Queue\SerializesModels;

class ReviewRequestNotification extends Notification implements ShouldQueue
{
    use Queueable, SerializesModels;

    public const TYPE = 'review_request';

    public function __construct(public Appointment $appointment)
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

    public function appointmentId(): int
    {
        return $this->appointment->id;
    }

    public function toMail(User $notifiable): MailMessage
    {
        $business = BusinessSetting::current();

        return (new MailMessage)
            ->subject('Kako je bilo? — '.$business->name)
            ->greeting('Zdravo, '.$notifiable->first_name.'!')
            ->line('Hvala na poseti ('.$this->services().').')
            ->line('Oceni posetu — treba ti pola minuta, a nama mnogo znači.')
            ->action('Oceni posetu', $this->link())
            ->salutation('Pozdrav, '.$business->name);
    }

    public function toWhatsApp(User $notifiable): string
    {
        $business = BusinessSetting::current();

        return "*{$business->name}* — kako je bilo?\nOceni posetu ({$this->services()}): {$this->link()}";
    }

    private function services(): string
    {
        return $this->appointment->loadMissing('items')->items->pluck('name')->join(' + ');
    }

    private function link(): string
    {
        return rtrim(config('app.frontend_url'), '/').'/my-appointments?review='.$this->appointment->id;
    }
}

<?php

namespace App\Notifications;

use App\Models\BusinessSetting;
use App\Models\ChatSession;
use App\Models\User;
use App\Notifications\Channels\WhatsAppChannel;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Str;

class ChatMessageNotification extends Notification implements ShouldQueue
{
    use Queueable, SerializesModels;

    public const TYPE = 'chat_message';

    public function __construct(public ChatSession $session, public array $bodies)
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
        $message = (new MailMessage)
            ->subject('Nova poruka iz salona — '.$business->name)
            ->greeting('Zdravo, '.$notifiable->first_name.'!')
            ->line($business->name.' ti je poslao poruku:');

        foreach ($this->bodies as $body) {
            $message->line('„'.$body.'“');
        }

        return $message
            ->action('Odgovori', $this->link())
            ->salutation('Pozdrav, '.$business->name);
    }

    public function toWhatsApp(User $notifiable): string
    {
        $business = BusinessSetting::current();

        return "*{$business->name}* — nova poruka:\n".Str::limit(implode("\n", $this->bodies), 600)."\nOdgovori: {$this->link()}";
    }

    private function link(): string
    {
        return rtrim(config('app.frontend_url'), '/').'/?chat=1';
    }
}

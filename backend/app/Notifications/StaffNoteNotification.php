<?php

namespace App\Notifications;

use App\Models\BusinessSetting;
use App\Models\StaffNote;
use App\Models\User;
use App\Notifications\Channels\WhatsAppChannel;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Str;

class StaffNoteNotification extends Notification implements ShouldQueue
{
    use Queueable, SerializesModels;

    public const TYPE = 'staff_note';

    public function __construct(public StaffNote $note)
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
            ->subject('Beleška u salonu — '.Str::limit($this->note->body, 50))
            ->greeting('Zdravo '.$notifiable->first_name.',')
            ->line($this->author().' je ostavio/la belešku u salonu '.$business->name.':')
            ->line('„'.$this->note->body.'“')
            ->action('Otvori beleške', $this->link());
    }

    public function toWhatsApp(User $notifiable): string
    {
        $business = BusinessSetting::current();

        return "*{$business->name}* — beleška od {$this->author()}:\n{$this->note->body}\n{$this->link()}";
    }

    private function author(): string
    {
        return $this->note->author ? trim($this->note->author->first_name.' '.$this->note->author->last_name) : 'Neko iz salona';
    }

    private function link(): string
    {
        return rtrim(config('app.frontend_url'), '/').'/admin/notes';
    }
}

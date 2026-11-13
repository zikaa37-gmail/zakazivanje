<?php

namespace App\Notifications;

use App\Models\BusinessSetting;
use App\Models\StaffAbsence;
use App\Models\User;
use App\Notifications\Channels\WhatsAppChannel;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Queue\SerializesModels;

class StaffAbsenceNotification extends Notification implements ShouldQueue
{
    use Queueable, SerializesModels;

    public const REQUESTED = 'absence_requested';

    public const APPROVED = 'absence_approved';

    public const REJECTED = 'absence_rejected';

    public function __construct(public StaffAbsence $absence, public string $type)
    {
        $this->afterCommit();
    }

    public function via(User $notifiable): array
    {
        return $notifiable->notificationChannels(['mail' => 'mail', 'whatsapp' => WhatsAppChannel::class]);
    }

    public function logType(): string
    {
        return $this->type;
    }

    public function toMail(User $notifiable): MailMessage
    {
        $message = (new MailMessage)
            ->subject($this->title().' — '.$this->staffName())
            ->greeting('Zdravo '.$notifiable->first_name.',')
            ->line($this->summary());

        if ($this->absence->note) {
            $message->line('Napomena: '.$this->absence->note);
        }

        return $message
            ->action('Otvori odsustva', $this->link())
            ->salutation(BusinessSetting::current()->name);
    }

    public function toWhatsApp(User $notifiable): string
    {
        return implode("\n", [
            '*'.BusinessSetting::current()->name.'* — '.$this->title(),
            $this->summary(),
            $this->link(),
        ]);
    }

    private function link(): string
    {
        return rtrim(config('app.frontend_url'), '/').'/admin/absences?absence='.$this->absence->id;
    }

    private function title(): string
    {
        return match ($this->type) {
            self::REQUESTED => 'Odsustvo čeka odobrenje',
            self::APPROVED => 'Odsustvo je odobreno',
            self::REJECTED => 'Odsustvo nije odobreno',
        };
    }

    private function summary(): string
    {
        return $this->absence->typeLabel().': '.$this->staffName().', '.$this->absence->periodLabel();
    }

    private function staffName(): string
    {
        $staff = $this->absence->staffMember;

        return $staff ? trim($staff->first_name.' '.$staff->last_name) : '';
    }
}

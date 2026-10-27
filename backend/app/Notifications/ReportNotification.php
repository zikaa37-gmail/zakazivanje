<?php

namespace App\Notifications;

use App\Notifications\Channels\WhatsAppChannel;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ReportNotification extends Notification
{
    public const CHANNEL_MAIL = 'mail';

    public const CHANNEL_WHATSAPP = 'whatsapp';

    public function __construct(
        private readonly array $report,
        private readonly string $channel,
        private readonly string $summary,
        private readonly ?string $pdf = null,
        private readonly ?string $fileName = null,
        private readonly ?string $fileUrl = null,
    ) {}

    public function logType(): string
    {
        return 'report';
    }

    public function via(object $notifiable): array
    {
        return [$this->channel === self::CHANNEL_WHATSAPP ? WhatsAppChannel::class : 'mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $message = (new MailMessage)
            ->subject("{$this->report['title']} — {$this->report['period']['label']}")
            ->greeting('Zdravo, '.$notifiable->first_name.'!')
            ->salutation('Pozdrav, '.$this->report['business']);

        foreach (explode("\n", $this->summary) as $line) {
            $message->line($line);
        }

        return $message
            ->line('Ceo izveštaj je u PDF prilogu.')
            ->attachData($this->pdf, $this->fileName, ['mime' => 'application/pdf']);
    }

    public function toWhatsApp(object $notifiable): string
    {
        return $this->summary.($this->fileUrl ? "\n\nPDF: {$this->fileUrl}" : '');
    }

    public function whatsAppMediaUrl(): ?string
    {
        return $this->fileUrl;
    }
}

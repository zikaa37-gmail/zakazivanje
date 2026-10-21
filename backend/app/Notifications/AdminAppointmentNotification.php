<?php

namespace App\Notifications;

use App\Models\Appointment;
use App\Models\BusinessSetting;
use Illuminate\Bus\Queueable;
use Illuminate\Support\Carbon;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Queue\SerializesModels;

class AdminAppointmentNotification extends Notification implements ShouldQueue
{
    use Queueable, SerializesModels;

    public const NEW_BOOKING = 'admin_new_booking';

    public const CLIENT_CANCELLED = 'admin_client_cancelled';

    public const CLIENT_RESCHEDULED = 'admin_client_rescheduled';

    public function __construct(
        public Appointment $appointment,
        public string $type,
        public ?string $previousStart = null,
    ) {
        $this->afterCommit();
    }

    public function via(object $notifiable): array
    {
        return filled($notifiable->email) ? ['mail'] : [];
    }

    public function logType(): string
    {
        return $this->type;
    }

    public function appointmentId(): int
    {
        return $this->appointment->id;
    }

    public function toMail(object $notifiable): MailMessage
    {
        $a = $this->appointment->loadMissing(['items', 'staffMember', 'client']);
        $client = $a->client;
        $pending = $a->status === Appointment::STATUS_PENDING;

        $title = match ($this->type) {
            self::NEW_BOOKING => $pending ? 'Novi termin čeka potvrdu' : 'Novi termin',
            self::CLIENT_RESCHEDULED => $pending ? 'Klijent je pomerio termin — čeka potvrdu' : 'Klijent je pomerio termin',
            default => 'Klijent je otkazao termin',
        };

        return (new MailMessage)
            ->subject($title.': '.$client->first_name.' '.$client->last_name.', '.$a->starts_at->format('d.m. H:i'))
            ->greeting($title)
            ->line('**'.$a->starts_at->format('d.m.Y. H:i').' – '.$a->ends_at->format('H:i').'**')
            ->line($a->items->pluck('name')->join(' + ').' · '.$a->staffMember?->first_name)
            ->when($this->previousStart, fn ($m) => $m->line('Ranije: '.Carbon::parse($this->previousStart)->format('d.m.Y. H:i')))
            ->line('Klijent: '.$client->first_name.' '.$client->last_name.($client->phone ? ', '.$client->phone : ''))
            ->when($a->note, fn ($m) => $m->line('Napomena: '.$a->note))
            ->action($pending && $this->type !== self::CLIENT_CANCELLED ? 'Potvrdi termin' : 'Otvori termine', rtrim(config('app.frontend_url'), '/').'/admin/appointments')
            ->salutation(BusinessSetting::current()->name);
    }
}

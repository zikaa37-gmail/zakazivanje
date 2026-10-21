<?php

namespace App\Notifications;

use App\Models\Appointment;
use App\Models\BusinessSetting;
use App\Models\User;
use App\Notifications\Channels\WhatsAppChannel;
use App\Support\IcsCalendar;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Queue\SerializesModels;

class AppointmentNotification extends Notification implements ShouldQueue
{
    use Queueable, SerializesModels;

    public const RECEIVED = 'appointment_received';

    public const CONFIRMED = 'appointment_confirmed';

    public const CANCELLED = 'appointment_cancelled';

    public const REMINDER = 'appointment_reminder';

    public const RESCHEDULED = 'appointment_rescheduled';

    public function __construct(
        public Appointment $appointment,
        public string $type,
        public ?string $recurrenceLabel = null,
    ) {
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

    public function appointmentId(): int
    {
        return $this->appointment->id;
    }

    public function toMail(User $notifiable): MailMessage
    {
        $business = BusinessSetting::current();
        $a = $this->appointment->loadMissing(['items', 'staffMember']);

        $message = (new MailMessage)
            ->subject(mb_strtoupper(mb_substr($this->title(), 0, 1)).mb_substr($this->title(), 1).' — '.$business->name)
            ->greeting('Zdravo, '.$notifiable->first_name.'!')
            ->line($this->intro())
            ->line('**'.$this->when().'**')
            ->line($this->services().' · '.$this->staff())
            ->line('Cena: '.$this->money($a->total));

        if ($this->recurrenceLabel) {
            $message->line('Termin se ponavlja '.$this->recurrenceLabel.'.');
        }

        if ($address = trim(implode(', ', array_filter([$business->address, $business->city])))) {
            $message->line('Adresa: '.$address);
        }

        if ($this->type !== self::CANCELLED && $notifiable->password !== null) {
            $message->action('Moji termini', rtrim(config('app.frontend_url'), '/').'/my-appointments');
        }

        if (in_array($this->type, [self::CONFIRMED, self::REMINDER, self::CANCELLED, self::RESCHEDULED], true)) {
            $message->attachData(IcsCalendar::forAppointment($a, $this->type === self::CANCELLED), 'termin.ics', ['mime' => 'text/calendar']);
        }

        $cancellation = $business->cancellation_hours;
        if ($this->type !== self::CANCELLED) {
            $message->line($cancellation > 0
                ? "Ako ne možeš da dođeš, otkaži najkasnije {$cancellation} h pre termina".($business->phone ? ' ili pozovi '.$business->phone : '').'.'
                : 'Ako ne možeš da dođeš, javi nam se.');
        }

        return $message->salutation('Pozdrav, '.$business->name);
    }

    public function toWhatsApp(User $notifiable): string
    {
        $business = BusinessSetting::current();

        return implode("\n", array_filter([
            "*{$business->name}* — {$this->title()}",
            $this->when(),
            $this->services().' · '.$this->staff(),
            $this->recurrenceLabel ? 'Ponavlja se '.$this->recurrenceLabel.'.' : null,
            $this->type === self::RECEIVED ? 'Javićemo ti kad potvrdimo termin.' : null,
        ]));
    }

    private function title(): string
    {
        return match ($this->type) {
            self::RECEIVED => 'termin je primljen',
            self::CONFIRMED => 'termin je potvrđen',
            self::CANCELLED => 'termin je otkazan',
            self::REMINDER => 'podsetnik za termin',
            self::RESCHEDULED => 'termin je pomeren',
        };
    }

    private function intro(): string
    {
        return match ($this->type) {
            self::RECEIVED => 'Primili smo tvoj zahtev za termin. Javićemo ti čim ga potvrdimo.',
            self::CONFIRMED => $this->appointment->source === Appointment::SOURCE_ONLINE ? 'Tvoj termin je potvrđen. Vidimo se!' : 'Zakazali smo ti termin.',
            self::CANCELLED => 'Nažalost, termin je otkazan. Izaberi novi termin kad ti odgovara.',
            self::REMINDER => 'Podsećamo te na termin:',
            self::RESCHEDULED => 'Tvoj termin je pomeren. Novo vreme:',
        };
    }

    private function when(): string
    {
        $days = ['Nedelja', 'Ponedeljak', 'Utorak', 'Sreda', 'Četvrtak', 'Petak', 'Subota'];
        $start = $this->appointment->starts_at;

        return $days[$start->dayOfWeek].', '.$start->format('d.m.Y.').' u '.$start->format('H:i');
    }

    private function services(): string
    {
        return $this->appointment->items->pluck('name')->join(' + ');
    }

    private function staff(): string
    {
        $staff = $this->appointment->staffMember;

        return $staff ? trim($staff->first_name.' '.$staff->last_name) : '';
    }

    private function money(float $amount): string
    {
        return number_format($amount, fmod($amount, 1.0) == 0.0 ? 0 : 2, ',', '.').' din.';
    }
}

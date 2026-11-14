<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\BusinessSetting;
use App\Models\StaffMember;
use App\Models\User;
use App\Notifications\AdminAppointmentNotification;
use App\Notifications\AppointmentNotification;
use App\Notifications\ReviewRequestNotification;
use Illuminate\Support\Facades\Notification;

class AppointmentNotifier
{
    public function __construct(private Realtime $realtime) {}

    public function booked(Appointment $appointment, ?string $recurrenceLabel = null): void
    {
        $settings = BusinessSetting::current();
        $linked = $appointment->linkedSiblings();
        $confirmed = $appointment->status === Appointment::STATUS_CONFIRMED && $linked->every(fn (Appointment $a) => $a->status === Appointment::STATUS_CONFIRMED);

        $online = $appointment->source === Appointment::SOURCE_ONLINE;
        foreach ($linked->concat([$appointment]) as $part) {
            $title = $part->status === Appointment::STATUS_PENDING ? 'Novi zahtev za termin' : 'Novi termin';
            $this->realtime->toStaff($part, 'booked', $online ? $title.': '.$this->realtime->describe($part) : null);
        }
        if (! $online) {
            $this->realtime->toClient($appointment, 'booked', 'Salon ti je zakazao termin: '.$this->realtime->describe($appointment, false));
        }

        if ($confirmed ? $settings->notify_booking_confirmed : $settings->notify_booking_received) {
            $this->toClient($appointment, $confirmed ? AppointmentNotification::CONFIRMED : AppointmentNotification::RECEIVED, $recurrenceLabel);
        }

        if ($appointment->source === Appointment::SOURCE_ONLINE && $settings->notify_admin_new_booking) {
            foreach ($linked->prepend($appointment) as $part) {
                Notification::send($this->salonRecipients($part), new AdminAppointmentNotification($part, AdminAppointmentNotification::NEW_BOOKING));
            }
        }
    }

    public function statusChanged(Appointment $appointment, string $previousStatus): void
    {
        $settings = BusinessSetting::current();
        $confirmedNow = $appointment->status === Appointment::STATUS_CONFIRMED && $previousStatus === Appointment::STATUS_PENDING;
        $this->realtime->toStaff($appointment, 'status');
        $this->realtime->toClient($appointment, 'status', $confirmedNow ? 'Termin je potvrđen: '.$this->realtime->describe($appointment, false) : null);

        if ($appointment->status === Appointment::STATUS_CONFIRMED && $previousStatus === Appointment::STATUS_PENDING && $settings->notify_booking_confirmed) {
            $this->toClient($appointment, AppointmentNotification::CONFIRMED);
        }

        if ($appointment->status === Appointment::STATUS_COMPLETED && $previousStatus !== Appointment::STATUS_COMPLETED) {
            $this->askForReview($appointment, $settings);
        }
    }

    private function askForReview(Appointment $appointment, BusinessSetting $settings): void
    {
        if (! $settings->reviews_enabled || ! $settings->notify_review_request || $appointment->review()->exists()) {
            return;
        }
        $client = User::find($appointment->client_id);
        if ($client && $client->password !== null && $client->notificationChannels(['mail' => 'mail', 'whatsapp' => 'whatsapp']) !== []) {
            $client->notify(new ReviewRequestNotification($appointment));
        }
    }

    public function cancelledBySalon(Appointment $appointment): void
    {
        $this->realtime->toStaff($appointment, 'cancelled');
        if ($appointment->starts_at->isFuture()) {
            $this->realtime->toClient($appointment, 'cancelled', 'Salon je otkazao termin: '.$this->realtime->describe($appointment, false));
        }
        if (BusinessSetting::current()->notify_booking_cancelled && $appointment->starts_at->isFuture()) {
            $this->toClient($appointment, AppointmentNotification::CANCELLED);
        }
    }

    public function cancelledByClient(Appointment $appointment): void
    {
        $this->realtime->toStaff($appointment, 'cancelled', 'Klijent je otkazao termin: '.$this->realtime->describe($appointment));
        if (BusinessSetting::current()->notify_admin_new_booking) {
            Notification::send($this->salonRecipients($appointment), new AdminAppointmentNotification($appointment, AdminAppointmentNotification::CLIENT_CANCELLED));
        }
    }

    public function rescheduled(Appointment $appointment): void
    {
        $this->realtime->toStaff($appointment, 'moved');
        $this->realtime->toClient($appointment, 'moved', 'Salon je pomerio termin: '.$this->realtime->describe($appointment, false));
        if (BusinessSetting::current()->notify_booking_confirmed && $appointment->starts_at->isFuture()) {
            $this->toClient($appointment, AppointmentNotification::RESCHEDULED);
        }
    }

    public function rescheduledByClient(Appointment $appointment, string $previousStart, bool $notifyClient = true): void
    {
        $settings = BusinessSetting::current();
        $pending = $appointment->status === Appointment::STATUS_PENDING;
        $this->realtime->toStaff($appointment, 'moved', 'Klijent je pomerio termin: '.$this->realtime->describe($appointment));

        if ($notifyClient && ($pending ? $settings->notify_booking_received : $settings->notify_booking_confirmed)) {
            $this->toClient($appointment, $pending ? AppointmentNotification::RECEIVED : AppointmentNotification::RESCHEDULED);
        }

        if ($settings->notify_admin_new_booking) {
            Notification::send($this->salonRecipients($appointment), new AdminAppointmentNotification($appointment, AdminAppointmentNotification::CLIENT_RESCHEDULED, $previousStart));
        }
    }

    public function transferred(Appointment $appointment, ?int $previousStaffId, ?User $by = null, bool $timeChanged = false): void
    {
        $previous = StaffMember::find($previousStaffId);
        $this->realtime->toStaff($appointment, 'transferred', 'Termin je prebačen ('.($previous?->first_name ?? '?').' → '.($appointment->staffMember?->first_name ?? '?').'): '.$this->realtime->describe($appointment), [$previousStaffId]);
        $this->realtime->toClient($appointment, 'transferred', 'Termin je prebačen kod: '.$this->realtime->describe($appointment, false));

        if ($appointment->starts_at->isFuture()) {
            $client = User::find($appointment->client_id);
            if ($client && $client->notificationChannels(['mail' => 'mail', 'whatsapp' => 'whatsapp']) !== []) {
                $client->notify(new AppointmentNotification($appointment, AppointmentNotification::TRANSFERRED, null, $previous?->first_name, $timeChanged));
            }
        }

        $recipients = User::where('active', true)
            ->whereNotNull('email')
            ->where(fn ($q) => $q->whereIn('role', [User::ROLE_OWNER, User::ROLE_MANAGER])
                ->orWhereIn('staff_member_id', array_filter([$appointment->staff_member_id, $previousStaffId])))
            ->when($by, fn ($q) => $q->whereKeyNot($by->id))
            ->get();

        Notification::send($recipients, new AdminAppointmentNotification($appointment, AdminAppointmentNotification::TRANSFERRED, null, $previous ? trim($previous->first_name.' '.$previous->last_name) : null));
    }

    public function changedSilently(Appointment $appointment, array $staffIds = []): void
    {
        $this->realtime->toStaff($appointment, 'changed', null, $staffIds);
        $this->realtime->toClient($appointment, 'changed');
    }

    public function rescheduleRequested(Appointment $appointment): void
    {
        $this->realtime->toClient($appointment, 'ask_reschedule', 'Salon te moli da izabereš novi termin: '.$this->realtime->describe($appointment, false));
        $this->toClient($appointment, AppointmentNotification::RESCHEDULE_REQUEST);
    }

    public function reminder(Appointment $appointment): void
    {
        $this->toClient($appointment, AppointmentNotification::REMINDER);
    }

    private function toClient(Appointment $appointment, string $type, ?string $recurrenceLabel = null): void
    {
        $client = User::find($appointment->client_id);

        if ($client && $client->notificationChannels(['mail' => 'mail', 'whatsapp' => 'whatsapp']) !== []) {
            $client->notify(new AppointmentNotification($appointment, $type, $recurrenceLabel));
        }
    }

    private function salonRecipients(Appointment $appointment)
    {
        return User::where('active', true)
            ->whereNotNull('email')
            ->where(fn ($q) => $q->where('role', User::ROLE_OWNER)
                ->orWhere(fn ($q) => $q->whereIn('role', [User::ROLE_MANAGER, User::ROLE_WORKER])->where('staff_member_id', $appointment->staff_member_id)))
            ->get();
    }
}

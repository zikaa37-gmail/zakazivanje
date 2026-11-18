<?php

namespace App\Services;

use App\Enums\UserRole;
use App\Models\Appointment;
use App\Models\BusinessSetting;
use App\Models\StaffMember;
use App\Models\User;
use App\Notifications\AdminAppointmentNotification;
use App\Notifications\AppointmentNotification;
use App\Notifications\ReviewRequestNotification;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Notification;

class AppointmentNotifier
{
    public function __construct(private Realtime $realtime, private Inbox $inbox) {}

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

        $this->toClient(
            $appointment,
            new AppointmentNotification($appointment, $confirmed ? AppointmentNotification::CONFIRMED : AppointmentNotification::RECEIVED, $recurrenceLabel),
            $confirmed ? $settings->notify_booking_confirmed : $settings->notify_booking_received,
        );

        if ($online) {
            foreach ($linked->prepend($appointment) as $part) {
                $this->toSalon($part, new AdminAppointmentNotification($part, AdminAppointmentNotification::NEW_BOOKING), $settings->notify_admin_new_booking);
            }
        }
    }

    public function statusChanged(Appointment $appointment, string $previousStatus): void
    {
        $settings = BusinessSetting::current();
        $confirmedNow = $appointment->status === Appointment::STATUS_CONFIRMED && $previousStatus === Appointment::STATUS_PENDING;
        $this->realtime->toStaff($appointment, 'status');
        $this->realtime->toClient($appointment, 'status', $confirmedNow ? 'Termin je potvrđen: '.$this->realtime->describe($appointment, false) : null);

        if ($confirmedNow) {
            $this->toClient($appointment, new AppointmentNotification($appointment, AppointmentNotification::CONFIRMED), $settings->notify_booking_confirmed);
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
        if ($client && $client->password !== null) {
            $this->toClient($appointment, new ReviewRequestNotification($appointment));
        }
    }

    public function cancelledBySalon(Appointment $appointment): void
    {
        $this->realtime->toStaff($appointment, 'cancelled');
        if ($appointment->starts_at->isFuture()) {
            $this->realtime->toClient($appointment, 'cancelled', 'Salon je otkazao termin: '.$this->realtime->describe($appointment, false));
        }
        if ($appointment->starts_at->isFuture()) {
            $this->toClient($appointment, new AppointmentNotification($appointment, AppointmentNotification::CANCELLED), BusinessSetting::current()->notify_booking_cancelled);
        }
    }

    public function cancelledByClient(Appointment $appointment): void
    {
        $this->realtime->toStaff($appointment, 'cancelled', 'Klijent je otkazao termin: '.$this->realtime->describe($appointment));
        $this->toSalon($appointment, new AdminAppointmentNotification($appointment, AdminAppointmentNotification::CLIENT_CANCELLED), BusinessSetting::current()->notify_admin_new_booking);
    }

    public function rescheduled(Appointment $appointment): void
    {
        $this->realtime->toStaff($appointment, 'moved');
        $this->realtime->toClient($appointment, 'moved', 'Salon je pomerio termin: '.$this->realtime->describe($appointment, false));
        if ($appointment->starts_at->isFuture()) {
            $this->toClient($appointment, new AppointmentNotification($appointment, AppointmentNotification::RESCHEDULED), BusinessSetting::current()->notify_booking_confirmed);
        }
    }

    public function rescheduledByClient(Appointment $appointment, string $previousStart, bool $notifyClient = true): void
    {
        $settings = BusinessSetting::current();
        $pending = $appointment->status === Appointment::STATUS_PENDING;
        $this->realtime->toStaff($appointment, 'moved', 'Klijent je pomerio termin: '.$this->realtime->describe($appointment));

        if ($notifyClient && ($pending ? $settings->notify_booking_received : $settings->notify_booking_confirmed)) {
            $this->toClient($appointment, new AppointmentNotification($appointment, $pending ? AppointmentNotification::RECEIVED : AppointmentNotification::RESCHEDULED));
        }

        $this->toSalon($appointment, new AdminAppointmentNotification($appointment, AdminAppointmentNotification::CLIENT_RESCHEDULED, $previousStart), $settings->notify_admin_new_booking);
    }

    public function transferred(Appointment $appointment, ?int $previousStaffId, ?User $by = null, bool $timeChanged = false): void
    {
        $previous = StaffMember::find($previousStaffId);
        $this->realtime->toStaff($appointment, 'transferred', 'Termin je prebačen ('.($previous?->first_name ?? '?').' → '.($appointment->staffMember?->first_name ?? '?').'): '.$this->realtime->describe($appointment), [$previousStaffId]);
        $this->realtime->toClient($appointment, 'transferred', 'Termin je prebačen kod: '.$this->realtime->describe($appointment, false));

        if ($appointment->starts_at->isFuture()) {
            $this->toClient($appointment, new AppointmentNotification($appointment, AppointmentNotification::TRANSFERRED, null, $previous?->first_name, $timeChanged));
        }

        $recipients = $this->staffInbox($appointment, [$previousStaffId])
            ->reject(fn (User $user) => $by && $user->id === $by->id);
        $notification = new AdminAppointmentNotification($appointment, AdminAppointmentNotification::TRANSFERRED, null, $previous ? trim($previous->first_name.' '.$previous->last_name) : null);

        $this->inbox->deliver($recipients, $notification);
        Notification::send($recipients->filter(fn (User $user) => filled($user->email)), $notification);
    }

    public function changedSilently(Appointment $appointment, array $staffIds = []): void
    {
        $this->realtime->toStaff($appointment, 'changed', null, $staffIds);
        $this->realtime->toClient($appointment, 'changed');
    }

    public function rescheduleRequested(Appointment $appointment): void
    {
        $this->realtime->toClient($appointment, 'ask_reschedule', 'Salon te moli da izabereš novi termin: '.$this->realtime->describe($appointment, false));
        $this->toClient($appointment, new AppointmentNotification($appointment, AppointmentNotification::RESCHEDULE_REQUEST));
    }

    public function reminder(Appointment $appointment): void
    {
        $this->toClient($appointment, new AppointmentNotification($appointment, AppointmentNotification::REMINDER));
    }

    private function toClient(Appointment $appointment, object $notification, bool $send = true): void
    {
        $client = User::find($appointment->client_id);
        if (! $client) {
            return;
        }

        $this->inbox->deliver([$client], $notification);

        if ($send && $client->notificationChannels(['mail' => 'mail', 'whatsapp' => 'whatsapp']) !== []) {
            $client->notify($notification);
        }
    }

    private function toSalon(Appointment $appointment, AdminAppointmentNotification $notification, bool $send): void
    {
        $this->inbox->deliver($this->staffInbox($appointment), $notification);

        if ($send) {
            Notification::send($this->salonRecipients($appointment), $notification);
        }
    }

    private function staffInbox(Appointment $appointment, array $staffIds = []): Collection
    {
        $ids = array_values(array_filter([$appointment->staff_member_id, ...$staffIds]));

        return User::where('active', true)
            ->where(fn ($q) => $q->whereIn('role', [UserRole::Owner, UserRole::Manager])
                ->orWhere(fn ($q) => $q->where('role', UserRole::Worker)->whereIn('staff_member_id', $ids)))
            ->get();
    }

    private function salonRecipients(Appointment $appointment)
    {
        return User::where('active', true)
            ->whereNotNull('email')
            ->where(fn ($q) => $q->where('role', UserRole::Owner)
                ->orWhere(fn ($q) => $q->whereIn('role', [UserRole::Manager, UserRole::Worker])->where('staff_member_id', $appointment->staff_member_id)))
            ->get();
    }
}

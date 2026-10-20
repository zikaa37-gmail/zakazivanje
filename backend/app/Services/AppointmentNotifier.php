<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\BusinessSetting;
use App\Models\User;
use App\Notifications\AdminAppointmentNotification;
use App\Notifications\AppointmentNotification;
use Illuminate\Support\Facades\Notification;

class AppointmentNotifier
{
    public function booked(Appointment $appointment, ?string $recurrenceLabel = null): void
    {
        $settings = BusinessSetting::current();
        $confirmed = $appointment->status === Appointment::STATUS_CONFIRMED;

        if ($confirmed ? $settings->notify_booking_confirmed : $settings->notify_booking_received) {
            $this->toClient($appointment, $confirmed ? AppointmentNotification::CONFIRMED : AppointmentNotification::RECEIVED, $recurrenceLabel);
        }

        if ($appointment->source === Appointment::SOURCE_ONLINE && $settings->notify_admin_new_booking) {
            Notification::send($this->admins(), new AdminAppointmentNotification($appointment, AdminAppointmentNotification::NEW_BOOKING));
        }
    }

    public function statusChanged(Appointment $appointment, string $previousStatus): void
    {
        $settings = BusinessSetting::current();

        if ($appointment->status === Appointment::STATUS_CONFIRMED && $previousStatus === Appointment::STATUS_PENDING && $settings->notify_booking_confirmed) {
            $this->toClient($appointment, AppointmentNotification::CONFIRMED);
        }
    }

    public function cancelledBySalon(Appointment $appointment): void
    {
        if (BusinessSetting::current()->notify_booking_cancelled && $appointment->starts_at->isFuture()) {
            $this->toClient($appointment, AppointmentNotification::CANCELLED);
        }
    }

    public function cancelledByClient(Appointment $appointment): void
    {
        if (BusinessSetting::current()->notify_admin_new_booking) {
            Notification::send($this->admins(), new AdminAppointmentNotification($appointment, AdminAppointmentNotification::CLIENT_CANCELLED));
        }
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

    private function admins()
    {
        return User::where('role', User::ROLE_ADMIN)->where('active', true)->whereNotNull('email')->get();
    }
}

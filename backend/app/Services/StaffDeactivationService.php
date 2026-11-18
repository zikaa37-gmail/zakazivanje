<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\AppointmentRecurrence;
use App\Models\StaffMember;
use Illuminate\Database\Eloquent\Builder;

class StaffDeactivationService
{
    public function __construct(
        private BookingService $bookings,
        private AppointmentNotifier $notifier,
        private WaitlistService $waitlist,
    ) {}

    public function futureAppointments(StaffMember $staff): Builder
    {
        return Appointment::query()
            ->where('staff_member_id', $staff->id)
            ->blocking()
            ->where('starts_at', '>', now());
    }

    public function cancelFuture(StaffMember $staff): int
    {
        $notifiedSeries = [];
        $appointments = $this->futureAppointments($staff)->with(['client', 'items', 'staffMember'])->orderBy('starts_at')->get();

        foreach ($appointments as $appointment) {
            $this->bookings->cancel($appointment, 'admin');
            $series = $appointment->recurrence_id;
            if ($series !== null && isset($notifiedSeries[$series])) {
                $this->notifier->changedSilently($appointment);
            } else {
                $this->notifier->cancelledBySalon($appointment);
                if ($series !== null) {
                    $notifiedSeries[$series] = true;
                }
            }
            $this->waitlist->slotFreed($appointment);
        }

        $this->stopRecurrences($staff);

        return $appointments->count();
    }

    public function stopRecurrences(StaffMember $staff): void
    {
        AppointmentRecurrence::where('staff_member_id', $staff->id)->where('active', true)->update(['active' => false]);
    }
}

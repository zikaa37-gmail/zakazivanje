<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\User;
use Carbon\CarbonImmutable;

class ChangeNoticeService
{
    public const DELAY_MINUTES = 2;

    public function __construct(private AppointmentNotifier $notifier) {}

    public function defer(Appointment $appointment, int $previousStaffId, CarbonImmutable $previousStart, ?User $by): void
    {
        $notice = $appointment->change_notice ?? [
            'staff_member_id' => $previousStaffId,
            'starts_at' => $previousStart->format('Y-m-d H:i'),
        ];

        $appointment->forceFill([
            'change_notice' => [...$notice, 'by' => $by?->id],
            'change_notice_at' => now()->addMinutes(self::DELAY_MINUTES),
        ])->save();
    }

    public function original(Appointment $appointment, int $previousStaffId, CarbonImmutable $previousStart): array
    {
        $notice = $appointment->change_notice;
        if (! $notice) {
            return [$previousStaffId, $previousStart];
        }
        $appointment->forceFill(['change_notice' => null, 'change_notice_at' => null])->save();

        return [(int) $notice['staff_member_id'], CarbonImmutable::parse($notice['starts_at'])];
    }

    public function sendDue(): int
    {
        $sent = 0;
        Appointment::query()
            ->whereNotNull('change_notice_at')
            ->where('change_notice_at', '<=', now())
            ->get()
            ->each(function (Appointment $appointment) use (&$sent) {
                $sent += $this->send($appointment) ? 1 : 0;
            });

        return $sent;
    }

    public function send(Appointment $appointment): bool
    {
        $notice = $appointment->change_notice;
        $appointment->forceFill(['change_notice' => null, 'change_notice_at' => null])->save();

        if (! $notice || ! in_array($appointment->status, Appointment::BLOCKING_STATUSES, true)) {
            return false;
        }

        $staffChanged = (int) $notice['staff_member_id'] !== $appointment->staff_member_id;
        $timeChanged = $notice['starts_at'] !== $appointment->starts_at->format('Y-m-d H:i');

        if ($staffChanged) {
            $this->notifier->transferred($appointment, (int) $notice['staff_member_id'], isset($notice['by']) ? User::find($notice['by']) : null, $timeChanged);

            return true;
        }
        if ($timeChanged) {
            $this->notifier->rescheduled($appointment);

            return true;
        }

        return false;
    }
}

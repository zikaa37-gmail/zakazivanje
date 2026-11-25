<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\BusinessSetting;
use App\Models\Review;
use App\Models\StaffAbsence;
use App\Models\StaffMember;
use Illuminate\Support\Facades\DB;

class StaffDeletionService
{
    public function summary(StaffMember $staff): array
    {
        $appointments = Appointment::where('staff_member_id', $staff->id);

        return [
            'appointments' => (clone $appointments)->count(),
            'paid_appointments' => (clone $appointments)->where('paid_amount', '>', 0)->count(),
            'reviews' => Review::whereIn('appointment_id', (clone $appointments)->select('id'))->count(),
            'absences' => StaffAbsence::where('staff_member_id', $staff->id)->count(),
            'has_account' => $staff->account()->exists(),
        ];
    }

    public function delete(StaffMember $staff): void
    {
        DB::transaction(function () use ($staff) {
            $account = $staff->account()->first();

            Appointment::where('staff_member_id', $staff->id)->delete();
            $staff->delete();

            if ($account) {
                $settings = BusinessSetting::current();
                $ids = collect($settings->note_always_notify_ids ?? [])->reject(fn ($id) => (int) $id === $account->id)->values()->all();
                $settings->forceFill(['note_always_notify_ids' => $ids])->save();
                $account->delete();
            }
        });
    }
}

<?php

namespace App\Services;

use App\Models\StaffMember;
use App\Models\User;
use App\Notifications\StaffInviteNotification;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\ValidationException;

class StaffAccountService
{
    public function sync(StaffMember $staff): ?User
    {
        $account = $staff->account()->first();

        if (blank($staff->email)) {
            if ($account?->role === User::ROLE_WORKER) {
                $this->deactivate($account);
            }

            return $account;
        }

        $sameEmail = User::where('email', $staff->email)->first();
        if ($sameEmail && $sameEmail->id !== $account?->id) {
            if ($sameEmail->role === User::ROLE_CLIENT || $sameEmail->staff_member_id !== null) {
                throw ValidationException::withMessages(['email' => ['Ovaj email već koristi drugi nalog.']]);
            }
            $account?->forceFill(['staff_member_id' => null])->save();
            if ($account?->role === User::ROLE_WORKER) {
                $this->deactivate($account);
            }
            $account = $sameEmail;
        }

        $account ??= new User(['role' => User::ROLE_WORKER]);
        $account->fill([
            'first_name' => $staff->first_name,
            'last_name' => $staff->last_name,
            'email' => $staff->email,
            'phone' => $account->phone ?? $staff->phone,
        ]);
        $account->staff_member_id = $staff->id;
        if ($account->role === User::ROLE_WORKER) {
            $account->active = $staff->active;
        }
        $account->save();

        if (! $account->active) {
            $account->refreshTokens()->update(['revoked_at' => now()]);
        }

        return $account;
    }

    public function invite(User $user): void
    {
        $user->notify(new StaffInviteNotification(Password::broker()->createToken($user)));
    }

    private function deactivate(User $account): void
    {
        $account->forceFill(['active' => false])->save();
        $account->refreshTokens()->update(['revoked_at' => now()]);
    }
}

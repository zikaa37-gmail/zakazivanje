<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $accounts = DB::table('users')
            ->whereIn('role', ['owner', 'manager', 'worker'])
            ->whereNull('staff_member_id')
            ->orderBy('id')
            ->get();

        foreach ($accounts as $account) {
            $memberId = DB::table('staff_members')
                ->where('email', $account->email)
                ->whereNotExists(fn ($q) => $q->select(DB::raw(1))->from('users')->whereColumn('users.staff_member_id', 'staff_members.id'))
                ->value('id');

            $memberId ??= DB::table('staff_members')->insertGetId([
                'first_name' => $account->first_name,
                'last_name' => $account->last_name,
                'email' => $account->email,
                'phone' => $account->phone,
                'active' => $account->active,
                'sort_order' => (int) DB::table('staff_members')->max('sort_order') + 1,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            DB::table('users')->where('id', $account->id)->update(['staff_member_id' => $memberId]);
        }
    }

    public function down(): void {}
};

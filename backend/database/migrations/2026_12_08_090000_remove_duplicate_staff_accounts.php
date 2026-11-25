<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $removed = DB::table('users')
            ->where('email', 'devtestzikaa+vuk@gmail.com')
            ->whereIn('role', ['owner', 'manager'])
            ->whereNull('staff_member_id')
            ->value('id');

        if ($removed) {
            DB::table('refresh_tokens')->where('user_id', $removed)->delete();
            DB::table('users')->where('id', $removed)->delete();
        }

        $duplicate = DB::table('users')
            ->where('email', 'luka@fiskultura.rs')
            ->whereIn('role', ['owner', 'manager'])
            ->whereNull('staff_member_id')
            ->value('id');

        if ($duplicate) {
            DB::table('users')->where('id', $duplicate)->update(['active' => false]);
            DB::table('refresh_tokens')->where('user_id', $duplicate)->whereNull('revoked_at')->update(['revoked_at' => now()]);
        }
    }

    public function down(): void {}
};

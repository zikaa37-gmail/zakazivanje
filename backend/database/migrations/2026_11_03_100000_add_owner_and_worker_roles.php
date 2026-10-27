<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('staff_member_id')->nullable()->unique()->after('favorite_staff_member_id')->constrained('staff_members')->nullOnDelete();
        });

        DB::table('users')->where('role', 'admin')->update(['role' => 'owner']);

        foreach (DB::table('staff_members')->whereNotNull('email')->where('email', '!=', '')->get() as $staff) {
            $existing = DB::table('users')->where('email', $staff->email)->first();
            if ($existing) {
                if ($existing->role === 'owner') {
                    DB::table('users')->where('id', $existing->id)->update(['staff_member_id' => $staff->id]);
                }

                continue;
            }
            DB::table('users')->insert([
                'first_name' => $staff->first_name,
                'last_name' => $staff->last_name,
                'email' => $staff->email,
                'phone' => $staff->phone,
                'role' => 'worker',
                'staff_member_id' => $staff->id,
                'active' => $staff->active,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        DB::table('users')->where('role', 'worker')->delete();
        DB::table('users')->where('role', 'owner')->update(['role' => 'admin']);

        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('staff_member_id');
        });
    }
};

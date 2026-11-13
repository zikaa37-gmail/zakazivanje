<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('staff_absences', function (Blueprint $table) {
            $table->engine('InnoDB');
            $table->id();
            $table->foreignId('staff_member_id')->constrained()->cascadeOnDelete();
            $table->date('starts_on');
            $table->date('ends_on');
            $table->string('type', 20)->default('sick');
            $table->string('note', 500)->nullable();
            $table->string('status', 20)->default('pending');
            $table->foreignId('requested_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('decided_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('decided_at')->nullable();
            $table->foreignId('blocked_time_id')->nullable()->constrained('blocked_times')->nullOnDelete();
            $table->timestamps();
            $table->index(['status', 'starts_on']);
        });

        Schema::table('appointments', function (Blueprint $table) {
            $table->string('free_change_reason', 30)->nullable()->after('cancelled_by');
        });
    }

    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropColumn('free_change_reason');
        });
        Schema::dropIfExists('staff_absences');
    }
};

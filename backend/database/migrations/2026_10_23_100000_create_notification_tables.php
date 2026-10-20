<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('business_settings', function (Blueprint $table) {
            $table->boolean('notify_booking_received')->default(true);
            $table->boolean('notify_booking_confirmed')->default(true);
            $table->boolean('notify_booking_cancelled')->default(true);
            $table->unsignedSmallInteger('reminder_hours')->default(24);
            $table->boolean('notify_admin_new_booking')->default(true);
        });

        Schema::table('appointments', function (Blueprint $table) {
            $table->timestamp('reminder_sent_at')->nullable();
        });

        Schema::create('notification_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('appointment_id')->nullable()->constrained('appointments')->nullOnDelete();
            $table->string('type', 40);
            $table->string('channel', 20);
            $table->string('recipient')->nullable();
            $table->string('status', 20);
            $table->string('error')->nullable();
            $table->timestamp('created_at')->useCurrent()->index();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notification_logs');

        Schema::table('appointments', function (Blueprint $table) {
            $table->dropColumn('reminder_sent_at');
        });

        Schema::table('business_settings', function (Blueprint $table) {
            $table->dropColumn(['notify_booking_received', 'notify_booking_confirmed', 'notify_booking_cancelled', 'reminder_hours', 'notify_admin_new_booking']);
        });
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('business_settings', function (Blueprint $table) {
            $table->unsignedSmallInteger('slot_interval_minutes')->default(15);
            $table->unsignedSmallInteger('booking_lead_minutes')->default(60);
            $table->unsignedSmallInteger('booking_horizon_days')->default(60);
            $table->unsignedSmallInteger('cancellation_hours')->default(24);
            $table->boolean('allow_guest_booking')->default(true);
        });

        Schema::create('appointment_recurrences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('staff_member_id')->constrained('staff_members')->cascadeOnDelete();
            $table->json('service_ids');
            $table->unsignedTinyInteger('weekday');
            $table->time('start_time');
            $table->unsignedTinyInteger('interval_weeks')->default(1);
            $table->date('starts_on');
            $table->date('ends_on')->nullable();
            $table->date('generated_until')->nullable();
            $table->json('skipped_dates')->nullable();
            $table->text('note')->nullable();
            $table->boolean('active')->default(true);
            $table->timestamps();
        });

        Schema::create('appointments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('staff_member_id')->constrained('staff_members')->cascadeOnDelete();
            $table->foreignId('recurrence_id')->nullable()->constrained('appointment_recurrences')->nullOnDelete();
            $table->dateTime('starts_at');
            $table->dateTime('ends_at');
            $table->string('status', 20)->index();
            $table->string('source', 20)->default('online');
            $table->decimal('price', 10, 2)->default(0);
            $table->decimal('discount', 10, 2)->default(0);
            $table->decimal('total', 10, 2)->default(0);
            $table->text('note')->nullable();
            $table->text('admin_note')->nullable();
            $table->timestamp('confirmed_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->string('cancelled_by', 20)->nullable();
            $table->timestamps();
            $table->index(['staff_member_id', 'starts_at']);
            $table->index(['client_id', 'starts_at']);
        });

        Schema::create('appointment_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('appointment_id')->constrained('appointments')->cascadeOnDelete();
            $table->foreignId('service_id')->nullable()->constrained('services')->nullOnDelete();
            $table->foreignId('promotion_id')->nullable()->constrained('promotions')->nullOnDelete();
            $table->string('name', 150);
            $table->unsignedSmallInteger('duration_minutes');
            $table->decimal('price', 10, 2);
            $table->decimal('discount', 10, 2)->default(0);
            $table->string('promotion_name', 150)->nullable();
        });

        Schema::create('blocked_times', function (Blueprint $table) {
            $table->id();
            $table->foreignId('staff_member_id')->nullable()->constrained('staff_members')->cascadeOnDelete();
            $table->dateTime('starts_at');
            $table->dateTime('ends_at');
            $table->string('reason', 150)->nullable();
            $table->timestamps();
            $table->index(['starts_at', 'ends_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('blocked_times');
        Schema::dropIfExists('appointment_items');
        Schema::dropIfExists('appointments');
        Schema::dropIfExists('appointment_recurrences');

        Schema::table('business_settings', function (Blueprint $table) {
            $table->dropColumn(['slot_interval_minutes', 'booking_lead_minutes', 'booking_horizon_days', 'cancellation_hours', 'allow_guest_booking']);
        });
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('business_settings', function (Blueprint $table) {
            $table->boolean('cancellation_fee_enabled')->default(false);
            $table->unsignedTinyInteger('cancellation_free_late')->default(2);
            $table->unsignedSmallInteger('cancellation_fee_window_days')->default(365);
            $table->string('cancellation_fee_type', 20)->default('percent');
            $table->decimal('cancellation_fee_value', 10, 2)->default(50);
            $table->text('cancellation_fee_note')->nullable();
        });

        Schema::table('services', function (Blueprint $table) {
            $table->string('cancellation_fee_type', 20)->nullable();
            $table->decimal('cancellation_fee_value', 10, 2)->nullable();
            $table->unsignedTinyInteger('cancellation_free_late')->nullable();
        });

        Schema::table('users', function (Blueprint $table) {
            $table->string('cancellation_discount_type', 20)->nullable();
            $table->decimal('cancellation_discount_value', 10, 2)->nullable();
        });

        Schema::create('cancellation_fees', function (Blueprint $table) {
            $table->engine('InnoDB');
            $table->id();
            $table->foreignId('appointment_id')->constrained()->cascadeOnDelete();
            $table->foreignId('client_id')->constrained('users')->cascadeOnDelete();
            $table->unsignedSmallInteger('late_number');
            $table->decimal('base_amount', 10, 2)->default(0);
            $table->decimal('amount', 10, 2)->default(0);
            $table->string('status', 20);
            $table->string('reason', 255)->nullable();
            $table->foreignId('decided_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('paid_at')->nullable();
            $table->string('payment_method', 20)->nullable();
            $table->timestamps();
            $table->index(['client_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cancellation_fees');
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['cancellation_discount_type', 'cancellation_discount_value']);
        });
        Schema::table('services', function (Blueprint $table) {
            $table->dropColumn(['cancellation_fee_type', 'cancellation_fee_value', 'cancellation_free_late']);
        });
        Schema::table('business_settings', function (Blueprint $table) {
            $table->dropColumn(['cancellation_fee_enabled', 'cancellation_free_late', 'cancellation_fee_window_days', 'cancellation_fee_type', 'cancellation_fee_value', 'cancellation_fee_note']);
        });
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('business_settings', function (Blueprint $table) {
            $table->unsignedTinyInteger('booking_min_days_ahead')->default(1);
            $table->unsignedTinyInteger('cancellation_days_before')->default(1);
        });

        Schema::table('business_settings', function (Blueprint $table) {
            $table->dropColumn('cancellation_hours');
        });
    }

    public function down(): void
    {
        Schema::table('business_settings', function (Blueprint $table) {
            $table->unsignedSmallInteger('cancellation_hours')->default(24);
        });

        Schema::table('business_settings', function (Blueprint $table) {
            $table->dropColumn(['booking_min_days_ahead', 'cancellation_days_before']);
        });
    }
};

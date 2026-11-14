<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->uuid('link_group')->nullable()->index();
        });

        Schema::table('business_settings', function (Blueprint $table) {
            $table->boolean('linked_booking_enabled')->default(true);
        });
    }

    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropIndex(['link_group']);
            $table->dropColumn('link_group');
        });

        Schema::table('business_settings', function (Blueprint $table) {
            $table->dropColumn('linked_booking_enabled');
        });
    }
};

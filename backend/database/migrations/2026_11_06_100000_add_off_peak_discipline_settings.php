<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('business_settings', function (Blueprint $table) {
            $table->boolean('discipline_yellow_off_peak')->default(true);
            $table->unsignedTinyInteger('discipline_off_peak_percent')->default(40);
        });
    }

    public function down(): void
    {
        Schema::table('business_settings', function (Blueprint $table) {
            $table->dropColumn(['discipline_yellow_off_peak', 'discipline_off_peak_percent']);
        });
    }
};

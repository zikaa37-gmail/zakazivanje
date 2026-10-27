<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('business_settings', function (Blueprint $table) {
            $table->boolean('report_auto_enabled')->default(false);
            $table->boolean('report_auto_daily')->default(true);
            $table->boolean('report_auto_weekly')->default(true);
            $table->boolean('report_auto_monthly')->default(true);
            $table->string('report_auto_channel', 20)->default('mail');
        });
    }

    public function down(): void
    {
        Schema::table('business_settings', function (Blueprint $table) {
            $table->dropColumn(['report_auto_enabled', 'report_auto_daily', 'report_auto_weekly', 'report_auto_monthly', 'report_auto_channel']);
        });
    }
};

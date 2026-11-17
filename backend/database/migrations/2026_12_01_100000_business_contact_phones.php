<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('business_settings', function (Blueprint $table) {
            $table->renameColumn('whatsapp_number', 'mobile_phone');
        });
        Schema::table('business_settings', function (Blueprint $table) {
            $table->string('messaging_phone', 10)->default('mobile')->after('mobile_phone');
            $table->dropColumn('website');
        });
    }

    public function down(): void
    {
        Schema::table('business_settings', function (Blueprint $table) {
            $table->renameColumn('mobile_phone', 'whatsapp_number');
        });
        Schema::table('business_settings', function (Blueprint $table) {
            $table->dropColumn('messaging_phone');
            $table->string('website')->nullable();
        });
    }
};

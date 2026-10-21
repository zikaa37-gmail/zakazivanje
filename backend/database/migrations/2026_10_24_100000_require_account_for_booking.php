<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('business_settings', function (Blueprint $table) {
            $table->boolean('allow_guest_booking')->default(false)->change();
        });

        DB::table('business_settings')->update(['allow_guest_booking' => false]);
    }

    public function down(): void
    {
        Schema::table('business_settings', function (Blueprint $table) {
            $table->boolean('allow_guest_booking')->default(true)->change();
        });
    }
};

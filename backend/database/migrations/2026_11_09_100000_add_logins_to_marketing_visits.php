<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('marketing_visits', function (Blueprint $table) {
            $table->unsignedInteger('logins')->default(0)->after('visits');
        });
    }

    public function down(): void
    {
        Schema::table('marketing_visits', function (Blueprint $table) {
            $table->dropColumn('logins');
        });
    }
};

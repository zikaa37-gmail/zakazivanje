<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('promotions', function (Blueprint $table) {
            $table->string('code', 40)->nullable()->unique()->after('name');
            $table->unsignedInteger('max_uses')->nullable()->after('weekdays');
            $table->boolean('once_per_client')->default(false)->after('max_uses');
        });
    }

    public function down(): void
    {
        Schema::table('promotions', function (Blueprint $table) {
            $table->dropUnique(['code']);
            $table->dropColumn(['code', 'max_uses', 'once_per_client']);
        });
    }
};

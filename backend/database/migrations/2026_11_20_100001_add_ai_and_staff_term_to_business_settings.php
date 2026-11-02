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
            $table->string('staff_term', 40)->nullable()->after('category');
            $table->string('staff_term_genitive', 40)->nullable()->after('staff_term');
            $table->boolean('ai_enabled')->default(false);
            $table->text('ai_api_key')->nullable();
        });

        DB::table('business_settings')->update(['staff_term' => 'frizer', 'staff_term_genitive' => 'frizera']);
    }

    public function down(): void
    {
        Schema::table('business_settings', function (Blueprint $table) {
            $table->dropColumn(['staff_term', 'staff_term_genitive', 'ai_enabled', 'ai_api_key']);
        });
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('services', function (Blueprint $table) {
            $table->unsignedSmallInteger('processing_after_minutes')->nullable()->after('duration_minutes');
            $table->unsignedSmallInteger('processing_minutes')->nullable()->after('processing_after_minutes');
        });

        Schema::table('appointments', function (Blueprint $table) {
            $table->unsignedSmallInteger('processing_offset')->nullable()->after('ends_at');
            $table->unsignedSmallInteger('processing_minutes')->nullable()->after('processing_offset');
        });
    }

    public function down(): void
    {
        Schema::table('services', function (Blueprint $table) {
            $table->dropColumn(['processing_after_minutes', 'processing_minutes']);
        });

        Schema::table('appointments', function (Blueprint $table) {
            $table->dropColumn(['processing_offset', 'processing_minutes']);
        });
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('staff_notes', function (Blueprint $table) {
            $table->foreignId('taken_by')->nullable()->after('body')->constrained('users')->nullOnDelete();
            $table->timestamp('taken_at')->nullable()->after('taken_by');
        });
    }

    public function down(): void
    {
        Schema::table('staff_notes', function (Blueprint $table) {
            $table->dropConstrainedForeignId('taken_by');
            $table->dropColumn('taken_at');
        });
    }
};

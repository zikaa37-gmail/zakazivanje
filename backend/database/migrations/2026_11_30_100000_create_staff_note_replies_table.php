<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('staff_note_replies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('staff_note_id')->constrained('staff_notes')->cascadeOnDelete();
            $table->foreignId('author_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('body');
            $table->timestamps();
        });

        Schema::table('staff_notes', function (Blueprint $table) {
            $table->timestamp('last_reply_at')->nullable()->after('resolved_by');
        });
    }

    public function down(): void
    {
        Schema::table('staff_notes', function (Blueprint $table) {
            $table->dropColumn('last_reply_at');
        });
        Schema::dropIfExists('staff_note_replies');
    }
};

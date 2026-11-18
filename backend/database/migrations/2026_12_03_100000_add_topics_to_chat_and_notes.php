<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('chat_sessions', function (Blueprint $table) {
            $table->string('subject', 150)->nullable()->after('appointment_id');
            $table->timestamp('expires_at')->nullable()->change();
        });
        DB::table('chat_sessions')->whereNull('closed_at')->where('expires_at', '<=', now())->update(['closed_at' => DB::raw('expires_at')]);
        DB::table('chat_sessions')->update(['expires_at' => null]);

        Schema::table('staff_notes', function (Blueprint $table) {
            $table->string('title', 150)->nullable()->after('author_id');
        });
        DB::table('staff_notes')->select(['id', 'body'])->orderBy('id')->each(function ($note) {
            $first = trim(strtok($note->body, "\n") ?: $note->body);
            DB::table('staff_notes')->where('id', $note->id)->update(['title' => Str::limit($first, 60)]);
        });
    }

    public function down(): void
    {
        Schema::table('staff_notes', function (Blueprint $table) {
            $table->dropColumn('title');
        });
        Schema::table('chat_sessions', function (Blueprint $table) {
            $table->dropColumn('subject');
        });
    }
};

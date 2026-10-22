<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('waitlist_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('staff_member_id')->nullable()->constrained()->nullOnDelete();
            $table->date('date');
            $table->string('part', 10)->default('any');
            $table->json('service_ids');
            $table->timestamp('notified_at')->nullable();
            $table->timestamp('fulfilled_at')->nullable();
            $table->timestamps();
            $table->index(['date', 'fulfilled_at']);
        });

        Schema::table('business_settings', function (Blueprint $table) {
            $table->boolean('waitlist_enabled')->default(true);
        });
    }

    public function down(): void
    {
        Schema::table('business_settings', function (Blueprint $table) {
            $table->dropColumn('waitlist_enabled');
        });

        Schema::dropIfExists('waitlist_entries');
    }
};

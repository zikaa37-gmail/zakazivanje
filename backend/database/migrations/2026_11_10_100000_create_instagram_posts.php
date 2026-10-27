<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('instagram_posts', function (Blueprint $table) {
            $table->id();
            $table->string('kind', 10);
            $table->string('source', 20)->default('manual');
            $table->text('caption')->nullable();
            $table->longText('image')->nullable();
            $table->string('token', 40)->unique();
            $table->string('status', 20)->index();
            $table->dateTime('scheduled_at')->index();
            $table->dateTime('published_at')->nullable();
            $table->string('media_id')->nullable();
            $table->string('permalink')->nullable();
            $table->text('error')->nullable();
            $table->json('slots')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::table('business_settings', function (Blueprint $table) {
            $table->string('instagram_user_id')->nullable();
            $table->boolean('instagram_publishing_enabled')->default(false);
            $table->boolean('instagram_free_slots_enabled')->default(false);
            $table->json('instagram_free_slots_days')->nullable();
            $table->string('instagram_free_slots_time', 5)->default('09:00');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('instagram_posts');

        Schema::table('business_settings', function (Blueprint $table) {
            $table->dropColumn(['instagram_user_id', 'instagram_publishing_enabled', 'instagram_free_slots_enabled', 'instagram_free_slots_days', 'instagram_free_slots_time']);
        });
    }
};

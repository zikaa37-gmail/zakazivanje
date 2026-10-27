<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('gallery_images', function (Blueprint $table) {
            $table->string('kind', 10)->default('work')->after('service_id');
            $table->boolean('featured')->default(false)->after('kind');
        });

        Schema::table('business_settings', function (Blueprint $table) {
            $table->string('map_query', 255)->nullable();
            $table->boolean('instagram_feed_enabled')->default(false);
            $table->text('instagram_token')->nullable();
            $table->string('instagram_username', 100)->nullable();
            $table->timestamp('instagram_token_expires_at')->nullable();
        });

        Schema::table('users', function (Blueprint $table) {
            $table->string('signup_source', 30)->nullable();
            $table->string('signup_campaign', 60)->nullable();
        });

        Schema::table('appointments', function (Blueprint $table) {
            $table->string('referral_source', 30)->nullable();
            $table->string('referral_campaign', 60)->nullable();
        });

        Schema::create('marketing_visits', function (Blueprint $table) {
            $table->id();
            $table->date('visited_on');
            $table->string('source', 30);
            $table->string('campaign', 60)->default('');
            $table->unsignedInteger('visits')->default(0);
            $table->unique(['visited_on', 'source', 'campaign']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('marketing_visits');
        Schema::table('appointments', fn (Blueprint $table) => $table->dropColumn(['referral_source', 'referral_campaign']));
        Schema::table('users', fn (Blueprint $table) => $table->dropColumn(['signup_source', 'signup_campaign']));
        Schema::table('business_settings', fn (Blueprint $table) => $table->dropColumn(['map_query', 'instagram_feed_enabled', 'instagram_token', 'instagram_username', 'instagram_token_expires_at']));
        Schema::table('gallery_images', fn (Blueprint $table) => $table->dropColumn(['kind', 'featured']));
    }
};

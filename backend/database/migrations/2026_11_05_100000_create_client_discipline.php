<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('discipline_zone', 10)->default('green')->index()->after('role');
            $table->decimal('discipline_points', 6, 1)->default(0)->after('discipline_zone');
            $table->boolean('zone_manual')->default(false)->after('discipline_points');
            $table->date('zone_until')->nullable()->after('zone_manual');
            $table->string('zone_reason')->nullable()->after('zone_until');
            $table->timestamp('zone_changed_at')->nullable()->after('zone_reason');
        });

        Schema::create('client_activity_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('type', 40);
            $table->json('data')->nullable();
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('ip', 45)->nullable();
            $table->string('user_agent')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->index(['user_id', 'created_at']);
        });

        Schema::table('business_settings', function (Blueprint $table) {
            $table->boolean('discipline_enabled')->default(true);
            $table->unsignedSmallInteger('discipline_window_days')->default(90);
            $table->decimal('discipline_cancel_points', 4, 1)->default(1);
            $table->decimal('discipline_late_cancel_points', 4, 1)->default(2);
            $table->decimal('discipline_no_show_points', 4, 1)->default(3);
            $table->decimal('discipline_yellow_points', 5, 1)->default(3);
            $table->decimal('discipline_orange_points', 5, 1)->default(6);
            $table->decimal('discipline_red_points', 5, 1)->default(10);
            $table->boolean('discipline_auto_suspend')->default(false);
            $table->unsignedSmallInteger('discipline_yellow_min_days')->default(3);
            $table->unsignedSmallInteger('discipline_yellow_horizon_days')->default(7);
        });
    }

    public function down(): void
    {
        Schema::table('business_settings', function (Blueprint $table) {
            $table->dropColumn([
                'discipline_enabled', 'discipline_window_days', 'discipline_cancel_points', 'discipline_late_cancel_points',
                'discipline_no_show_points', 'discipline_yellow_points', 'discipline_orange_points', 'discipline_red_points',
                'discipline_auto_suspend', 'discipline_yellow_min_days', 'discipline_yellow_horizon_days',
            ]);
        });

        Schema::dropIfExists('client_activity_logs');

        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['discipline_zone']);
            $table->dropColumn(['discipline_zone', 'discipline_points', 'zone_manual', 'zone_until', 'zone_reason', 'zone_changed_at']);
        });
    }
};

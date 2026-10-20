<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('staff_members', function (Blueprint $table) {
            $table->id();
            $table->string('first_name', 100);
            $table->string('last_name', 100);
            $table->string('title', 100)->nullable();
            $table->string('phone', 30)->nullable();
            $table->string('email')->nullable();
            $table->string('color', 7)->nullable();
            $table->string('booking_confirmation', 20)->nullable();
            $table->longText('avatar')->nullable();
            $table->boolean('active')->default(true);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('staff_working_hours', function (Blueprint $table) {
            $table->id();
            $table->foreignId('staff_member_id')->constrained('staff_members')->cascadeOnDelete();
            $table->unsignedTinyInteger('weekday');
            $table->time('starts_at');
            $table->time('ends_at');
            $table->timestamps();
            $table->index(['staff_member_id', 'weekday']);
        });

        Schema::create('services', function (Blueprint $table) {
            $table->id();
            $table->string('name', 150);
            $table->text('description')->nullable();
            $table->string('category', 100)->nullable();
            $table->unsignedSmallInteger('duration_minutes');
            $table->decimal('price', 10, 2);
            $table->boolean('active')->default(true);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('service_staff_member', function (Blueprint $table) {
            $table->foreignId('service_id')->constrained('services')->cascadeOnDelete();
            $table->foreignId('staff_member_id')->constrained('staff_members')->cascadeOnDelete();
            $table->primary(['service_id', 'staff_member_id']);
        });

        Schema::create('promotions', function (Blueprint $table) {
            $table->id();
            $table->string('name', 150);
            $table->string('type', 30)->index();
            $table->text('description')->nullable();
            $table->decimal('discount_percent', 5, 2)->nullable();
            $table->decimal('discount_amount', 10, 2)->nullable();
            $table->decimal('package_price', 10, 2)->nullable();
            $table->unsignedTinyInteger('buy_quantity')->nullable();
            $table->unsignedTinyInteger('free_quantity')->nullable();
            $table->unsignedSmallInteger('loyalty_visits')->nullable();
            $table->date('starts_on')->nullable();
            $table->date('ends_on')->nullable();
            $table->json('weekdays')->nullable();
            $table->boolean('active')->default(true);
            $table->timestamps();
        });

        Schema::create('promotion_service', function (Blueprint $table) {
            $table->foreignId('promotion_id')->constrained('promotions')->cascadeOnDelete();
            $table->foreignId('service_id')->constrained('services')->cascadeOnDelete();
            $table->unsignedTinyInteger('quantity')->default(1);
            $table->primary(['promotion_id', 'service_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('promotion_service');
        Schema::dropIfExists('promotions');
        Schema::dropIfExists('service_staff_member');
        Schema::dropIfExists('services');
        Schema::dropIfExists('staff_working_hours');
        Schema::dropIfExists('staff_members');
    }
};

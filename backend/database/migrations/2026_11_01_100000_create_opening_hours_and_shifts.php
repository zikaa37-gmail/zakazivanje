<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('opening_hours', function (Blueprint $table) {
            $table->id();
            $table->unsignedTinyInteger('weekday')->unique();
            $table->time('opens_at')->nullable();
            $table->time('closes_at')->nullable();
            $table->timestamps();
        });

        Schema::create('shifts', function (Blueprint $table) {
            $table->id();
            $table->string('name', 50);
            $table->time('starts_at');
            $table->time('ends_at');
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::table('staff_members', function (Blueprint $table) {
            $table->unsignedTinyInteger('rotation_weeks')->default(1);
            $table->date('rotation_starts_on')->nullable();
        });

        Schema::table('staff_working_hours', function (Blueprint $table) {
            $table->unsignedTinyInteger('week')->default(0)->after('weekday');
        });

        $now = now();
        DB::table('opening_hours')->insert(collect(range(1, 7))->map(fn ($day) => [
            'weekday' => $day,
            'opens_at' => $day === 7 ? null : '08:00',
            'closes_at' => $day === 7 ? null : '20:00',
            'created_at' => $now,
            'updated_at' => $now,
        ])->all());

        DB::table('shifts')->insert([
            ['name' => 'Pre podne', 'starts_at' => '08:00', 'ends_at' => '14:00', 'sort_order' => 0, 'created_at' => $now, 'updated_at' => $now],
            ['name' => 'Popodne', 'starts_at' => '14:00', 'ends_at' => '20:00', 'sort_order' => 1, 'created_at' => $now, 'updated_at' => $now],
            ['name' => 'Ceo dan', 'starts_at' => '08:00', 'ends_at' => '20:00', 'sort_order' => 2, 'created_at' => $now, 'updated_at' => $now],
        ]);
    }

    public function down(): void
    {
        Schema::table('staff_working_hours', function (Blueprint $table) {
            $table->dropColumn('week');
        });

        Schema::table('staff_members', function (Blueprint $table) {
            $table->dropColumn(['rotation_weeks', 'rotation_starts_on']);
        });

        Schema::dropIfExists('shifts');
        Schema::dropIfExists('opening_hours');
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('business_settings', function (Blueprint $table) {
            $table->id();
            $table->string('name', 200);
            $table->string('category', 50)->default('other');
            $table->text('description')->nullable();
            $table->string('address')->nullable();
            $table->string('city', 100)->nullable();
            $table->string('phone', 30)->nullable();
            $table->string('whatsapp_number', 30)->nullable();
            $table->string('email')->nullable();
            $table->string('website')->nullable();
            $table->string('instagram')->nullable();
            $table->string('pib', 20)->nullable();
            $table->string('registration_number', 50)->nullable();
            $table->longText('logo')->nullable();
            $table->timestamps();
        });

        DB::table('business_settings')->insert([
            'name' => 'Zakazivanje',
            'category' => 'other',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('business_settings');
    }
};

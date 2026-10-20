<?php

namespace Database\Seeders;

use App\Models\BusinessSetting;
use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        User::factory()->create([
            'first_name' => 'Admin',
            'last_name' => 'Zakazivanje',
            'email' => 'admin@zakazivanje.test',
            'role' => User::ROLE_ADMIN,
        ]);

        BusinessSetting::current()->update([
            'name' => 'Salon Lepota',
            'category' => 'beauty_salon',
            'address' => 'Glavna 1',
            'city' => 'Beograd',
            'phone' => '+381 60 123 4567',
            'email' => 'zakazivanje@fiskultura.rs',
        ]);

        User::factory()->create([
            'first_name' => 'Marija',
            'last_name' => 'Marković',
            'email' => 'klijent@zakazivanje.test',
        ]);
    }
}

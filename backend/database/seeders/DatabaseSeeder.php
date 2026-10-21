<?php

namespace Database\Seeders;

use App\Models\BusinessSetting;
use App\Models\Promotion;
use App\Models\Service;
use App\Models\StaffMember;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        User::factory()->create([
            'first_name' => 'Admin',
            'last_name' => 'Zakazivanje',
            'email' => 'zakazivanje@fiskultura.rs',
            'password' => Hash::make('zakazivanje2026'),
            'role' => User::ROLE_ADMIN,
        ]);

        User::factory()->create([
            'first_name' => 'Petar',
            'last_name' => 'Petrović',
            'email' => 'devtestzikaa@gmail.com',
            'password' => Hash::make('test'),
            'phone' => '+381 64 123 4567',
        ]);

        User::factory()->create([
            'first_name' => 'Ivana',
            'last_name' => 'Mitić',
            'email' => null,
            'password' => null,
            'phone' => '+381 65 444 5555',
            'note' => 'Zakazuje telefonom.',
        ]);

        BusinessSetting::current()->update([
            'name' => 'Salon Lepota',
            'category' => 'beauty_salon',
            'description' => 'Salon u centru grada, radimo od 2015.',
            'address' => 'Glavna 1',
            'city' => 'Beograd',
            'phone' => '+381 60 123 4567',
            'email' => 'zakazivanje@fiskultura.rs',
            'theme_primary' => '#0f766e',
            'theme_secondary' => '#b45309',
            'theme_tertiary' => '#7c3aed',
            'booking_confirmation' => BusinessSetting::CONFIRMATION_MANUAL,
            'allow_guest_booking' => false,
        ]);

        $services = collect([
            ['Žensko šišanje', 45, 2500, 'Šišanje'],
            ['Muško šišanje', 30, 1500, 'Šišanje'],
            ['Feniranje', 30, 1200, 'Stilizovanje'],
            ['Farbanje', 90, 4500, 'Boja'],
            ['Manikir', 60, 2000, 'Nokti'],
        ])->map(fn ($s, $i) => Service::create([
            'name' => $s[0], 'duration_minutes' => $s[1], 'price' => $s[2], 'category' => $s[3], 'sort_order' => $i,
        ]))->keyBy('name');

        $weekdays = fn (array $days, string $from, string $to) => collect($days)
            ->map(fn ($d) => ['weekday' => $d, 'starts_at' => $from, 'ends_at' => $to])->all();

        $staff = [
            ['Ana', 'Jovanović', 'Frizer', '#0f766e', null, $weekdays([1, 2, 3, 4, 5], '09:00', '17:00'), ['Žensko šišanje', 'Muško šišanje', 'Feniranje', 'Farbanje']],
            ['Milica', 'Petrović', 'Frizer, kolorista', '#b45309', BusinessSetting::CONFIRMATION_AUTOMATIC, $weekdays([2, 3, 4, 5, 6], '10:00', '18:00'), ['Žensko šišanje', 'Farbanje']],
            ['Jelena', 'Ilić', 'Manikir', '#7c3aed', null, $weekdays([1, 2, 3, 4, 5], '12:00', '20:00'), ['Manikir']],
        ];

        foreach ($staff as $i => [$first, $last, $title, $color, $confirmation, $hours, $serviceNames]) {
            $member = StaffMember::create([
                'first_name' => $first, 'last_name' => $last, 'title' => $title, 'color' => $color,
                'booking_confirmation' => $confirmation, 'sort_order' => $i,
            ]);
            $member->workingHours()->createMany($hours);
            $member->services()->sync($services->only($serviceNames)->pluck('id'));
        }

        Promotion::create(['name' => 'Šišanje + feniranje', 'type' => Promotion::TYPE_PACKAGE, 'package_price' => 3200])
            ->services()->sync($services->only(['Žensko šišanje', 'Feniranje'])->pluck('id'));

        Promotion::create(['name' => 'Srećni utorak −15%', 'type' => Promotion::TYPE_PERCENT, 'discount_percent' => 15, 'weekdays' => [2]])
            ->services()->sync($services->only(['Manikir'])->pluck('id'));

        Promotion::create(['name' => 'Muško šišanje 2+1', 'type' => Promotion::TYPE_BUNDLE, 'buy_quantity' => 2, 'free_quantity' => 1])
            ->services()->sync($services->only(['Muško šišanje'])->pluck('id'));

        Promotion::create(['name' => 'Svaka 10. poseta −50%', 'type' => Promotion::TYPE_LOYALTY, 'loyalty_visits' => 10, 'discount_percent' => 50]);
    }
}

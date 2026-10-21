<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BusinessSettingTest extends TestCase
{
    use RefreshDatabase;

    public function test_business_info_is_public(): void
    {
        $this->getJson('/api/public/business')->assertOk()->assertJsonStructure(['name', 'category', 'opening_hours' => [['weekday', 'opens_at', 'closes_at']]]);
    }

    public function test_guest_booking_is_off_by_default(): void
    {
        $this->getJson('/api/public/business')->assertOk()->assertJsonPath('allow_guest_booking', false);
    }

    public function test_only_admin_updates_business_settings(): void
    {
        $payload = ['name' => 'Berbernica Mika', 'category' => 'barber', 'city' => 'Novi Sad', 'booking_confirmation' => 'automatic', 'theme_primary' => '#123abc'];

        $this->putJson('/api/business-settings', $payload)->assertUnauthorized();
        $this->actingAsJwt(User::factory()->create())->putJson('/api/business-settings', $payload)->assertForbidden();

        $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);
        $this->actingAsJwt($admin)->putJson('/api/business-settings', $payload)
            ->assertOk()->assertJsonPath('name', 'Berbernica Mika');

        $this->getJson('/api/public/business')->assertJsonPath('city', 'Novi Sad')->assertJsonPath('theme_primary', '#123abc');
    }

    public function test_unknown_category_is_rejected(): void
    {
        $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);

        $this->actingAsJwt($admin)->putJson('/api/business-settings', ['name' => 'Salon', 'category' => 'bakery', 'booking_confirmation' => 'manual'])
            ->assertUnprocessable()->assertJsonValidationErrors('category');
    }
}

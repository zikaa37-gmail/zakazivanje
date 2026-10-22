<?php

namespace Tests\Feature;

use App\Models\BusinessSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ShareTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_gets_qr_code_for_link(): void
    {
        $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);

        $response = $this->actingAsJwt($admin)->postJson('/api/share/qr', ['url' => 'https://zakazivanje.fiskultura.rs/book'])->assertOk();

        $this->assertStringStartsWith('data:image/png;base64,', $response->json('png'));
        $this->assertStringContainsString('<svg', $response->json('svg'));
    }

    public function test_qr_rejects_non_http_links_and_clients(): void
    {
        $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);
        $this->actingAsJwt($admin)->postJson('/api/share/qr', ['url' => 'javascript:alert(1)'])->assertUnprocessable();

        $client = User::factory()->create();
        $this->actingAsJwt($client)->postJson('/api/share/qr', ['url' => 'https://example.com'])->assertForbidden();
    }

    public function test_social_links_are_saved_and_public(): void
    {
        $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);
        $settings = BusinessSetting::current();

        $this->actingAsJwt($admin)->putJson('/api/business-settings', [
            'name' => $settings->name,
            'category' => $settings->category,
            'booking_confirmation' => $settings->booking_confirmation,
            'instagram' => '@salon.lepota',
            'facebook' => 'https://facebook.com/salonlepota',
            'tiktok' => '@salonlepota',
            'youtube' => null,
        ])->assertOk();

        $this->getJson('/api/public/business')
            ->assertJsonPath('instagram', '@salon.lepota')
            ->assertJsonPath('facebook', 'https://facebook.com/salonlepota')
            ->assertJsonPath('tiktok', '@salonlepota');
    }
}

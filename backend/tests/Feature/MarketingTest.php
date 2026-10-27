<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\BusinessSetting;
use App\Models\GalleryImage;
use App\Models\Service;
use App\Models\StaffMember;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class MarketingTest extends TestCase
{
    use RefreshDatabase;

    public function test_visits_registrations_and_bookings_are_counted_by_source(): void
    {
        $this->travelTo('2026-10-19 08:00:00');
        Notification::fake();
        $owner = User::factory()->create(['role' => User::ROLE_OWNER]);
        $cut = Service::create(['name' => 'Šišanje', 'duration_minutes' => 30, 'price' => 1500]);
        $ana = StaffMember::create(['first_name' => 'Ana', 'last_name' => 'Test', 'booking_confirmation' => BusinessSetting::CONFIRMATION_AUTOMATIC]);
        $ana->services()->sync([$cut->id]);
        $ana->workingHours()->createMany(collect(range(1, 5))->map(fn ($d) => ['weekday' => $d, 'starts_at' => '09:00', 'ends_at' => '17:00'])->all());

        $referral = ['source' => 'instagram', 'campaign' => 'story-akcija'];
        $this->postJson('/api/public/visit', $referral)->assertNoContent();
        $this->postJson('/api/public/visit', $referral)->assertNoContent();
        $this->postJson('/api/public/visit', ['source' => 'Instagram!'])->assertUnprocessable();
        $this->actingAsJwt($owner)->postJson('/api/public/visit', $referral)->assertNoContent();

        $this->postJson('/api/auth/register', [
            'first_name' => 'Mila', 'last_name' => 'Nova', 'email' => 'mila@example.com', 'password' => 'tajna1234',
            'phone' => '060 123 456', 'referral' => $referral,
        ])->assertCreated();
        $mila = User::where('email', 'mila@example.com')->first();
        $this->assertSame('instagram', $mila->signup_source);

        $this->actingAsJwt($mila)->postJson('/api/bookings', [
            'service_ids' => [$cut->id], 'staff_member_id' => $ana->id, 'starts_at' => '2026-10-21 10:00', 'referral' => $referral,
        ])->assertCreated();
        $this->assertSame('story-akcija', Appointment::first()->referral_campaign);

        $this->actingAsJwt($owner)->postJson('/api/dashboard/sources', ['from' => '2026-10-01', 'to' => '2026-10-31'])
            ->assertOk()
            ->assertJsonPath('0.source', 'instagram')
            ->assertJsonPath('0.campaign', 'story-akcija')
            ->assertJsonPath('0.visits', 2)
            ->assertJsonPath('0.registrations', 1)
            ->assertJsonPath('0.bookings', 1);

        $worker = User::factory()->create(['role' => User::ROLE_WORKER]);
        $this->actingAsJwt($worker)->postJson('/api/dashboard/sources', ['from' => '2026-10-01', 'to' => '2026-10-31'])->assertForbidden();
    }

    public function test_gallery_images_can_be_featured_and_marked_as_salon(): void
    {
        $owner = User::factory()->create(['role' => User::ROLE_OWNER]);
        $image = GalleryImage::create(['data' => 'data:image/png;base64,AAAA', 'mime' => 'image/png', 'width' => 10, 'height' => 10]);

        $this->actingAsJwt($owner)->putJson("/api/gallery/{$image->id}", ['kind' => 'salon', 'featured' => true])
            ->assertOk()->assertJsonPath('kind', 'salon')->assertJsonPath('featured', true);
        $this->actingAsJwt($owner)->putJson("/api/gallery/{$image->id}", ['kind' => 'garaza'])->assertUnprocessable();

        $this->getJson('/api/public/gallery')->assertJsonPath('0.kind', 'salon');
    }

    public function test_owner_connects_instagram_through_oauth(): void
    {
        config(['instagram.app_id' => '123', 'instagram.app_secret' => 'secret']);
        $owner = User::factory()->create(['role' => User::ROLE_OWNER]);
        $worker = User::factory()->create(['role' => User::ROLE_WORKER]);
        Http::fake([
            'api.instagram.com/oauth/access_token' => Http::response(['access_token' => 'short-token', 'user_id' => 1]),
            'graph.instagram.com/access_token*' => Http::response(['access_token' => str_repeat('l', 40), 'expires_in' => 5000000]),
            'graph.instagram.com/me?*' => Http::response(['username' => 'salonpink']),
        ]);

        $this->getJson('/api/public/business')->assertJsonMissingPath('instagram_oauth_available');
        $this->actingAsJwt($worker)->postJson('/api/instagram/authorize')->assertForbidden();
        $this->actingAsJwt($owner)->getJson('/api/public/business')->assertJsonPath('instagram_oauth_available', true);

        $url = $this->actingAsJwt($owner)->postJson('/api/instagram/authorize')->assertOk()->json('url');
        parse_str(parse_url($url, PHP_URL_QUERY), $query);
        $this->assertStringContainsString('instagram_business_manage_insights', $query['scope']);

        $this->get('/api/public/instagram/callback?code=abc&state=pokvaren')->assertRedirectContains('instagram=error');
        $this->get('/api/public/instagram/callback?code=abc&state='.urlencode($query['state']))->assertRedirectContains('instagram=connected');

        $settings = BusinessSetting::current();
        $this->assertSame(str_repeat('l', 40), $settings->instagram_token);
        $this->assertSame('salonpink', $settings->instagram_username);
        Http::assertSent(fn ($request) => str_contains($request->url(), 'oauth/access_token') && $request['code'] === 'abc');
    }

    public function test_instagram_feed_is_optional_and_token_stays_private(): void
    {
        $owner = User::factory()->create(['role' => User::ROLE_OWNER]);
        $this->getJson('/api/public/instagram')->assertOk()->assertExactJson([]);

        Http::fake([
            'graph.instagram.com/me?*' => Http::response(['username' => 'salonpink']),
            'graph.instagram.com/me/media*' => Http::response(['data' => [
                ['id' => '1', 'caption' => 'Balayage', 'media_type' => 'IMAGE', 'media_url' => 'https://cdn.example/1.jpg', 'permalink' => 'https://instagram.com/p/1'],
                ['id' => '2', 'media_type' => 'VIDEO', 'thumbnail_url' => 'https://cdn.example/2.jpg', 'media_url' => 'https://cdn.example/2.mp4', 'permalink' => 'https://instagram.com/p/2'],
            ]]),
            'graph.instagram.com/refresh_access_token*' => Http::response(['access_token' => str_repeat('n', 40), 'expires_in' => 5184000]),
        ]);

        $this->actingAsJwt($owner)->postJson('/api/instagram/connect', ['token' => str_repeat('t', 40)])
            ->assertOk()->assertJsonPath('instagram_username', 'salonpink')->assertJsonPath('instagram_connected', true);

        $this->getJson('/api/public/instagram')->assertOk()->assertJsonCount(2)->assertJsonPath('1.image', 'https://cdn.example/2.jpg');
        $this->getJson('/api/public/business')->assertJsonMissingPath('instagram_token')->assertJsonPath('instagram_connected', true);

        $this->artisan('instagram:refresh-token')->assertSuccessful();
        $this->assertSame(str_repeat('n', 40), BusinessSetting::current()->instagram_token);

        $this->actingAsJwt($owner)->deleteJson('/api/instagram')->assertOk()->assertJsonPath('instagram_connected', false);
        $this->getJson('/api/public/instagram')->assertExactJson([]);
    }
}

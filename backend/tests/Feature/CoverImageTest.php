<?php

namespace Tests\Feature;

use App\Models\BusinessSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CoverImageTest extends TestCase
{
    use RefreshDatabase;

    private const JPEG = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==';

    private function save(User $admin, array $extra)
    {
        $settings = BusinessSetting::current();

        return $this->actingAsJwt($admin)->putJson('/api/business-settings', [
            'name' => $settings->name,
            'category' => $settings->category,
            'booking_confirmation' => $settings->booking_confirmation,
            ...$extra,
        ]);
    }

    public function test_cover_is_served_as_file_and_not_inlined(): void
    {
        $admin = User::factory()->create(['role' => User::ROLE_OWNER]);

        $this->getJson('/api/public/business')->assertJsonPath('cover_url', null);
        $this->get('/api/public/business/cover')->assertNotFound();

        $this->save($admin, ['cover_image' => self::JPEG])->assertOk();

        $public = $this->getJson('/api/public/business')->assertOk();
        $this->assertStringStartsWith('/public/business/cover?v=', $public->json('cover_url'));
        $this->assertArrayNotHasKey('cover_image', $public->json());
        $this->get('/api/public/business/cover')->assertOk()->assertHeader('Content-Type', 'image/jpeg');

        $this->save($admin, ['name' => 'Salon'])->assertOk();
        $this->assertNotNull(BusinessSetting::current()->cover_image);

        $this->save($admin, ['cover_image' => null])->assertOk();
        $this->assertNull(BusinessSetting::current()->cover_image);
    }

    public function test_rejects_non_image(): void
    {
        $admin = User::factory()->create(['role' => User::ROLE_OWNER]);

        $this->save($admin, ['cover_image' => 'data:text/html;base64,PGI+'])->assertUnprocessable()->assertJsonValidationErrors('cover_image');
    }
}

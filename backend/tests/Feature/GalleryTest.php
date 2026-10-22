<?php

namespace Tests\Feature;

use App\Models\GalleryImage;
use App\Models\Service;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GalleryTest extends TestCase
{
    use RefreshDatabase;

    private const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    private function upload(User $admin, array $extra = []): array
    {
        return $this->actingAsJwt($admin)->postJson('/api/gallery', ['data' => self::PNG, 'width' => 1, 'height' => 1, ...$extra])->assertCreated()->json();
    }

    public function test_only_admin_manages_gallery(): void
    {
        $this->postJson('/api/gallery/list')->assertUnauthorized();

        $client = User::factory()->create();
        $this->actingAsJwt($client)->postJson('/api/gallery', ['data' => self::PNG, 'width' => 1, 'height' => 1])->assertForbidden();
    }

    public function test_admin_uploads_and_public_sees_visible_images(): void
    {
        $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);
        $service = Service::create(['name' => 'Feniranje', 'duration_minutes' => 30, 'price' => 1000]);

        $first = $this->upload($admin, ['caption' => 'Pre i posle', 'service_id' => $service->id]);
        $second = $this->upload($admin);
        $this->actingAsJwt($admin)->putJson("/api/gallery/{$second['id']}", ['visible' => false])->assertOk();

        $this->assertSame('Feniranje', $first['service_name']);
        $this->assertTrue($first['visible']);
        $public = $this->getJson('/api/public/gallery')->assertOk()->json();
        $this->assertCount(1, $public);
        $this->assertArrayNotHasKey('data', $public[0]);

        $this->get("/api/public/gallery/images/{$first['id']}")
            ->assertOk()
            ->assertHeader('Content-Type', 'image/png');
    }

    public function test_new_images_come_first_and_can_be_reordered(): void
    {
        $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);
        $a = $this->upload($admin);
        $b = $this->upload($admin);

        $this->assertSame([$b['id'], $a['id']], collect($this->actingAsJwt($admin)->postJson('/api/gallery/list')->json())->pluck('id')->all());

        $this->actingAsJwt($admin)->postJson('/api/gallery/reorder', ['ids' => [$a['id'], $b['id']]])->assertOk();
        $this->assertSame([$a['id'], $b['id']], GalleryImage::orderBy('position')->pluck('id')->all());

        $this->actingAsJwt($admin)->deleteJson("/api/gallery/{$a['id']}")->assertOk();
        $this->assertSame(1, GalleryImage::count());
    }

    public function test_rejects_non_image_data(): void
    {
        $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);

        $this->actingAsJwt($admin)->postJson('/api/gallery', ['data' => 'data:text/html;base64,PGI+', 'width' => 1, 'height' => 1])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('data');
    }
}

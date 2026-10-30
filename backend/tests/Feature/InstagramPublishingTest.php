<?php

namespace Tests\Feature;

use App\Models\BusinessSetting;
use App\Models\InstagramPost;
use App\Models\Service;
use App\Models\StaffMember;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class InstagramPublishingTest extends TestCase
{
    use RefreshDatabase;

    private function connect(array $extra = []): void
    {
        BusinessSetting::current()->forceFill([
            'instagram_token' => str_repeat('t', 40),
            'instagram_username' => 'salonpink',
            'instagram_user_id' => '123',
            'instagram_publishing_enabled' => true,
            ...$extra,
        ])->save();
    }

    private function fakeGraph(): void
    {
        Http::fake([
            'graph.instagram.com/123/media' => Http::response(['id' => 'c1']),
            'graph.instagram.com/c1?*' => Http::response(['status_code' => 'FINISHED', 'id' => 'c1']),
            'graph.instagram.com/123/media_publish' => Http::response(['id' => 'm1']),
            'graph.instagram.com/m1?*' => Http::response(['permalink' => 'https://www.instagram.com/p/m1/']),
        ]);
    }

    private function jpeg(int $width = 1080, int $height = 1350): string
    {
        $image = imagecreatetruecolor($width, $height);
        ob_start();
        imagejpeg($image);

        return 'data:image/jpeg;base64,'.base64_encode(ob_get_clean());
    }

    public function test_publishing_requires_the_toggle_and_a_connected_account(): void
    {
        $owner = User::factory()->create(['role' => User::ROLE_OWNER]);
        $payload = ['kind' => 'post', 'caption' => 'Jesenja akcija', 'image' => $this->jpeg()];
        $this->connect(['instagram_free_slots_days' => [1]]);
        $this->getJson('/api/public/business')
            ->assertJsonMissingPath('instagram_publishing_enabled')
            ->assertJsonMissingPath('instagram_free_slots_days')
            ->assertJsonMissingPath('instagram_user_id');
        BusinessSetting::current()->forceFill(['instagram_token' => null])->save();

        $this->actingAsJwt($owner)->postJson('/api/instagram/posts', $payload)->assertUnprocessable()->assertJsonValidationErrors('instagram');

        $this->connect(['instagram_publishing_enabled' => false]);
        $this->actingAsJwt($owner)->postJson('/api/instagram/posts', $payload)->assertUnprocessable();

        $worker = User::factory()->create(['role' => User::ROLE_WORKER, 'staff_member_id' => StaffMember::create(['first_name' => 'Radnik', 'last_name' => 'Test'])->id]);
        $this->actingAsJwt($worker)->postJson('/api/instagram/posts/list')->assertForbidden();
    }

    public function test_post_is_published_right_away_with_caption(): void
    {
        $this->fakeGraph();
        $this->connect();
        $owner = User::factory()->create(['role' => User::ROLE_OWNER]);

        $this->actingAsJwt($owner)->postJson('/api/instagram/posts', ['kind' => 'post', 'caption' => 'Jesenja akcija', 'image' => $this->jpeg()])
            ->assertCreated()
            ->assertJsonPath('status', InstagramPost::STATUS_PUBLISHED)
            ->assertJsonPath('permalink', 'https://www.instagram.com/p/m1/');

        Http::assertSent(fn (Request $request) => $request->url() === 'https://graph.instagram.com/123/media'
            && $request['caption'] === 'Jesenja akcija'
            && str_contains($request['image_url'], '/api/public/instagram-media/'));
        Http::assertSent(fn (Request $request) => $request->url() === 'https://graph.instagram.com/123/media_publish' && $request['creation_id'] === 'c1');
        $this->assertNull(InstagramPost::first()->image);
    }

    public function test_scheduled_story_is_published_by_the_command(): void
    {
        $this->travelTo('2026-10-19 10:00:00');
        $this->fakeGraph();
        $this->connect();
        $owner = User::factory()->create(['role' => User::ROLE_OWNER]);

        $id = $this->actingAsJwt($owner)->postJson('/api/instagram/posts', [
            'kind' => 'story', 'caption' => 'ne šalje se', 'image' => $this->jpeg(1080, 1920), 'scheduled_at' => '2026-10-19T12:00:00',
        ])->assertCreated()->assertJsonPath('status', InstagramPost::STATUS_SCHEDULED)->assertJsonPath('caption', null)->json('id');
        Http::assertNothingSent();

        $post = InstagramPost::find($id);
        $this->get("/api/public/instagram-media/{$post->token}")->assertOk()->assertHeader('Content-Type', 'image/jpeg');
        $this->get('/api/public/instagram-media/'.str_repeat('x', 40))->assertNotFound();

        $this->artisan('instagram:publish-scheduled')->assertSuccessful();
        $this->assertSame(InstagramPost::STATUS_SCHEDULED, $post->refresh()->status);

        $this->travelTo('2026-10-19 12:05:00');
        $this->artisan('instagram:publish-scheduled')->assertSuccessful();
        $this->assertSame(InstagramPost::STATUS_PUBLISHED, $post->refresh()->status);
        Http::assertSent(fn (Request $request) => $request->url() === 'https://graph.instagram.com/123/media' && $request['media_type'] === 'STORIES' && ! isset($request['caption']));
    }

    public function test_failed_post_keeps_the_error_and_can_be_retried_or_deleted(): void
    {
        Http::fakeSequence('graph.instagram.com/123/media')
            ->push(['error' => ['message' => 'Invalid image', 'error_user_msg' => 'Slika nije podržana.']], 400)
            ->push(['id' => 'c1']);
        Http::fake([
            'graph.instagram.com/c1?*' => Http::response(['status_code' => 'FINISHED']),
            'graph.instagram.com/123/media_publish' => Http::response(['id' => 'm1']),
            'graph.instagram.com/m1?*' => Http::response(['permalink' => 'https://www.instagram.com/p/m1/']),
        ]);
        $this->connect();
        $owner = User::factory()->create(['role' => User::ROLE_OWNER]);

        $id = $this->actingAsJwt($owner)->postJson('/api/instagram/posts', ['kind' => 'post', 'image' => $this->jpeg()])
            ->assertCreated()
            ->assertJsonPath('status', InstagramPost::STATUS_FAILED)
            ->assertJsonPath('error', 'Slika nije podržana.')
            ->json('id');

        $this->actingAsJwt($owner)->postJson('/api/instagram/posts/list')->assertOk()->assertJsonPath('0.id', $id)->assertJsonMissingPath('0.token');

        $this->actingAsJwt($owner)->postJson("/api/instagram/posts/{$id}/publish")->assertOk()->assertJsonPath('status', InstagramPost::STATUS_PUBLISHED);
        $this->actingAsJwt($owner)->deleteJson("/api/instagram/posts/{$id}")->assertUnprocessable();

        $scheduled = InstagramPost::create(['kind' => 'post', 'image' => $this->jpeg(), 'status' => InstagramPost::STATUS_SCHEDULED, 'scheduled_at' => now()->addDay()]);
        $this->actingAsJwt($owner)->deleteJson("/api/instagram/posts/{$scheduled->id}")->assertNoContent();
        $this->assertModelMissing($scheduled);
    }

    public function test_free_slots_story_is_made_once_on_selected_days(): void
    {
        $this->travelTo('2026-10-19 08:00:00');
        $this->fakeGraph();
        $this->connect(['instagram_free_slots_enabled' => true, 'instagram_free_slots_days' => [1, 3], 'instagram_free_slots_time' => '09:00']);
        $cut = Service::create(['name' => 'Šišanje', 'duration_minutes' => 30, 'price' => 1500]);
        $ana = StaffMember::create(['first_name' => 'Ana', 'last_name' => 'Test']);
        $ana->services()->sync([$cut->id]);
        $ana->workingHours()->create(['weekday' => 2, 'starts_at' => '09:00', 'ends_at' => '11:00']);
        $owner = User::factory()->create(['role' => User::ROLE_OWNER]);

        $this->actingAsJwt($owner)->postJson('/api/instagram/free-slots/preview')
            ->assertOk()
            ->assertJsonPath('ranges.0', ['from' => '09:00', 'to' => '10:30'])
            ->assertJsonPath('label', 'sutra, utorak 20.10.');

        $this->artisan('instagram:publish-scheduled')->assertSuccessful();
        $this->assertSame(0, InstagramPost::count());

        $this->travelTo('2026-10-19 09:10:00');
        $this->artisan('instagram:publish-scheduled')->assertSuccessful();
        $this->artisan('instagram:publish-scheduled')->assertSuccessful();
        $story = InstagramPost::sole();
        $this->assertSame(InstagramPost::SOURCE_FREE_SLOTS, $story->source);
        $this->assertSame(InstagramPost::STATUS_PUBLISHED, $story->status);
        $this->assertSame('2026-10-20', $story->slots['date']);

        $this->travelTo('2026-10-21 09:30:00');
        $this->artisan('instagram:publish-scheduled')->assertSuccessful();
        $skipped = InstagramPost::latest('id')->first();
        $this->assertSame(InstagramPost::STATUS_SKIPPED, $skipped->status);
        $this->assertStringContainsString('nema slobodnih', $skipped->error);
    }
}

<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\ChatSession;
use App\Models\PushSubscription;
use App\Models\User;
use App\Services\WebPushService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Collection;
use Tests\TestCase;

class PushTest extends TestCase
{
    use RefreshDatabase;

    private array $sent = [];

    private User $client;

    private User $owner;

    protected function setUp(): void
    {
        parent::setUp();
        config(['services.webpush' => ['public_key' => 'test-public', 'private_key' => 'test-private', 'subject' => 'mailto:test@example.com']]);

        $sent = &$this->sent;
        $this->app->instance(WebPushService::class, new class($sent) extends WebPushService
        {
            public function __construct(private array &$sent) {}

            protected function send(Collection $subscriptions, array $payload): void
            {
                foreach ($subscriptions as $subscription) {
                    $this->sent[] = ['user_id' => $subscription->user_id, ...$payload];
                }
            }
        });

        $this->client = User::factory()->create(['first_name' => 'Petar', 'last_name' => 'Petrović']);
        $this->owner = User::factory()->create(['role' => UserRole::Owner]);
    }

    private function subscribe(User $user, string $endpoint = 'https://push.example.com/abc'): void
    {
        $this->actingAsJwt($user)->postJson('/api/push/subscribe', ['endpoint' => $endpoint, 'keys' => ['p256dh' => 'key', 'auth' => 'secret']])->assertOk();
    }

    public function test_subscription_is_stored_once_per_endpoint_and_can_be_removed(): void
    {
        $this->getJson('/api/public/business')->assertJsonPath('push_public_key', 'test-public');

        $this->subscribe($this->client);
        $this->subscribe($this->owner);

        $this->assertSame(1, PushSubscription::count());
        $this->assertSame($this->owner->id, PushSubscription::sole()->user_id);

        $this->actingAsJwt($this->owner)->postJson('/api/push/unsubscribe', ['endpoint' => 'https://push.example.com/abc'])->assertOk();
        $this->assertSame(0, PushSubscription::count());
    }

    public function test_chat_messages_are_pushed_with_badge_count(): void
    {
        $this->subscribe($this->owner, 'https://push.example.com/owner');
        $this->subscribe($this->client, 'https://push.example.com/client');

        $this->actingAsJwt($this->client)->postJson('/api/chat/my/messages', ['body' => 'Da li radite sutra?'])->assertCreated();

        $this->assertCount(1, $this->sent);
        $this->assertSame($this->owner->id, $this->sent[0]['user_id']);
        $this->assertSame('Poruka: Petar Petrović', $this->sent[0]['title']);
        $this->assertSame('Da li radite sutra?', $this->sent[0]['body']);
        $this->assertSame(1, $this->sent[0]['badge']);

        $session = ChatSession::sole();
        $this->sent = [];
        $this->actingAsJwt($this->owner)->postJson("/api/chat/sessions/{$session->id}/messages", ['body' => 'Radimo od 9'])->assertCreated();

        $this->assertCount(1, $this->sent);
        $this->assertSame($this->client->id, $this->sent[0]['user_id']);
        $this->assertSame('/?chat=1', $this->sent[0]['link']);
    }

    public function test_nothing_is_pushed_without_keys(): void
    {
        config(['services.webpush.public_key' => null]);
        PushSubscription::create(['user_id' => $this->owner->id, 'endpoint_hash' => 'x', 'endpoint' => 'https://push.example.com/x', 'p256dh' => 'k', 'auth' => 'a']);

        $this->actingAsJwt($this->client)->postJson('/api/chat/my/messages', ['body' => 'Halo'])->assertCreated();

        $this->assertSame([], $this->sent);
        $this->actingAsJwt($this->owner)->postJson('/api/push/subscribe', ['endpoint' => 'https://push.example.com/y', 'keys' => ['p256dh' => 'k', 'auth' => 'a']])->assertNotFound();
    }

    public function test_manifest_and_icon(): void
    {
        $this->getJson('/api/public/manifest.webmanifest')->assertOk()
            ->assertJsonPath('display', 'standalone')
            ->assertJsonPath('start_url', '/');

        $response = $this->get('/api/public/app-icon/192.png')->assertOk();
        $this->assertSame('image/png', $response->headers->get('Content-Type'));
        $this->assertSame([192, 192], array_slice(getimagesizefromstring($response->getContent()), 0, 2));
        $this->get('/api/public/app-icon/16.png')->assertNotFound();
    }
}

<?php

namespace Tests\Feature;

use App\Models\User;
use App\Notifications\ResetPasswordNotification;
use App\Notifications\VerifyEmailNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    private function clientPayload(array $overrides = []): array
    {
        return [
            'first_name' => 'Marija',
            'last_name' => 'Marković',
            'email' => 'marija@example.com',
            'password' => 'tajna1234',
            'phone' => '+381 60 111 2222',
            ...$overrides,
        ];
    }

    public function test_client_registers_and_verifies_email(): void
    {
        Notification::fake();

        $this->postJson('/api/auth/register', $this->clientPayload())->assertCreated();

        $user = User::where('email', 'marija@example.com')->firstOrFail();
        $this->assertSame(User::ROLE_CLIENT, $user->role);
        $this->assertNull($user->email_verified_at);

        $token = null;
        Notification::assertSentTo($user, VerifyEmailNotification::class, function ($notification) use (&$token, $user) {
            preg_match('/token=([^&]+)/', $notification->toMail($user)->actionUrl, $matches);
            $token = $matches[1];

            return true;
        });

        $this->postJson('/api/auth/login', ['email' => 'marija@example.com', 'password' => 'tajna1234'])
            ->assertUnprocessable()->assertJsonValidationErrors('email');

        $this->postJson('/api/auth/verify-email', ['token' => $token])->assertOk()->assertJsonStructure(['access_token', 'refresh_token', 'user']);
        $this->assertNotNull($user->fresh()->email_verified_at);
        $this->postJson('/api/auth/verify-email', ['token' => $token])->assertUnprocessable();
        $this->postJson('/api/auth/login', ['email' => 'marija@example.com', 'password' => 'tajna1234'])->assertOk();
    }

    public function test_activation_link_expires_and_re_registration_starts_new_activation(): void
    {
        Notification::fake();

        $this->postJson('/api/auth/register', $this->clientPayload())->assertCreated();
        $tokens = [];
        $user = User::where('email', 'marija@example.com')->firstOrFail();
        Notification::assertSentTo($user, VerifyEmailNotification::class, function ($notification) use (&$tokens, $user) {
            preg_match('/token=([^&]+)/', $notification->toMail($user)->actionUrl, $matches);
            $tokens[] = $matches[1];

            return true;
        });

        $this->travel(User::VERIFICATION_DAYS + 1)->days();
        $this->postJson('/api/auth/verify-email', ['token' => $tokens[0]])->assertUnprocessable()->assertJsonValidationErrors('token');

        $this->postJson('/api/auth/register', $this->clientPayload(['first_name' => 'Marija2', 'next' => '/book']))->assertCreated();
        $this->assertSame(1, User::where('email', 'marija@example.com')->count());
        $this->assertSame('Marija2', $user->fresh()->first_name);
        Notification::assertSentToTimes($user, VerifyEmailNotification::class, 2);

        $this->postJson('/api/auth/register', $this->clientPayload(['website' => 'http://spam.example']))->assertCreated();
        $this->postJson('/api/auth/register', $this->clientPayload(['started_at' => now()->getTimestampMs() - 500]))->assertCreated();
        Notification::assertSentToTimes($user, VerifyEmailNotification::class, 2);
    }

    public function test_registration_rejects_duplicate_email(): void
    {
        User::factory()->create(['email' => 'marija@example.com']);

        $this->postJson('/api/auth/register', $this->clientPayload())
            ->assertUnprocessable()->assertJsonValidationErrors('email');
    }

    public function test_registration_claims_client_added_by_admin(): void
    {
        Notification::fake();
        $placeholder = User::factory()->create(['email' => 'marija@example.com', 'password' => null, 'note' => 'VIP']);

        $this->postJson('/api/auth/register', $this->clientPayload())->assertCreated();

        $this->assertSame(1, User::where('email', 'marija@example.com')->count());
        $this->assertNotNull($placeholder->fresh()->password);
        $this->assertSame('VIP', $placeholder->fresh()->note);
    }

    public function test_user_updates_own_profile(): void
    {
        $user = User::factory()->create();

        $this->actingAsJwt($user)->putJson('/api/auth/profile', [
            'first_name' => 'Jelena',
            'last_name' => 'Jovanović',
            'phone' => '+381 64 000 1111',
            'preferred_communication' => 'whatsapp',
        ])->assertOk()->assertJsonPath('first_name', 'Jelena');

        $this->assertSame('whatsapp', $user->fresh()->preferred_communication);
    }

    public function test_login_refresh_me_and_logout(): void
    {
        $user = User::factory()->create(['email' => 'marija@example.com']);

        $this->postJson('/api/auth/login', ['email' => 'marija@example.com', 'password' => 'pogresna'])
            ->assertUnprocessable();

        $tokens = $this->postJson('/api/auth/login', ['email' => 'marija@example.com', 'password' => 'password'])
            ->assertOk()->json();

        $this->getJson('/api/auth/me')->assertUnauthorized();
        $this->withToken($tokens['access_token'])->getJson('/api/auth/me')
            ->assertOk()->assertJsonPath('id', $user->id);

        $refreshed = $this->postJson('/api/auth/refresh', ['refresh_token' => $tokens['refresh_token']])
            ->assertOk()->json();
        $this->postJson('/api/auth/refresh', ['refresh_token' => $tokens['refresh_token']])
            ->assertUnprocessable();

        $this->withToken($refreshed['access_token'])
            ->postJson('/api/auth/logout', ['refresh_token' => $refreshed['refresh_token']])->assertOk();
        $this->postJson('/api/auth/refresh', ['refresh_token' => $refreshed['refresh_token']])
            ->assertUnprocessable();
    }

    public function test_inactive_user_cannot_log_in(): void
    {
        User::factory()->create(['email' => 'marija@example.com', 'active' => false]);

        $this->postJson('/api/auth/login', ['email' => 'marija@example.com', 'password' => 'password'])
            ->assertUnprocessable();
    }

    public function test_password_reset_flow(): void
    {
        Notification::fake();
        $user = User::factory()->create(['email' => 'marija@example.com']);

        $this->postJson('/api/auth/forgot-password', ['email' => 'marija@example.com'])->assertOk();

        $token = null;
        Notification::assertSentTo($user, ResetPasswordNotification::class, function ($notification) use (&$token, $user) {
            preg_match('/token=([^&]+)/', $notification->toMail($user)->actionUrl, $matches);
            $token = $matches[1];

            return true;
        });

        $this->postJson('/api/auth/reset-password', [
            'token' => $token,
            'email' => 'marija@example.com',
            'password' => 'novaLozinka1',
            'password_confirmation' => 'novaLozinka1',
        ])->assertOk();

        $this->postJson('/api/auth/login', ['email' => 'marija@example.com', 'password' => 'novaLozinka1'])
            ->assertOk();
    }
}

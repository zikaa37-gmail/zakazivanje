<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class QuickLoginTest extends TestCase
{
    use RefreshDatabase;

    public function test_quick_login_is_off_without_configured_emails(): void
    {
        $owner = User::factory()->create(['role' => UserRole::Owner]);
        config(['auth_jwt.quick_login_emails' => []]);

        $this->getJson('/api/auth/quick-logins')->assertOk()->assertExactJson([]);
        $this->postJson('/api/auth/quick-login', ['email' => $owner->email])->assertNotFound();
    }

    public function test_only_configured_active_accounts_can_quick_login(): void
    {
        $owner = User::factory()->create(['role' => UserRole::Owner, 'first_name' => 'Jelena']);
        $manager = User::factory()->create(['role' => UserRole::Manager, 'first_name' => 'Luka']);
        $inactive = User::factory()->create(['role' => UserRole::Worker, 'active' => false]);
        $other = User::factory()->create(['role' => UserRole::Owner]);
        config(['auth_jwt.quick_login_emails' => [$manager->email, $owner->email, $inactive->email]]);

        $this->getJson('/api/auth/quick-logins')->assertOk()->assertExactJson([
            ['email' => $manager->email, 'label' => 'Menadžer (Luka)'],
            ['email' => $owner->email, 'label' => 'Vlasnik (Jelena)'],
        ]);

        $this->postJson('/api/auth/quick-login', ['email' => $owner->email])->assertOk()
            ->assertJsonPath('user.id', $owner->id)->assertJsonStructure(['access_token', 'refresh_token']);
        $this->postJson('/api/auth/quick-login', ['email' => $other->email])->assertNotFound();
        $this->postJson('/api/auth/quick-login', ['email' => $inactive->email])->assertNotFound();
    }
}

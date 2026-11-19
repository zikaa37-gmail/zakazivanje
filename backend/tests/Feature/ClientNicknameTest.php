<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\StaffMember;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ClientNicknameTest extends TestCase
{
    use RefreshDatabase;

    private User $client;

    private User $anaWorker;

    private Appointment $appointment;

    protected function setUp(): void
    {
        parent::setUp();
        $ana = StaffMember::create(['first_name' => 'Ana', 'last_name' => 'Test']);
        $this->client = User::factory()->create(['first_name' => 'Petar', 'last_name' => 'Petrović']);
        $this->anaWorker = User::factory()->create(['role' => User::ROLE_WORKER, 'staff_member_id' => $ana->id]);
        $this->appointment = Appointment::create([
            'client_id' => $this->client->id,
            'staff_member_id' => $ana->id,
            'starts_at' => now()->addDay()->setTime(10, 0),
            'ends_at' => now()->addDay()->setTime(11, 0),
            'status' => Appointment::STATUS_CONFIRMED,
            'total' => 2000,
        ]);
    }

    public function test_any_staff_member_sets_nickname_and_staff_sees_it_everywhere(): void
    {
        $this->actingAsJwt($this->anaWorker)->putJson("/api/clients/{$this->client->id}/nickname", ['nickname' => '  Pera Plavi '])
            ->assertOk()->assertJsonPath('nickname', 'Pera Plavi');

        $this->assertSame('Pera Plavi', $this->client->refresh()->salonName());
        $this->actingAsJwt($this->anaWorker)->postJson('/api/appointments/list', ['from' => now()->toDateString(), 'to' => now()->addDays(2)->toDateString()])
            ->assertOk()->assertJsonPath('0.client.nickname', 'Pera Plavi');
        $this->actingAsJwt($this->anaWorker)->postJson('/api/clients/list', ['search' => 'plavi'])
            ->assertOk()->assertJsonPath('data.0.id', $this->client->id);

        $this->actingAsJwt($this->anaWorker)->putJson("/api/clients/{$this->client->id}/nickname", ['nickname' => ''])
            ->assertOk()->assertJsonPath('nickname', null);
        $this->assertSame('Petar Petrović', $this->client->refresh()->salonName());
    }

    public function test_client_never_sees_own_nickname(): void
    {
        $this->client->update(['nickname' => 'Pera Plavi']);

        $this->actingAsJwt($this->client)->getJson('/api/auth/me')->assertOk()->assertJsonMissingPath('nickname')->assertJsonMissingPath('user.nickname');
        $this->assertStringNotContainsString('Pera Plavi', $this->actingAsJwt($this->client)->postJson('/api/my-appointments/list', ['scope' => 'upcoming'])->assertOk()->getContent());
        $this->actingAsJwt($this->client)->putJson("/api/clients/{$this->client->id}/nickname", ['nickname' => 'x'])->assertForbidden();
    }
}

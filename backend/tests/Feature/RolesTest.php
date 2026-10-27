<?php

namespace Tests\Feature;

use App\Models\StaffMember;
use App\Models\User;
use App\Notifications\StaffInviteNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class RolesTest extends TestCase
{
    use RefreshDatabase;

    private User $owner;

    protected function setUp(): void
    {
        parent::setUp();
        $this->owner = User::factory()->create(['role' => User::ROLE_OWNER]);
    }

    private function staffPayload(array $overrides = []): array
    {
        return [
            'first_name' => 'Ana',
            'last_name' => 'Jovanović',
            'email' => 'ana@salon.rs',
            'active' => true,
            'working_hours' => [],
            ...$overrides,
        ];
    }

    public function test_staff_member_with_email_gets_worker_account(): void
    {
        $id = $this->actingAsJwt($this->owner)->postJson('/api/staff', $this->staffPayload())->assertCreated()
            ->assertJsonPath('account.role', User::ROLE_WORKER)->json('id');

        $worker = User::where('staff_member_id', $id)->first();
        $this->assertSame(User::ROLE_WORKER, $worker->role);
        $this->assertSame('ana@salon.rs', $worker->email);
        $this->assertNull($worker->password);

        $this->actingAsJwt($this->owner)->putJson("/api/staff/{$id}", $this->staffPayload(['first_name' => 'Anica', 'email' => 'anica@salon.rs', 'active' => false]))->assertOk();
        $worker->refresh();
        $this->assertSame('Anica', $worker->first_name);
        $this->assertSame('anica@salon.rs', $worker->email);
        $this->assertFalse($worker->active);

        $this->actingAsJwt($this->owner)->postJson("/api/staff/{$id}/active", ['active' => true])->assertOk()
            ->assertJsonPath('active', true)->assertJsonPath('future_appointments', 0);
        $this->assertTrue($worker->refresh()->active);

        $this->actingAsJwt($this->owner)->postJson("/api/staff/{$id}/active", ['active' => false])->assertOk();
        $this->assertFalse($worker->refresh()->active);
        $this->assertModelExists(StaffMember::find($id));
        $this->actingAsJwt($this->owner)->deleteJson("/api/staff/{$id}")->assertStatus(405);
    }

    public function test_staff_email_of_client_is_rejected_and_owner_is_linked(): void
    {
        User::factory()->create(['email' => 'klijent@salon.rs']);

        $this->actingAsJwt($this->owner)->postJson('/api/staff', $this->staffPayload(['email' => 'klijent@salon.rs']))
            ->assertUnprocessable()->assertJsonValidationErrors('email');
        $this->assertSame(0, StaffMember::count());

        $id = $this->actingAsJwt($this->owner)->postJson('/api/staff', $this->staffPayload(['email' => $this->owner->email]))->assertCreated()->json('id');
        $this->assertSame($id, $this->owner->refresh()->staff_member_id);
        $this->assertSame(User::ROLE_OWNER, $this->owner->role);

        $this->actingAsJwt($this->owner)->postJson("/api/staff/{$id}/active", ['active' => false])->assertOk();
        $this->owner->refresh();
        $this->assertTrue($this->owner->active);
        $this->assertSame($id, $this->owner->staff_member_id);
    }

    public function test_worker_handles_daily_work_but_not_owner_pages(): void
    {
        $worker = User::factory()->create(['role' => User::ROLE_WORKER]);

        $this->actingAsJwt($worker)->postJson('/api/appointments/list', ['from' => '2026-11-02', 'to' => '2026-11-08'])->assertOk();
        $this->actingAsJwt($worker)->postJson('/api/staff/list')->assertOk();
        $this->actingAsJwt($worker)->postJson('/api/dashboard/today')->assertOk();
        $this->actingAsJwt($worker)->postJson('/api/clients/list')->assertOk();
        $this->actingAsJwt($worker)->postJson('/api/blocked-times/list', ['from' => '2026-11-02', 'to' => '2026-11-08'])->assertOk();

        $this->actingAsJwt($worker)->postJson('/api/staff', $this->staffPayload())->assertForbidden();
        $this->actingAsJwt($worker)->putJson('/api/business-settings', [])->assertForbidden();
        $this->actingAsJwt($worker)->postJson('/api/dashboard/stats', [])->assertForbidden();
        $this->actingAsJwt($worker)->postJson('/api/team/list')->assertForbidden();
        $this->actingAsJwt($worker)->postJson('/api/promotions/list')->assertForbidden();
        $this->actingAsJwt($worker)->deleteJson('/api/clients/'.User::factory()->create()->id)->assertForbidden();
    }

    public function test_owner_manages_administrative_worker(): void
    {
        Notification::fake();

        $id = $this->actingAsJwt($this->owner)->postJson('/api/team', [
            'first_name' => 'Milica',
            'last_name' => 'Recepcija',
            'email' => 'recepcija@salon.rs',
            'role' => User::ROLE_WORKER,
            'send_invite' => true,
        ])->assertCreated()->assertJsonPath('has_password', false)->assertJsonPath('staff_member_id', null)->json('id');

        $worker = User::find($id);
        Notification::assertSentTo($worker, StaffInviteNotification::class);

        $this->actingAsJwt($this->owner)->postJson('/api/team/list')->assertOk()->assertJsonCount(2)
            ->assertJsonPath('0.role', User::ROLE_OWNER);
        $this->assertSame(0, StaffMember::count());

        $this->actingAsJwt($this->owner)->putJson("/api/team/{$id}", [
            'first_name' => 'Milica',
            'last_name' => 'Recepcija',
            'email' => 'recepcija@salon.rs',
            'role' => User::ROLE_WORKER,
            'active' => false,
        ])->assertOk()->assertJsonPath('active', false);

        $this->actingAsJwt($this->owner)->deleteJson("/api/team/{$id}")->assertOk();
        $this->assertModelMissing($worker);
    }

    public function test_last_owner_cannot_be_demoted_or_removed(): void
    {
        $this->actingAsJwt($this->owner)->putJson("/api/team/{$this->owner->id}", [
            'first_name' => $this->owner->first_name,
            'last_name' => $this->owner->last_name,
            'email' => $this->owner->email,
            'role' => User::ROLE_WORKER,
        ])->assertUnprocessable();

        $other = User::factory()->create(['role' => User::ROLE_OWNER]);
        $this->actingAsJwt($other)->deleteJson("/api/team/{$this->owner->id}")->assertOk();
        $this->actingAsJwt($other)->putJson("/api/team/{$other->id}", [
            'first_name' => $other->first_name,
            'last_name' => $other->last_name,
            'email' => $other->email,
            'role' => User::ROLE_WORKER,
        ])->assertUnprocessable();
    }

    public function test_linked_worker_account_cannot_be_deleted_from_team(): void
    {
        $id = $this->actingAsJwt($this->owner)->postJson('/api/staff', $this->staffPayload())->json('id');
        $worker = User::where('staff_member_id', $id)->first();

        $this->actingAsJwt($this->owner)->deleteJson("/api/team/{$worker->id}")->assertUnprocessable();
    }
}

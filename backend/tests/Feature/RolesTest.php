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
            'phone' => '060 111 2222',
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

    public function test_linked_worker_handles_daily_work_but_not_management_pages(): void
    {
        $worker = User::factory()->create(['role' => User::ROLE_WORKER, 'staff_member_id' => StaffMember::create(['first_name' => 'Radnik', 'last_name' => 'Test'])->id]);

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

    public function test_administrative_worker_manages_salon_but_not_finances_or_owners(): void
    {
        $office = User::factory()->create(['role' => User::ROLE_MANAGER]);

        $this->actingAsJwt($office)->postJson('/api/staff', $this->staffPayload())->assertCreated();
        $this->actingAsJwt($office)->postJson('/api/promotions/list')->assertOk();
        $this->actingAsJwt($office)->postJson('/api/reviews/list')->assertOk();
        $this->actingAsJwt($office)->postJson('/api/gallery/list')->assertOk();
        $this->actingAsJwt($office)->postJson('/api/team/list')->assertOk();
        $this->actingAsJwt($office)->postJson('/api/notification-logs/list')->assertOk();

        $this->actingAsJwt($office)->postJson('/api/dashboard/stats', ['from' => '2026-11-01', 'to' => '2026-11-07'])->assertForbidden();
        $this->actingAsJwt($office)->postJson('/api/dashboard/sources', [])->assertForbidden();

        $this->actingAsJwt($office)->postJson('/api/team', ['first_name' => 'Novi', 'last_name' => 'Vlasnik', 'email' => 'novi@salon.rs', 'role' => User::ROLE_OWNER])->assertForbidden();
        $this->actingAsJwt($office)->putJson("/api/team/{$this->owner->id}", ['role' => User::ROLE_WORKER, 'active' => false])->assertForbidden();
        $this->actingAsJwt($office)->deleteJson("/api/team/{$this->owner->id}")->assertForbidden();
        $this->actingAsJwt($office)->postJson('/api/team', ['first_name' => 'Mila', 'last_name' => 'Recepcija', 'email' => 'mila@salon.rs', 'role' => User::ROLE_MANAGER])->assertCreated();
    }

    public function test_owner_and_manager_can_also_be_staff_with_same_login(): void
    {
        $staffId = $this->actingAsJwt($this->owner)->postJson('/api/staff', $this->staffPayload(['email' => $this->owner->email]))->assertCreated()->json('id');
        $this->assertSame(User::ROLE_OWNER, $this->owner->refresh()->role);
        $this->assertSame($staffId, $this->owner->staff_member_id);
        $this->actingAsJwt($this->owner)->postJson('/api/dashboard/today', ['staff_member_id' => null])->assertOk()->assertJsonPath('staff_member_id', null);
        $this->actingAsJwt($this->owner)->postJson('/api/dashboard/stats', ['from' => '2026-11-01', 'to' => '2026-11-07'])->assertOk();

        $manager = User::factory()->create(['role' => User::ROLE_MANAGER, 'email' => 'mila@salon.rs']);
        $milaId = $this->actingAsJwt($this->owner)->postJson('/api/staff', $this->staffPayload(['first_name' => 'Mila', 'email' => 'mila@salon.rs']))->assertCreated()->json('id');
        $manager->refresh();
        $this->assertSame(User::ROLE_MANAGER, $manager->role);
        $this->assertSame($milaId, $manager->staff_member_id);

        $this->actingAsJwt($manager)->postJson('/api/promotions/list')->assertOk();
        $this->actingAsJwt($manager)->postJson('/api/reports', ['period' => 'day', 'date' => '2026-11-02', 'staff_member_id' => $milaId])->assertOk();
        $this->actingAsJwt($manager)->postJson('/api/reports', ['period' => 'day', 'date' => '2026-11-02'])->assertForbidden();
        $this->actingAsJwt($manager)->postJson('/api/reports', ['period' => 'day', 'date' => '2026-11-02', 'staff_member_id' => $staffId])->assertForbidden();
        $this->actingAsJwt($manager)->postJson('/api/dashboard/today', ['staff_member_id' => $staffId])->assertOk()->assertJsonPath('staff_member_id', $staffId);

        $this->actingAsJwt($this->owner)->postJson('/api/team', ['first_name' => 'Bez', 'last_name' => 'Zaposlenog', 'email' => 'bez@salon.rs', 'role' => User::ROLE_WORKER])
            ->assertUnprocessable()->assertJsonValidationErrors('role');
    }

    public function test_worker_changes_status_only_of_own_appointments(): void
    {
        $ana = StaffMember::create(['first_name' => 'Ana', 'last_name' => 'T']);
        $marko = StaffMember::create(['first_name' => 'Marko', 'last_name' => 'T']);
        $worker = User::factory()->create(['role' => User::ROLE_WORKER, 'staff_member_id' => $ana->id]);
        $client = User::factory()->create();
        $make = fn (StaffMember $s) => \App\Models\Appointment::create(['client_id' => $client->id, 'staff_member_id' => $s->id, 'starts_at' => '2026-11-02 10:00', 'ends_at' => '2026-11-02 10:30', 'status' => 'confirmed', 'source' => 'admin', 'price' => 1000, 'discount' => 0, 'total' => 1000]);

        $this->actingAsJwt($worker)->postJson('/api/appointments/'.$make($ana)->id.'/status', ['status' => 'completed'])->assertOk();
        $this->actingAsJwt($worker)->postJson('/api/appointments/'.$make($marko)->id.'/status', ['status' => 'completed'])->assertForbidden();
    }

    public function test_owner_manages_administrative_worker(): void
    {
        Notification::fake();

        $id = $this->actingAsJwt($this->owner)->postJson('/api/team', [
            'first_name' => 'Milica',
            'last_name' => 'Recepcija',
            'email' => 'recepcija@salon.rs',
            'role' => User::ROLE_MANAGER,
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
            'role' => User::ROLE_MANAGER,
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

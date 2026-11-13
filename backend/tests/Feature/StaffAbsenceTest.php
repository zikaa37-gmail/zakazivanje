<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\BlockedTime;
use App\Models\BusinessSetting;
use App\Models\Service;
use App\Models\StaffAbsence;
use App\Models\StaffMember;
use App\Models\User;
use App\Notifications\AdminAppointmentNotification;
use App\Notifications\AppointmentNotification;
use App\Notifications\StaffAbsenceNotification;
use App\Services\ClientDisciplineService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class StaffAbsenceTest extends TestCase
{
    use RefreshDatabase;

    private Service $cut;

    private StaffMember $ana;

    private StaffMember $milica;

    private User $owner;

    private User $anaAccount;

    private User $client;

    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo('2026-10-19 08:00:00');
        BusinessSetting::current()->update(['booking_confirmation' => 'automatic', 'cancellation_days_before' => 1]);

        $this->cut = Service::create(['name' => 'Šišanje', 'duration_minutes' => 60, 'price' => 1500]);
        $this->ana = $this->staff('Ana');
        $this->milica = $this->staff('Milica');
        $this->owner = User::factory()->create(['role' => User::ROLE_OWNER, 'email' => 'vlasnik@example.com']);
        $this->anaAccount = User::factory()->create(['role' => User::ROLE_WORKER, 'staff_member_id' => $this->ana->id, 'email' => 'ana@example.com']);
        $this->client = User::factory()->create(['email' => 'petar@example.com']);
    }

    private function staff(string $name): StaffMember
    {
        $staff = StaffMember::create(['first_name' => $name, 'last_name' => 'Test']);
        $staff->services()->sync([$this->cut->id]);
        $staff->workingHours()->createMany(collect(range(1, 5))->map(fn ($d) => ['weekday' => $d, 'starts_at' => '09:00', 'ends_at' => '17:00'])->all());

        return $staff;
    }

    private function book(string $at, ?int $staffId = null): int
    {
        return $this->actingAsJwt($this->owner)->postJson('/api/appointments', [
            'client_id' => $this->client->id,
            'service_ids' => [$this->cut->id],
            'staff_member_id' => $staffId ?? $this->ana->id,
            'starts_at' => $at,
        ])->assertCreated()->json('appointments.0.id');
    }

    private function report(User $as, array $data = [])
    {
        return $this->actingAsJwt($as)->postJson('/api/staff-absences', [
            'staff_member_id' => $this->ana->id,
            'starts_on' => '2026-10-20',
            'ends_on' => '2026-10-20',
            'type' => 'sick',
            ...$data,
        ]);
    }

    public function test_worker_request_waits_for_manager_and_blocks_day_after_approval(): void
    {
        Notification::fake();

        $id = $this->report($this->anaAccount)->assertCreated()->assertJsonPath('status', 'pending')->json('id');
        Notification::assertSentTo($this->owner, StaffAbsenceNotification::class, fn ($n) => $n->type === StaffAbsenceNotification::REQUESTED);
        $this->assertSame(0, BlockedTime::count());

        $this->actingAsJwt($this->anaAccount)->postJson("/api/staff-absences/{$id}/approve")->assertForbidden();
        $this->actingAsJwt($this->owner)->postJson("/api/staff-absences/{$id}/approve")->assertOk()->assertJsonPath('status', 'approved');

        Notification::assertSentTo($this->anaAccount, StaffAbsenceNotification::class, fn ($n) => $n->type === StaffAbsenceNotification::APPROVED);
        $block = BlockedTime::sole();
        $this->assertSame($this->ana->id, $block->staff_member_id);
        $this->assertSame('2026-10-20 00:00', $block->starts_at->format('Y-m-d H:i'));
        $this->assertSame('2026-10-21 00:00', $block->ends_at->format('Y-m-d H:i'));
    }

    public function test_manager_entry_is_approved_at_once_and_rejecting_or_removing_clears_block(): void
    {
        Notification::fake();
        $id = $this->report($this->owner)->assertCreated()->assertJsonPath('status', 'approved')->json('id');
        $this->assertSame(1, BlockedTime::count());

        $this->report($this->owner)->assertUnprocessable()->assertJsonValidationErrors('starts_on');

        $this->actingAsJwt($this->owner)->deleteJson("/api/staff-absences/{$id}")->assertOk();
        $this->assertSame(0, BlockedTime::count());
        $this->assertSame(0, StaffAbsence::count());

        $pending = $this->report($this->anaAccount)->json('id');
        $this->actingAsJwt($this->owner)->postJson("/api/staff-absences/{$pending}/reject")->assertOk()->assertJsonPath('status', 'rejected');
        $this->assertSame(0, BlockedTime::count());
    }

    public function test_affected_appointments_list_client_phone_and_free_colleagues(): void
    {
        $this->client->update(['phone' => '+381641112233']);
        $mine = $this->book('2026-10-20 10:00');
        $this->book('2026-10-20 10:00', $this->milica->id);
        $this->book('2026-10-20 14:00');

        $id = $this->report($this->owner)->json('id');

        $rows = $this->actingAsJwt($this->anaAccount)->getJson("/api/staff-absences/{$id}/appointments")->assertOk()->json();
        $this->assertCount(2, $rows);
        $this->assertSame($mine, $rows[0]['id']);
        $this->assertSame('+381641112233', $rows[0]['client']['phone']);
        $this->assertSame([], $rows[0]['alternatives']);
        $this->assertSame([$this->milica->id], array_column($rows[1]['alternatives'], 'id'));
    }

    public function test_transfer_to_colleague_notifies_everyone_and_allows_free_cancellation(): void
    {
        $id = $this->book('2026-10-19 14:00');
        $milicaAccount = User::factory()->create(['role' => User::ROLE_WORKER, 'staff_member_id' => $this->milica->id, 'email' => 'milica@example.com']);
        Notification::fake();

        $this->actingAsJwt($this->owner)->postJson("/api/appointments/{$id}/reschedule", [
            'staff_member_id' => $this->milica->id,
            'starts_at' => '2026-10-19 14:00',
        ])->assertOk()->assertJsonPath('free_change_reason', 'transferred');

        Notification::assertSentTo($this->client, AppointmentNotification::class, fn ($n) => $n->type === AppointmentNotification::TRANSFERRED && $n->previousStaffName === 'Ana');
        Notification::assertSentTo($milicaAccount, AdminAppointmentNotification::class, fn ($n) => $n->type === AdminAppointmentNotification::TRANSFERRED);
        Notification::assertSentTo($this->anaAccount, AdminAppointmentNotification::class, fn ($n) => $n->type === AdminAppointmentNotification::TRANSFERRED);
        Notification::assertNotSentTo($this->owner, AdminAppointmentNotification::class);

        $this->actingAsJwt($this->client)->postJson("/api/my-appointments/{$id}/cancel")->assertOk();
        $this->assertSame(0.0, app(ClientDisciplineService::class)->points($this->client));
    }

    public function test_ask_client_to_reschedule_sends_link_and_lifts_deadline(): void
    {
        $id = $this->book('2026-10-19 15:00');
        Notification::fake();

        $this->actingAsJwt($this->client)->postJson('/api/my-appointments/list', ['scope' => 'upcoming'])->assertJsonPath('0.can_cancel', false);

        $this->actingAsJwt($this->anaAccount)->postJson("/api/appointments/{$id}/ask-reschedule")->assertOk();
        Notification::assertSentTo($this->client, AppointmentNotification::class, fn ($n) => $n->type === AppointmentNotification::RESCHEDULE_REQUEST);
        $this->assertSame(Appointment::FREE_CHANGE_SALON_REQUEST, Appointment::find($id)->free_change_reason);

        $this->actingAsJwt($this->client)->postJson('/api/my-appointments/list', ['scope' => 'upcoming'])->assertJsonPath('0.can_cancel', true);
    }

    public function test_alternatives_endpoint_returns_free_colleagues(): void
    {
        $id = $this->book('2026-10-20 10:00');

        $this->actingAsJwt($this->anaAccount)->getJson("/api/appointments/{$id}/alternatives")
            ->assertOk()->assertJsonPath('0.id', $this->milica->id)->assertJsonCount(1);
    }
}

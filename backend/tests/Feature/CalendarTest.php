<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\BusinessSetting;
use App\Models\Service;
use App\Models\StaffMember;
use App\Models\User;
use App\Notifications\AppointmentNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class CalendarTest extends TestCase
{
    use RefreshDatabase;

    private Service $cut;

    private Service $nails;

    private StaffMember $ana;

    private StaffMember $milica;

    private User $admin;

    private User $client;

    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo('2026-10-19 08:00:00');
        BusinessSetting::current()->update(['booking_confirmation' => 'manual']);

        $this->cut = Service::create(['name' => 'Šišanje', 'duration_minutes' => 45, 'price' => 1500]);
        $this->nails = Service::create(['name' => 'Manikir', 'duration_minutes' => 60, 'price' => 2000]);
        $this->ana = $this->staff('Ana', [$this->cut->id]);
        $this->milica = $this->staff('Milica', [$this->cut->id, $this->nails->id]);
        $this->admin = User::factory()->create(['role' => User::ROLE_ADMIN]);
        $this->client = User::factory()->create(['email' => 'petar@example.com']);
    }

    private function staff(string $name, array $services): StaffMember
    {
        $staff = StaffMember::create(['first_name' => $name, 'last_name' => 'Test']);
        $staff->services()->sync($services);
        $staff->workingHours()->createMany(collect(range(1, 5))->map(fn ($d) => ['weekday' => $d, 'starts_at' => '09:00', 'ends_at' => '17:00'])->all());

        return $staff;
    }

    private function book(int $staffId, string $at, ?array $services = null): int
    {
        return $this->actingAsJwt($this->admin)->postJson('/api/appointments', [
            'client_id' => $this->client->id,
            'service_ids' => $services ?? [$this->cut->id],
            'staff_member_id' => $staffId,
            'starts_at' => $at,
        ])->assertCreated()->json('appointments.0.id');
    }

    public function test_reschedule_moves_time_and_staff_and_notifies_client(): void
    {
        $id = $this->book($this->ana->id, '2026-10-20 10:00');
        Notification::fake();

        $this->actingAsJwt($this->admin)->postJson("/api/appointments/{$id}/reschedule", [
            'staff_member_id' => $this->milica->id,
            'starts_at' => '2026-10-21 14:15',
        ])->assertOk()
            ->assertJsonPath('starts_at', '2026-10-21 14:15')
            ->assertJsonPath('ends_at', '2026-10-21 15:00')
            ->assertJsonPath('staff_member_id', $this->milica->id);

        Notification::assertSentTo($this->client, AppointmentNotification::class, fn ($n) => $n->type === AppointmentNotification::RESCHEDULED);
    }

    public function test_reschedule_rejects_conflicts_wrong_staff_and_closed_statuses(): void
    {
        $first = $this->book($this->ana->id, '2026-10-20 10:00');
        $this->book($this->ana->id, '2026-10-20 12:00');
        $nails = $this->book($this->milica->id, '2026-10-20 10:00', [$this->nails->id]);

        $this->actingAsJwt($this->admin)->postJson("/api/appointments/{$first}/reschedule", ['staff_member_id' => $this->ana->id, 'starts_at' => '2026-10-20 11:30'])
            ->assertUnprocessable()->assertJsonValidationErrors('starts_at');

        $this->actingAsJwt($this->admin)->postJson("/api/appointments/{$first}/reschedule", ['staff_member_id' => $this->ana->id, 'starts_at' => '2026-10-20 10:30'])
            ->assertOk();

        $this->actingAsJwt($this->admin)->postJson("/api/appointments/{$nails}/reschedule", ['staff_member_id' => $this->ana->id, 'starts_at' => '2026-10-20 15:00'])
            ->assertUnprocessable()->assertJsonValidationErrors('staff_member_id');

        $this->actingAsJwt($this->admin)->postJson("/api/appointments/{$first}/status", ['status' => 'completed'])->assertOk();
        $this->actingAsJwt($this->admin)->postJson("/api/appointments/{$first}/reschedule", ['staff_member_id' => $this->ana->id, 'starts_at' => '2026-10-22 10:00'])
            ->assertUnprocessable()->assertJsonValidationErrors('appointment');
    }

    public function test_blocked_time_blocks_slots_and_reschedule_and_can_be_removed(): void
    {
        $id = $this->book($this->ana->id, '2026-10-20 10:00');

        $block = $this->actingAsJwt($this->admin)->postJson('/api/blocked-times', [
            'staff_member_id' => null, 'starts_at' => '2026-10-20 13:00', 'ends_at' => '2026-10-20 14:00', 'reason' => 'Sastanak',
        ])->assertCreated()->json('id');

        $this->actingAsJwt($this->admin)->postJson('/api/blocked-times/list', ['from' => '2026-10-20', 'to' => '2026-10-20'])
            ->assertOk()->assertJsonCount(1)->assertJsonPath('0.reason', 'Sastanak');

        $this->actingAsJwt($this->admin)->postJson("/api/appointments/{$id}/reschedule", ['staff_member_id' => $this->ana->id, 'starts_at' => '2026-10-20 12:30'])
            ->assertUnprocessable();

        $slots = collect($this->postJson('/api/availability/slots', ['service_ids' => [$this->cut->id], 'staff_member_id' => $this->milica->id, 'date' => '2026-10-20'])->json())->pluck('time');
        $this->assertNotContains('13:00', $slots);

        $this->actingAsJwt($this->admin)->deleteJson("/api/blocked-times/{$block}")->assertOk();
        $this->actingAsJwt($this->admin)->postJson("/api/appointments/{$id}/reschedule", ['staff_member_id' => $this->ana->id, 'starts_at' => '2026-10-20 12:30'])
            ->assertOk();
        $this->assertNull(Appointment::find($id)->reminder_sent_at);
    }
}

<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\BusinessSetting;
use App\Models\Service;
use App\Models\StaffMember;
use App\Models\User;
use App\Notifications\AdminAppointmentNotification;
use App\Notifications\AppointmentNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class ClientRescheduleTest extends TestCase
{
    use RefreshDatabase;

    private Service $cut;

    private StaffMember $ana;

    private StaffMember $milica;

    private User $client;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo('2026-10-19 08:00:00');
        BusinessSetting::current()->update(['booking_confirmation' => 'automatic']);

        $this->cut = Service::create(['name' => 'Šišanje', 'duration_minutes' => 60, 'price' => 1500]);
        $this->ana = $this->staff('Ana');
        $this->milica = $this->staff('Milica');
        $this->client = User::factory()->create(['email' => 'petar@example.com']);
        $this->admin = User::factory()->create(['role' => User::ROLE_OWNER, 'email' => 'salon@example.com']);
    }

    private function staff(string $name): StaffMember
    {
        $staff = StaffMember::create(['first_name' => $name, 'last_name' => 'Test']);
        $staff->services()->sync([$this->cut->id]);
        $staff->workingHours()->createMany(collect(range(1, 5))->map(fn ($d) => ['weekday' => $d, 'starts_at' => '09:00', 'ends_at' => '17:00'])->all());

        return $staff;
    }

    private function book(string $at, ?User $client = null, ?int $staffId = null): int
    {
        return $this->actingAsJwt($client ?? $this->client)->postJson('/api/bookings', [
            'service_ids' => [$this->cut->id], 'staff_member_id' => $staffId ?? $this->ana->id, 'starts_at' => $at,
        ])->assertCreated()->json('id');
    }

    private function move(int $id, string $at, ?int $staffId = null, ?User $as = null)
    {
        return $this->actingAsJwt($as ?? $this->client)->postJson("/api/my-appointments/{$id}/reschedule", [
            'staff_member_id' => $staffId, 'starts_at' => $at,
        ]);
    }

    public function test_client_moves_appointment_and_both_sides_are_notified(): void
    {
        $id = $this->book('2026-10-21 10:00');
        Notification::fake();

        $this->move($id, '2026-10-22 14:00', $this->ana->id)->assertOk()
            ->assertJsonPath('starts_at', '2026-10-22 14:00')
            ->assertJsonPath('ends_at', '2026-10-22 15:00')
            ->assertJsonPath('status', 'confirmed');

        Notification::assertSentTo($this->client, AppointmentNotification::class, fn ($n) => $n->type === AppointmentNotification::RESCHEDULED);
        Notification::assertSentTo($this->admin, AdminAppointmentNotification::class, fn ($n) => $n->type === AdminAppointmentNotification::CLIENT_RESCHEDULED && $n->previousStart === '2026-10-21 10:00');
    }

    public function test_own_slot_is_free_when_moving_by_half_an_hour(): void
    {
        $id = $this->book('2026-10-21 10:00');

        $slots = collect($this->actingAsJwt($this->client)->postJson('/api/availability/slots', [
            'service_ids' => [$this->cut->id], 'staff_member_id' => $this->ana->id, 'date' => '2026-10-21', 'ignore_appointment_id' => $id,
        ])->json())->pluck('time');
        $this->assertContains('10:30', $slots);

        $foreign = collect($this->actingAsJwt(User::factory()->create())->postJson('/api/availability/slots', [
            'service_ids' => [$this->cut->id], 'staff_member_id' => $this->ana->id, 'date' => '2026-10-21', 'ignore_appointment_id' => $id,
        ])->json())->pluck('time');
        $this->assertNotContains('10:30', $foreign);

        $this->move($id, '2026-10-21 10:30', $this->ana->id)->assertOk();
    }

    public function test_manual_mode_puts_moved_appointment_back_to_pending(): void
    {
        $this->ana->update(['booking_confirmation' => 'manual']);
        $id = $this->book('2026-10-21 10:00');
        $this->actingAsJwt($this->admin)->postJson("/api/appointments/{$id}/status", ['status' => 'confirmed'])->assertOk();

        $this->move($id, '2026-10-21 13:00', $this->ana->id)->assertOk()->assertJsonPath('status', 'pending');
        $this->assertNull(Appointment::find($id)->confirmed_at);
    }

    public function test_any_staff_prefers_current_then_falls_back(): void
    {
        $id = $this->book('2026-10-21 10:00');
        $other = User::factory()->create();
        $this->book('2026-10-22 12:00', $other, $this->ana->id);

        $this->move($id, '2026-10-22 09:00')->assertOk()->assertJsonPath('staff_member_id', $this->ana->id);
        $this->move($id, '2026-10-22 12:00')->assertOk()->assertJsonPath('staff_member_id', $this->milica->id);
    }

    public function test_rules_deadline_conflicts_and_ownership(): void
    {
        $id = $this->book('2026-10-21 10:00');
        $this->book('2026-10-22 10:00', User::factory()->create(), $this->ana->id);

        $this->move($id, '2026-10-19 14:00', $this->ana->id)->assertUnprocessable()->assertJsonValidationErrors('starts_at');
        $this->move($id, '2026-10-22 10:30', $this->ana->id)->assertUnprocessable()->assertJsonValidationErrors('starts_at');
        $this->move($id, '2026-10-22 16:30', $this->ana->id)->assertUnprocessable();
        $this->move($id, '2026-10-22 14:00', $this->ana->id, User::factory()->create())->assertNotFound();

        $this->travelTo('2026-10-21 07:00:00');
        $this->move($id, '2026-10-23 10:00', $this->ana->id)->assertUnprocessable()
            ->assertJsonPath('errors.appointment.0', 'Promena termina je moguća najkasnije dan pre termina — pozovi salon.');
    }
}

<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Appointment;
use App\Models\BusinessSetting;
use App\Models\Service;
use App\Models\StaffMember;
use App\Models\User;
use App\Notifications\AppointmentNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class ChangeNoticeTest extends TestCase
{
    use RefreshDatabase;

    private StaffMember $ana;

    private StaffMember $milica;

    private User $admin;

    private User $client;

    private int $id;

    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo('2026-10-19 08:00:00');
        BusinessSetting::current()->update(['booking_confirmation' => 'automatic']);

        $cut = Service::create(['name' => 'Šišanje', 'duration_minutes' => 45, 'price' => 1500]);
        $this->ana = $this->staff('Ana', $cut);
        $this->milica = $this->staff('Milica', $cut);
        $this->admin = User::factory()->create(['role' => UserRole::Owner]);
        $this->client = User::factory()->create();

        $this->id = $this->actingAsJwt($this->admin)->postJson('/api/appointments', [
            'client_id' => $this->client->id,
            'service_ids' => [$cut->id],
            'staff_member_id' => $this->ana->id,
            'starts_at' => '2026-10-20 10:00',
        ])->assertCreated()->json('appointments.0.id');
    }

    private function staff(string $name, Service $service): StaffMember
    {
        $staff = StaffMember::create(['first_name' => $name, 'last_name' => 'Test']);
        $staff->services()->sync([$service->id]);
        $staff->workingHours()->createMany(collect(range(1, 5))->map(fn ($d) => ['weekday' => $d, 'starts_at' => '09:00', 'ends_at' => '17:00'])->all());

        return $staff;
    }

    private function drag(int $staffId, string $at): void
    {
        $this->actingAsJwt($this->admin)->postJson("/api/appointments/{$this->id}/reschedule", [
            'staff_member_id' => $staffId,
            'starts_at' => $at,
            'delay_notice' => true,
        ])->assertOk();
    }

    public function test_several_drags_send_one_notice_two_minutes_after_the_last(): void
    {
        Notification::fake();

        $this->drag($this->milica->id, '2026-10-20 12:00');
        $this->travel(1)->minutes();
        $this->drag($this->milica->id, '2026-10-20 13:00');
        $this->travel(90)->seconds();
        $this->artisan('appointments:send-change-notices')->assertSuccessful();
        Notification::assertNothingSentTo($this->client);

        $this->travel(1)->minutes();
        $this->artisan('appointments:send-change-notices')->assertSuccessful();

        Notification::assertSentToTimes($this->client, AppointmentNotification::class, 1);
        Notification::assertSentTo($this->client, AppointmentNotification::class, fn ($n) => $n->type === AppointmentNotification::TRANSFERRED && $n->previousStaffName === 'Ana' && $n->timeChanged);
        $this->assertNull(Appointment::find($this->id)->change_notice_at);
    }

    public function test_drag_back_to_original_sends_nothing(): void
    {
        Notification::fake();

        $this->drag($this->milica->id, '2026-10-20 12:00');
        $this->drag($this->ana->id, '2026-10-20 10:00');
        $this->travel(3)->minutes();
        $this->artisan('appointments:send-change-notices')->assertSuccessful();

        Notification::assertNothingSentTo($this->client);
    }

    public function test_cancelled_meanwhile_sends_no_move_notice(): void
    {
        $this->drag($this->ana->id, '2026-10-20 12:00');
        $this->actingAsJwt($this->admin)->postJson("/api/appointments/{$this->id}/status", ['status' => 'cancelled'])->assertOk();
        Notification::fake();

        $this->travel(3)->minutes();
        $this->artisan('appointments:send-change-notices')->assertSuccessful();

        Notification::assertNothingSentTo($this->client);
    }

    public function test_explicit_transfer_sends_at_once_and_replaces_pending_notice(): void
    {
        Notification::fake();

        $this->drag($this->ana->id, '2026-10-20 12:00');
        $this->actingAsJwt($this->admin)->postJson("/api/appointments/{$this->id}/reschedule", [
            'staff_member_id' => $this->milica->id,
            'starts_at' => '2026-10-20 12:00',
        ])->assertOk();

        Notification::assertSentTo($this->client, AppointmentNotification::class, fn ($n) => $n->type === AppointmentNotification::TRANSFERRED && $n->timeChanged);

        $this->travel(3)->minutes();
        $this->artisan('appointments:send-change-notices')->assertSuccessful();
        Notification::assertSentToTimes($this->client, AppointmentNotification::class, 1);
    }
}

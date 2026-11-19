<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\BusinessSetting;
use App\Models\Service;
use App\Models\StaffMember;
use App\Models\User;
use App\Models\WaitlistEntry;
use App\Notifications\WaitlistNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class WaitlistTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private User $booked;

    private User $waiting;

    private Service $cut;

    private StaffMember $ana;

    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo('2026-10-14 08:00:00');
        Notification::fake();
        BusinessSetting::current()->update(['slot_interval_minutes' => 60]);

        $this->admin = User::factory()->create(['role' => User::ROLE_OWNER]);
        $this->booked = User::factory()->create();
        $this->waiting = User::factory()->create();
        $this->cut = Service::create(['name' => 'Šišanje', 'duration_minutes' => 60, 'price' => 2000]);
        $this->ana = StaffMember::create(['first_name' => 'Ana', 'last_name' => 'Test']);
        $this->ana->services()->sync([$this->cut->id]);
        $this->ana->workingHours()->create(['weekday' => 4, 'starts_at' => '09:00', 'ends_at' => '11:00']);
    }

    private function fillDay(): array
    {
        return collect(['09:00', '10:00'])->map(fn ($time) => Appointment::find($this->actingAsJwt($this->admin)->postJson('/api/appointments', [
            'client_id' => $this->booked->id,
            'service_ids' => [$this->cut->id],
            'staff_member_id' => $this->ana->id,
            'starts_at' => "2026-10-15 {$time}",
        ])->assertCreated()->json('appointments.0.id')))->all();
    }

    private function join(array $extra = [])
    {
        return $this->actingAsJwt($this->waiting)->postJson('/api/my-waitlist', ['service_ids' => [$this->cut->id], 'date' => '2026-10-15', ...$extra]);
    }

    public function test_full_day_is_open_but_unavailable_and_client_can_join(): void
    {
        $this->fillDay();

        $day = collect($this->actingAsJwt($this->waiting)->postJson('/api/availability/days', ['service_ids' => [$this->cut->id], 'from' => '2026-10-15', 'days' => 2])->json())->keyBy('date');
        $this->assertFalse($day['2026-10-15']['available']);
        $this->assertTrue($day['2026-10-15']['open']);
        $this->assertFalse($day['2026-10-16']['open']);

        $this->join(['part' => 'morning'])->assertCreated()->assertJsonPath('part_label', 'pre podne');
        $this->join()->assertCreated();
        $this->assertSame(1, WaitlistEntry::count());

        $this->actingAsJwt($this->waiting)->postJson('/api/my-waitlist', ['service_ids' => [$this->cut->id], 'date' => '2026-10-16'])->assertUnprocessable();
        $this->actingAsJwt($this->waiting)->postJson('/api/my-waitlist/list')->assertJsonCount(1)->assertJsonPath('0.services', 'Šišanje');
    }

    public function test_cancellation_notifies_waiting_client_once(): void
    {
        [$first] = $this->fillDay();
        $this->join(['part' => 'morning'])->assertCreated();

        $this->actingAsJwt($this->admin)->postJson("/api/appointments/{$first->id}/status", ['status' => 'cancelled'])->assertOk();

        Notification::assertSentTo($this->waiting, WaitlistNotification::class, fn ($n) => $n->times === ['09:00']);
        Notification::assertNotSentTo($this->booked, WaitlistNotification::class);
        $this->assertNotNull(WaitlistEntry::first()->notified_at);
    }

    public function test_part_of_day_must_match_freed_time(): void
    {
        [, $second] = $this->fillDay();
        $this->ana->workingHours()->update(['ends_at' => '15:00']);
        $this->join(['part' => 'afternoon'])->assertCreated();

        $this->actingAsJwt($this->admin)->postJson("/api/appointments/{$second->id}/status", ['status' => 'cancelled'])->assertOk();

        Notification::assertSentTo($this->waiting, WaitlistNotification::class, fn ($n) => ! in_array('10:00', $n->times, true));
    }

    public function test_booking_fulfils_entry_and_disabled_waitlist_does_nothing(): void
    {
        [$first] = $this->fillDay();
        $this->join()->assertCreated();
        $first->update(['status' => 'cancelled']);

        $this->actingAsJwt($this->waiting)->postJson('/api/bookings', ['service_ids' => [$this->cut->id], 'staff_member_id' => $this->ana->id, 'starts_at' => '2026-10-15 09:00'])->assertCreated();
        $this->assertNotNull(WaitlistEntry::first()->fulfilled_at);
        $this->actingAsJwt($this->waiting)->postJson('/api/my-waitlist/list')->assertJsonCount(0);

        BusinessSetting::current()->update(['waitlist_enabled' => false]);
        $this->join()->assertUnprocessable();
    }

    public function test_client_and_admin_remove_entries(): void
    {
        $this->fillDay();
        $id = $this->join()->json('id');

        $this->actingAsJwt($this->booked)->deleteJson("/api/my-waitlist/{$id}")->assertNotFound();
        $this->actingAsJwt($this->admin)->postJson('/api/waitlist/list')->assertJsonCount(1)->assertJsonPath('0.client.id', $this->waiting->id);
        $this->actingAsJwt($this->waiting)->deleteJson("/api/my-waitlist/{$id}")->assertOk();
        $this->assertSame(0, WaitlistEntry::count());
    }
}

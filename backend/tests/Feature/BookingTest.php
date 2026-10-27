<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\BlockedTime;
use App\Models\BusinessSetting;
use App\Models\Promotion;
use App\Models\Service;
use App\Models\StaffMember;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BookingTest extends TestCase
{
    use RefreshDatabase;

    private Service $cut;

    private Service $blow;

    private StaffMember $ana;

    private StaffMember $milica;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo('2026-10-19 08:00:00');

        BusinessSetting::current()->update([
            'booking_confirmation' => 'manual',
            'slot_interval_minutes' => 15,
            'booking_lead_minutes' => 60,
            'booking_horizon_days' => 60,
            'booking_min_days_ahead' => 0,
            'cancellation_days_before' => 1,
            'allow_guest_booking' => true,
        ]);

        $this->cut = Service::create(['name' => 'Šišanje', 'duration_minutes' => 30, 'price' => 1500]);
        $this->blow = Service::create(['name' => 'Feniranje', 'duration_minutes' => 30, 'price' => 1200]);

        $this->ana = $this->staff('Ana', null, [$this->cut->id, $this->blow->id]);
        $this->milica = $this->staff('Milica', 'automatic', [$this->cut->id]);
        $this->admin = User::factory()->create(['role' => User::ROLE_OWNER]);
    }

    private function staff(string $name, ?string $mode, array $serviceIds): StaffMember
    {
        $staff = StaffMember::create(['first_name' => $name, 'last_name' => 'Test', 'booking_confirmation' => $mode]);
        $staff->services()->sync($serviceIds);
        $staff->workingHours()->createMany(collect([1, 2, 3, 4, 5])->map(fn ($d) => ['weekday' => $d, 'starts_at' => '09:00', 'ends_at' => '17:00'])->all());

        return $staff;
    }

    private function guestBooking(array $overrides = []): \Illuminate\Testing\TestResponse
    {
        $this->app['auth']->forgetGuards();

        return $this->withoutToken()->postJson('/api/bookings', [
            'service_ids' => [$this->cut->id],
            'staff_member_id' => $this->ana->id,
            'starts_at' => '2026-10-20 10:00',
            'guest' => ['first_name' => 'Marija', 'last_name' => 'Marković', 'phone' => '064 111 2222'],
            ...$overrides,
        ]);
    }

    private function slotTimes(string $date, ?int $staffId, array $serviceIds): array
    {
        return collect($this->postJson('/api/availability/slots', [
            'service_ids' => $serviceIds, 'staff_member_id' => $staffId, 'date' => $date,
        ])->assertOk()->json())->pluck('time')->all();
    }

    public function test_slots_follow_working_hours_bookings_and_blocks(): void
    {
        $times = $this->slotTimes('2026-10-20', $this->ana->id, [$this->cut->id, $this->blow->id]);
        $this->assertSame('09:00', $times[0]);
        $this->assertSame('16:00', end($times));

        $this->guestBooking()->assertCreated();
        BlockedTime::create(['staff_member_id' => null, 'starts_at' => '2026-10-20 12:00', 'ends_at' => '2026-10-20 13:00']);

        $times = $this->slotTimes('2026-10-20', $this->ana->id, [$this->cut->id]);
        $this->assertNotContains('09:45', $times);
        $this->assertNotContains('10:15', $times);
        $this->assertContains('09:30', $times);
        $this->assertContains('10:30', $times);
        $this->assertNotContains('12:30', $times);
        $this->assertContains('13:00', $times);

        $this->assertSame([], $this->slotTimes('2026-10-25', $this->ana->id, [$this->cut->id]));
        $this->assertNotContains('08:45', $this->slotTimes('2026-10-19', $this->ana->id, [$this->cut->id]));
        $this->assertSame('09:00', $this->slotTimes('2026-10-19', $this->ana->id, [$this->cut->id])[0]);
    }

    public function test_browsing_availability_does_not_use_up_booking_or_login_limits(): void
    {
        for ($i = 0; $i < 15; $i++) {
            $this->postJson('/api/availability/days', ['service_ids' => [$this->cut->id], 'from' => '2026-10-19', 'days' => 3])->assertOk();
        }

        $this->guestBooking()->assertCreated();
        $this->postJson('/api/auth/login', ['email' => 'nema@example.com', 'password' => 'x'])->assertUnprocessable();
    }

    public function test_guest_booking_is_pending_and_slot_cannot_be_taken_twice(): void
    {
        $response = $this->guestBooking()->assertCreated()
            ->assertJsonPath('status', 'pending')
            ->assertJsonPath('ends_at', '2026-10-20 10:30');

        $client = User::findOrFail($response->json('client_id'));
        $this->assertNull($client->password);

        $this->guestBooking(['guest' => ['first_name' => 'Ana', 'last_name' => 'B', 'phone' => '065 000 0000']])
            ->assertUnprocessable()->assertJsonValidationErrors('starts_at');

        $this->guestBooking(['starts_at' => '2026-10-20 11:00', 'guest' => ['first_name' => 'Marija', 'last_name' => 'M', 'phone' => '+064 111-2222']])
            ->assertCreated()->assertJsonPath('client_id', $client->id);
    }

    public function test_booking_rules_and_guest_with_existing_account(): void
    {
        $this->guestBooking(['starts_at' => '2026-10-19 08:30'])->assertUnprocessable();
        $this->guestBooking(['starts_at' => '2027-03-01 10:00'])->assertUnprocessable();
        $this->guestBooking(['starts_at' => '2026-10-20 16:45'])->assertUnprocessable();

        User::factory()->create(['email' => 'petar@example.com']);
        $this->guestBooking(['guest' => ['first_name' => 'Petar', 'last_name' => 'P', 'phone' => '061', 'email' => 'petar@example.com']])
            ->assertUnprocessable()->assertJsonValidationErrors('guest.email');

        BusinessSetting::current()->update(['allow_guest_booking' => false]);
        $this->guestBooking()->assertUnprocessable()->assertJsonValidationErrors('guest');
    }

    public function test_any_staff_and_automatic_confirmation(): void
    {
        $this->guestBooking()->assertCreated();

        $this->guestBooking(['staff_member_id' => null, 'guest' => ['first_name' => 'Ivana', 'last_name' => 'I', 'phone' => '062']])
            ->assertCreated()
            ->assertJsonPath('staff_member_id', $this->milica->id)
            ->assertJsonPath('status', 'confirmed');

        $this->guestBooking(['staff_member_id' => null, 'guest' => ['first_name' => 'Jelena', 'last_name' => 'J', 'phone' => '063']])
            ->assertUnprocessable();
    }

    public function test_logged_in_client_books_with_package_price_and_cancels(): void
    {
        Promotion::create(['name' => 'Paket', 'type' => 'package', 'package_price' => 2200])->services()->sync([$this->cut->id, $this->blow->id]);
        $client = User::factory()->create();

        $id = $this->actingAsJwt($client)->postJson('/api/bookings', [
            'service_ids' => [$this->cut->id, $this->blow->id],
            'staff_member_id' => $this->ana->id,
            'starts_at' => '2026-10-21 09:00',
        ])->assertCreated()->assertJsonPath('total', fn ($v) => (float) $v === 2200.0)->assertJsonPath('items.0.promotion_name', 'Paket')->json('id');

        $this->actingAsJwt($client)->postJson('/api/my-appointments/list', ['scope' => 'upcoming'])
            ->assertOk()->assertJsonPath('0.can_cancel', true);

        $this->actingAsJwt($client)->postJson("/api/my-appointments/{$id}/cancel")->assertOk()->assertJsonPath('status', 'cancelled');

        $soon = $this->actingAsJwt($client)->postJson('/api/bookings', [
            'service_ids' => [$this->cut->id], 'staff_member_id' => $this->ana->id, 'starts_at' => '2026-10-19 15:00',
        ])->assertCreated()->json('id');

        $this->actingAsJwt($client)->postJson("/api/my-appointments/{$soon}/cancel")->assertUnprocessable();
        $this->actingAsJwt(User::factory()->create())->postJson("/api/my-appointments/{$soon}/cancel")->assertNotFound();
    }

    public function test_admin_recurring_series_skips_conflicts_and_can_be_stopped(): void
    {
        $client = User::factory()->create();
        $other = User::factory()->create();

        $this->actingAsJwt($this->admin)->postJson('/api/appointments', [
            'client_id' => $other->id, 'service_ids' => [$this->cut->id], 'staff_member_id' => $this->ana->id, 'starts_at' => '2026-11-02 15:00',
        ])->assertCreated()->assertJsonPath('appointments.0.status', 'confirmed');

        $response = $this->actingAsJwt($this->admin)->postJson('/api/appointments', [
            'client_id' => $client->id,
            'service_ids' => [$this->cut->id],
            'staff_member_id' => $this->ana->id,
            'starts_at' => '2026-10-19 15:00',
            'recurrence' => ['interval_weeks' => 1, 'count' => 4],
        ])->assertCreated();

        $this->assertCount(3, $response->json('appointments'));
        $this->assertSame(['2026-11-02 15:00'], $response->json('skipped'));

        $first = $response->json('appointments.0.id');
        $this->actingAsJwt($this->admin)->postJson("/api/appointments/{$first}/cancel", ['scope' => 'series'])->assertOk();

        $this->assertSame(0, Appointment::where('client_id', $client->id)->whereIn('status', Appointment::BLOCKING_STATUSES)->count());
        $this->actingAsJwt($this->admin)->postJson('/api/recurrences/list')->assertOk()->assertJsonCount(0);
    }

    public function test_open_ended_recurrence_is_extended_by_command(): void
    {
        $client = User::factory()->create();

        $this->actingAsJwt($this->admin)->postJson('/api/appointments', [
            'client_id' => $client->id, 'service_ids' => [$this->cut->id], 'staff_member_id' => $this->ana->id,
            'starts_at' => '2026-10-19 15:00', 'recurrence' => ['interval_weeks' => 2],
        ])->assertCreated()->assertJsonCount(5, 'appointments');

        $this->travelTo('2026-11-16 08:00:00');
        $this->artisan('appointments:extend-recurring')->assertSuccessful();

        $this->assertSame(7, Appointment::where('client_id', $client->id)->count());
        $this->assertSame('2027-01-11 15:00', Appointment::where('client_id', $client->id)->orderByDesc('starts_at')->first()->starts_at->format('Y-m-d H:i'));
    }

    public function test_admin_status_changes_and_list(): void
    {
        $id = $this->guestBooking()->json('id');

        $this->actingAsJwt($this->admin)->postJson('/api/appointments/pending-count')->assertJsonPath('count', 1);
        $this->actingAsJwt($this->admin)->postJson("/api/appointments/{$id}/status", ['status' => 'confirmed'])->assertOk();
        $this->actingAsJwt($this->admin)->postJson('/api/appointments/list', ['from' => '2026-10-20', 'to' => '2026-10-20', 'search' => 'Mark'])
            ->assertOk()->assertJsonCount(1)->assertJsonPath('0.status', 'confirmed');

        $this->actingAsJwt($this->admin)->postJson("/api/appointments/{$id}/status", ['status' => 'cancelled'])->assertOk();
        $this->guestBooking(['guest' => ['first_name' => 'Nova', 'last_name' => 'N', 'phone' => '069']])->assertCreated();
        $this->actingAsJwt($this->admin)->postJson("/api/appointments/{$id}/status", ['status' => 'confirmed'])
            ->assertUnprocessable();
    }
}

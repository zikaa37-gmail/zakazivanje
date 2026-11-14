<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\BusinessSetting;
use App\Models\CancellationFee;
use App\Models\Service;
use App\Models\StaffMember;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LinkedBookingTest extends TestCase
{
    use RefreshDatabase;

    private Service $cut;

    private Service $massage;

    private Service $wax;

    private StaffMember $ana;

    private StaffMember $marko;

    private User $client;

    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo('2026-10-19 08:00:00');
        BusinessSetting::current()->update([
            'booking_confirmation' => 'automatic',
            'slot_interval_minutes' => 30,
            'booking_min_days_ahead' => 1,
            'cancellation_days_before' => 1,
        ]);

        $this->cut = Service::create(['name' => 'Šišanje', 'duration_minutes' => 60, 'price' => 2000]);
        $this->massage = Service::create(['name' => 'Masaža', 'duration_minutes' => 60, 'price' => 4000]);
        $this->wax = Service::create(['name' => 'Depilacija', 'duration_minutes' => 30, 'price' => 1500]);
        $this->ana = $this->staff('Ana', [$this->cut->id]);
        $this->marko = $this->staff('Marko', [$this->massage->id, $this->wax->id]);
        $this->client = User::factory()->create(['email' => 'petar@example.com']);
    }

    private function staff(string $name, array $serviceIds): StaffMember
    {
        $staff = StaffMember::create(['first_name' => $name, 'last_name' => 'Test']);
        $staff->services()->sync($serviceIds);
        $staff->workingHours()->createMany(collect(range(1, 5))->map(fn ($d) => ['weekday' => $d, 'starts_at' => '09:00', 'ends_at' => '17:00'])->all());

        return $staff;
    }

    private function bookLinked(string $at = '2026-10-20 10:00')
    {
        return $this->actingAsJwt($this->client)->postJson('/api/bookings', [
            'service_ids' => [$this->cut->id],
            'linked_service_ids' => [$this->massage->id, $this->wax->id],
            'starts_at' => $at,
        ]);
    }

    private function slotTimes(array $extra = []): array
    {
        return collect($this->actingAsJwt($this->client)->postJson('/api/availability/slots', [
            'service_ids' => [$this->cut->id], 'date' => '2026-10-20', ...$extra,
        ])->assertOk()->json())->pluck('time')->all();
    }

    public function test_linked_services_are_booked_back_to_back_with_another_staff_member(): void
    {
        $response = $this->bookLinked()->assertCreated()
            ->assertJsonPath('staff_member_id', $this->ana->id)
            ->assertJsonPath('total', 2000)
            ->assertJsonPath('linked.0.staff_member_id', $this->marko->id)
            ->assertJsonPath('linked.0.starts_at', '2026-10-20 11:00')
            ->assertJsonPath('linked.0.ends_at', '2026-10-20 12:30')
            ->assertJsonPath('linked.0.total', 5500);

        $this->assertNotNull($response->json('link_group'));
        $this->assertSame(2, Appointment::where('link_group', $response->json('link_group'))->count());
    }

    public function test_slots_require_linked_service_to_be_free_right_after(): void
    {
        Appointment::create(['client_id' => $this->client->id, 'staff_member_id' => $this->marko->id, 'starts_at' => '2026-10-20 11:00', 'ends_at' => '2026-10-20 12:00', 'status' => 'confirmed', 'source' => 'admin', 'price' => 0, 'discount' => 0, 'total' => 0]);

        $this->assertContains('10:00', $this->slotTimes());
        $linked = $this->slotTimes(['linked_service_ids' => [$this->massage->id]]);
        $this->assertNotContains('10:00', $linked);
        $this->assertContains('11:00', $linked);
        $this->assertNotContains('16:00', $linked);

        $this->bookLinked()->assertUnprocessable()->assertJsonValidationErrors('starts_at');
        $this->assertSame(1, Appointment::count());
    }

    public function test_client_cancels_all_or_only_part_of_the_group(): void
    {
        $head = $this->bookLinked()->json();
        $linkedId = $head['linked'][0]['id'];

        $this->actingAsJwt($this->client)->postJson("/api/my-appointments/{$linkedId}/cancel")->assertOk()->assertJsonPath('cancelled_ids', [$linkedId]);
        $this->assertSame('confirmed', Appointment::find($head['id'])->status);

        $other = $this->bookLinked('2026-10-21 10:00')->json();
        $this->actingAsJwt($this->client)->postJson("/api/my-appointments/{$other['id']}/cancel", ['linked_ids' => [$other['linked'][0]['id']]])
            ->assertOk()->assertJsonCount(2, 'cancelled_ids');
        $this->assertSame(2, Appointment::where('link_group', $other['link_group'])->where('status', 'cancelled')->count());
    }

    public function test_reschedule_moves_the_whole_chain(): void
    {
        $head = $this->bookLinked()->json();

        $this->actingAsJwt($this->client)->postJson("/api/my-appointments/{$head['linked'][0]['id']}/reschedule", ['starts_at' => '2026-10-21 13:00'])
            ->assertOk()->assertJsonPath('id', $head['id'])->assertJsonPath('starts_at', '2026-10-21 13:00');

        $linked = Appointment::find($head['linked'][0]['id']);
        $this->assertSame('2026-10-21 14:00', $linked->starts_at->format('Y-m-d H:i'));
        $this->assertSame($this->marko->id, $linked->staff_member_id);
    }

    public function test_late_cancellation_of_the_group_counts_once(): void
    {
        BusinessSetting::current()->update(['cancellation_fee_enabled' => true, 'cancellation_free_late' => 0, 'cancellation_fee_type' => 'percent', 'cancellation_fee_value' => 50]);
        $head = $this->bookLinked()->json();
        $this->travelTo('2026-10-20 08:00:00');

        $this->actingAsJwt($this->client)->postJson("/api/my-appointments/{$head['id']}/cancel-preview", ['linked_ids' => [$head['linked'][0]['id']]])
            ->assertJsonPath('amount', 3750)->assertJsonPath('number', 1);
        $this->actingAsJwt($this->client)->postJson("/api/my-appointments/{$head['id']}/cancel", ['linked_ids' => [$head['linked'][0]['id']], 'accept_late' => true])
            ->assertOk()->assertJsonPath('cancellation_fee.amount', 3750);
        $this->assertSame(1, CancellationFee::count());
    }

    public function test_linked_booking_can_be_turned_off(): void
    {
        BusinessSetting::current()->update(['linked_booking_enabled' => false]);

        $this->bookLinked()->assertUnprocessable()->assertJsonValidationErrors('linked_service_ids');
    }
}

<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\BusinessSetting;
use App\Models\Service;
use App\Models\StaffMember;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProcessingTimeTest extends TestCase
{
    use RefreshDatabase;

    private Service $color;

    private Service $cut;

    private StaffMember $ana;

    private User $admin;

    private User $client;

    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo('2026-10-19 08:00:00');
        BusinessSetting::current()->update(['booking_confirmation' => 'automatic', 'booking_min_days_ahead' => 0, 'booking_lead_minutes' => 0]);

        $this->color = Service::create(['name' => 'Farbanje', 'duration_minutes' => 90, 'processing_after_minutes' => 30, 'processing_minutes' => 45, 'price' => 4000]);
        $this->cut = Service::create(['name' => 'Šišanje', 'duration_minutes' => 30, 'price' => 1500]);
        $this->ana = StaffMember::create(['first_name' => 'Ana', 'last_name' => 'Test']);
        $this->ana->services()->sync([$this->color->id, $this->cut->id]);
        $this->ana->workingHours()->createMany(collect(range(1, 5))->map(fn ($d) => ['weekday' => $d, 'starts_at' => '09:00', 'ends_at' => '17:00'])->all());
        $this->admin = User::factory()->create(['role' => UserRole::Owner]);
        $this->client = User::factory()->create();
    }

    private function salonBook(string $at, int $serviceId)
    {
        return $this->actingAsJwt($this->admin)->postJson('/api/appointments', [
            'client_id' => User::factory()->create()->id,
            'service_ids' => [$serviceId],
            'staff_member_id' => $this->ana->id,
            'starts_at' => $at,
        ]);
    }

    public function test_salon_can_book_inside_waiting_time_but_not_over_work(): void
    {
        $this->salonBook('2026-10-20 10:00', $this->color->id)->assertCreated()
            ->assertJsonPath('appointments.0.processing_offset', 30)
            ->assertJsonPath('appointments.0.processing_minutes', 45);

        $this->salonBook('2026-10-20 10:30', $this->cut->id)->assertCreated();
        $this->salonBook('2026-10-20 11:00', $this->cut->id)->assertUnprocessable();
        $this->salonBook('2026-10-20 10:15', $this->cut->id)->assertUnprocessable();
        $this->salonBook('2026-10-20 11:15', $this->cut->id)->assertUnprocessable();
    }

    public function test_waiting_time_is_not_offered_online(): void
    {
        $this->salonBook('2026-10-20 10:00', $this->color->id)->assertCreated();

        $online = collect($this->postJson('/api/availability/slots', ['service_ids' => [$this->cut->id], 'staff_member_id' => $this->ana->id, 'date' => '2026-10-20'])->json())->pluck('time');
        $this->assertNotContains('10:30', $online);
        $this->assertContains('11:30', $online);

        $salon = collect($this->actingAsJwt($this->admin)->postJson('/api/availability/slots', ['service_ids' => [$this->cut->id], 'staff_member_id' => $this->ana->id, 'date' => '2026-10-20', 'salon' => true])->json())->pluck('time');
        $this->assertContains('10:30', $salon);
        $this->assertNotContains('11:15', $salon);

        $asClient = collect($this->actingAsJwt($this->client)->postJson('/api/availability/slots', ['service_ids' => [$this->cut->id], 'staff_member_id' => $this->ana->id, 'date' => '2026-10-20', 'salon' => true])->json())->pluck('time');
        $this->assertNotContains('10:30', $asClient);
    }

    public function test_colouring_can_be_booked_around_an_existing_short_appointment(): void
    {
        $this->salonBook('2026-10-20 10:45', $this->cut->id)->assertCreated();
        $this->salonBook('2026-10-20 10:00', $this->color->id)->assertCreated();
    }

    public function test_service_waiting_time_must_leave_finishing_work(): void
    {
        $payload = ['name' => 'Pramenovi', 'duration_minutes' => 60, 'price' => 3000, 'processing_after_minutes' => 20, 'processing_minutes' => 40];

        $this->actingAsJwt($this->admin)->postJson('/api/services', $payload)
            ->assertUnprocessable()->assertJsonValidationErrors('processing_minutes');

        $this->actingAsJwt($this->admin)->postJson('/api/services', [...$payload, 'processing_minutes' => 30])
            ->assertCreated()->assertJsonPath('processing_minutes', 30);
    }
}

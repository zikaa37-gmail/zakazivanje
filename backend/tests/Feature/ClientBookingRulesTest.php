<?php

namespace Tests\Feature;

use App\Models\BusinessSetting;
use App\Models\Service;
use App\Models\StaffMember;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ClientBookingRulesTest extends TestCase
{
    use RefreshDatabase;

    private Service $cut;

    private StaffMember $ana;

    private User $client;

    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo('2026-10-19 08:00:00');

        $this->cut = Service::create(['name' => 'Šišanje', 'duration_minutes' => 30, 'price' => 1500]);
        $this->ana = StaffMember::create(['first_name' => 'Ana', 'last_name' => 'Test']);
        $this->ana->services()->sync([$this->cut->id]);
        $this->ana->workingHours()->createMany(collect(range(1, 5))->map(fn ($d) => ['weekday' => $d, 'starts_at' => '09:00', 'ends_at' => '17:00'])->all());
        $this->client = User::factory()->create();
    }

    private function book(string $at)
    {
        return $this->actingAsJwt($this->client)->postJson('/api/bookings', [
            'service_ids' => [$this->cut->id], 'staff_member_id' => $this->ana->id, 'starts_at' => $at,
        ]);
    }

    private function slots(string $date): array
    {
        return collect($this->postJson('/api/availability/slots', [
            'service_ids' => [$this->cut->id], 'staff_member_id' => $this->ana->id, 'date' => $date,
        ])->json())->pluck('time')->all();
    }

    public function test_defaults_are_tomorrow_and_day_before(): void
    {
        $settings = BusinessSetting::current();
        $this->assertSame(1, $settings->booking_min_days_ahead);
        $this->assertSame(1, $settings->cancellation_days_before);
    }

    public function test_client_cannot_book_for_today_but_admin_can(): void
    {
        $this->assertSame([], $this->slots('2026-10-19'));
        $this->assertSame('09:00', $this->slots('2026-10-20')[0]);

        $this->book('2026-10-19 14:00')->assertUnprocessable()
            ->assertJsonPath('errors.starts_at.0', 'Online se zakazuje najranije za sutra.');
        $this->book('2026-10-20 09:00')->assertCreated();

        $admin = User::factory()->create(['role' => User::ROLE_OWNER]);
        $this->actingAsJwt($admin)->postJson('/api/appointments', [
            'client_id' => $this->client->id, 'service_ids' => [$this->cut->id], 'staff_member_id' => $this->ana->id, 'starts_at' => '2026-10-19 14:00',
        ])->assertCreated();
    }

    public function test_same_day_booking_can_be_enabled(): void
    {
        BusinessSetting::current()->update(['booking_min_days_ahead' => 0]);

        $this->assertContains('14:00', $this->slots('2026-10-19'));
        $this->book('2026-10-19 14:00')->assertCreated();
    }

    public function test_client_cancels_until_end_of_previous_day(): void
    {
        $id = $this->book('2026-10-20 10:00')->assertCreated()->json('id');

        $this->actingAsJwt($this->client)->postJson('/api/my-appointments/list', ['scope' => 'upcoming'])
            ->assertJsonPath('0.can_cancel', true);

        $this->travelTo('2026-10-19 23:50:00');
        $this->actingAsJwt($this->client)->postJson('/api/my-appointments/list', ['scope' => 'upcoming'])
            ->assertJsonPath('0.can_cancel', true);

        $this->travelTo('2026-10-20 07:00:00');
        $this->actingAsJwt($this->client)->postJson('/api/my-appointments/list', ['scope' => 'upcoming'])
            ->assertJsonPath('0.can_cancel', false);
        $this->actingAsJwt($this->client)->postJson("/api/my-appointments/{$id}/cancel")
            ->assertUnprocessable()
            ->assertJsonPath('errors.appointment.0', 'Otkazivanje je moguće najkasnije dan pre termina — pozovi salon.');
    }

    public function test_cancellation_until_start_and_two_days_before(): void
    {
        BusinessSetting::current()->update(['cancellation_days_before' => 0]);
        $id = $this->book('2026-10-21 10:00')->json('id');

        $this->travelTo('2026-10-21 09:30:00');
        $this->actingAsJwt($this->client)->postJson('/api/my-appointments/list', ['scope' => 'upcoming'])->assertJsonPath('0.can_cancel', true);

        BusinessSetting::current()->update(['cancellation_days_before' => 2]);
        $this->travelTo('2026-10-20 08:00:00');
        $this->actingAsJwt($this->client)->postJson("/api/my-appointments/{$id}/cancel")->assertUnprocessable();
    }

    public function test_settings_validate_allowed_values(): void
    {
        $admin = User::factory()->create(['role' => User::ROLE_OWNER]);

        $this->actingAsJwt($admin)->putJson('/api/business-settings', [
            'name' => 'Salon', 'category' => 'other', 'booking_confirmation' => 'manual',
            'booking_min_days_ahead' => 5, 'cancellation_days_before' => 9,
        ])->assertUnprocessable()->assertJsonValidationErrors(['booking_min_days_ahead', 'cancellation_days_before']);
    }
}

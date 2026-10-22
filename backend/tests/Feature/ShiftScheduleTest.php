<?php

namespace Tests\Feature;

use App\Models\BusinessSetting;
use App\Models\OpeningHour;
use App\Models\Service;
use App\Models\StaffMember;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ShiftScheduleTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private Service $cut;

    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo('2026-10-14 06:00:00');
        BusinessSetting::current()->update(['booking_min_days_ahead' => 0, 'booking_lead_minutes' => 0, 'slot_interval_minutes' => 60]);
        $this->admin = User::factory()->create(['role' => User::ROLE_ADMIN]);
        $this->cut = Service::create(['name' => 'Šišanje', 'duration_minutes' => 60, 'price' => 2000]);
    }

    private function staff(array $payload)
    {
        return $this->actingAsJwt($this->admin)->postJson('/api/staff', [
            'first_name' => 'Jelena',
            'last_name' => 'Matović',
            'service_ids' => [$this->cut->id],
            ...$payload,
        ]);
    }

    private function slots(string $date): array
    {
        return collect($this->postJson('/api/availability/slots', ['service_ids' => [$this->cut->id], 'date' => $date])->assertOk()->json())->pluck('time')->all();
    }

    public function test_salon_hours_and_shifts_are_seeded_and_public(): void
    {
        $this->getJson('/api/public/business')
            ->assertJsonPath('opening_hours.0.opens_at', '08:00')
            ->assertJsonPath('opening_hours.0.closes_at', '20:00')
            ->assertJsonPath('opening_hours.6.opens_at', null)
            ->assertJsonPath('shifts.0.name', 'Pre podne')
            ->assertJsonPath('shifts.1.starts_at', '14:00');
    }

    public function test_staff_hours_must_fit_salon_hours(): void
    {
        $this->staff(['working_hours' => [['weekday' => 1, 'starts_at' => '07:00', 'ends_at' => '15:00']]])
            ->assertUnprocessable()
            ->assertJsonPath('errors.working_hours.0', 'Ponedeljak: smena 07:00–15:00 je van radnog vremena salona (08:00–20:00).');

        $this->staff(['working_hours' => [['weekday' => 7, 'starts_at' => '10:00', 'ends_at' => '14:00']]])
            ->assertUnprocessable()
            ->assertJsonPath('errors.working_hours.0', 'Nedelja: salon tog dana ne radi.');

        $this->staff(['working_hours' => [['weekday' => 3, 'starts_at' => '11:00', 'ends_at' => '18:00']]])->assertCreated();
    }

    public function test_rotating_weeks_alternate_morning_and_afternoon(): void
    {
        $morning = collect(range(1, 5))->map(fn ($d) => ['weekday' => $d, 'week' => 0, 'starts_at' => '08:00', 'ends_at' => '14:00']);
        $afternoon = collect(range(1, 5))->map(fn ($d) => ['weekday' => $d, 'week' => 1, 'starts_at' => '14:00', 'ends_at' => '20:00']);

        $created = $this->staff([
            'rotation_weeks' => 2,
            'rotation_starts_on' => '2026-10-14',
            'working_hours' => $morning->concat($afternoon)->all(),
        ])->assertCreated();
        $this->assertSame('2026-10-12', $created->json('rotation_starts_on'));
        $this->assertSame(0, $created->json('current_week'));

        $this->assertSame(['08:00', '09:00', '10:00', '11:00', '12:00', '13:00'], $this->slots('2026-10-15'));
        $this->assertSame(['14:00', '15:00', '16:00', '17:00', '18:00', '19:00'], $this->slots('2026-10-22'));
        $this->assertSame('08:00', $this->slots('2026-10-29')[0]);
    }

    public function test_week_outside_rotation_is_rejected(): void
    {
        $this->staff(['rotation_weeks' => 1, 'working_hours' => [['weekday' => 1, 'week' => 1, 'starts_at' => '08:00', 'ends_at' => '14:00']]])
            ->assertCreated()
            ->assertJsonPath('working_hours.0.week', 0);

        $this->staff(['rotation_weeks' => 2, 'working_hours' => [['weekday' => 1, 'week' => 2, 'starts_at' => '08:00', 'ends_at' => '14:00']]])
            ->assertUnprocessable();
    }

    public function test_shorter_salon_hours_cut_staff_hours(): void
    {
        $this->staff(['working_hours' => [['weekday' => 4, 'starts_at' => '08:00', 'ends_at' => '20:00']]])->assertCreated();

        $settings = BusinessSetting::current();
        $this->actingAsJwt($this->admin)->putJson('/api/business-settings', [
            'name' => $settings->name,
            'category' => $settings->category,
            'booking_confirmation' => $settings->booking_confirmation,
            'opening_hours' => collect(range(1, 7))->map(fn ($d) => ['weekday' => $d, 'opens_at' => $d === 4 ? '10:00' : null, 'closes_at' => $d === 4 ? '12:00' : null])->all(),
            'shifts' => [['name' => 'Jutro', 'starts_at' => '10:00', 'ends_at' => '12:00']],
        ])->assertOk()->assertJsonPath('shifts.0.name', 'Jutro')->assertJsonCount(1, 'shifts');

        $this->assertSame(['10:00', '11:00'], $this->slots('2026-10-15'));
        $this->assertSame([], $this->slots('2026-10-16'));
        $this->assertFalse(OpeningHour::week()->get(5)->isOpen());
    }
}

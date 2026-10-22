<?php

namespace Tests\Feature;

use App\Models\Service;
use App\Models\StaffMember;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ServiceAudienceTest extends TestCase
{
    use RefreshDatabase;

    private Service $female;

    private Service $male;

    private Service $any;

    private StaffMember $ana;

    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo('2026-10-14 08:00:00');

        $this->female = Service::create(['name' => 'Žensko šišanje', 'audience' => 'female', 'duration_minutes' => 45, 'price' => 2500]);
        $this->male = Service::create(['name' => 'Muško šišanje', 'audience' => 'male', 'duration_minutes' => 30, 'price' => 1500]);
        $this->any = Service::create(['name' => 'Feniranje', 'duration_minutes' => 30, 'price' => 1200]);
        $this->ana = StaffMember::create(['first_name' => 'Ana', 'last_name' => 'Test']);
        $this->ana->services()->sync([$this->female->id, $this->male->id, $this->any->id]);
        $this->ana->workingHours()->createMany(collect(range(1, 5))->map(fn ($d) => ['weekday' => $d, 'starts_at' => '09:00', 'ends_at' => '17:00'])->all());
    }

    private function book(User $client, array $services, string $at = '2026-10-16 10:00')
    {
        return $this->actingAsJwt($client)->postJson('/api/bookings', [
            'service_ids' => collect($services)->pluck('id')->all(),
            'staff_member_id' => $this->ana->id,
            'starts_at' => $at,
        ]);
    }

    public function test_man_cannot_book_womens_service(): void
    {
        $petar = User::factory()->create(['gender' => 'male']);

        $this->book($petar, [$this->female])
            ->assertUnprocessable()
            ->assertJsonPath('errors.service_ids.0', 'Usluga „Žensko šišanje" je samo za žene.');

        $this->book($petar, [$this->male, $this->any])->assertCreated();
    }

    public function test_mixed_audience_is_rejected_and_unknown_gender_is_learned(): void
    {
        $client = User::factory()->create(['gender' => null]);

        $this->book($client, [$this->female, $this->male])
            ->assertUnprocessable()
            ->assertJsonPath('errors.service_ids.0', 'Muške i ženske usluge ne mogu u isti termin.');

        $this->book($client, [$this->female])->assertCreated();
        $this->assertSame('female', $client->fresh()->gender);
        $this->book($client, [$this->male], '2026-10-16 12:00')->assertUnprocessable();
    }

    public function test_admin_is_held_to_the_same_rule(): void
    {
        $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);
        $petar = User::factory()->create(['gender' => 'male']);

        $this->actingAsJwt($admin)->postJson('/api/appointments', [
            'client_id' => $petar->id,
            'service_ids' => [$this->female->id],
            'staff_member_id' => $this->ana->id,
            'starts_at' => '2026-10-16 10:00',
        ])->assertUnprocessable()->assertJsonValidationErrors('service_ids');
    }

    public function test_public_services_and_profile_expose_audience_and_gender(): void
    {
        $this->getJson('/api/public/services')->assertOk()->assertJsonFragment(['name' => 'Muško šišanje', 'audience' => 'male']);

        $client = User::factory()->create();
        $this->actingAsJwt($client)->putJson('/api/auth/profile', [
            'first_name' => 'Petar',
            'last_name' => 'Petrović',
            'phone' => '060 123 4567',
            'preferred_communication' => 'email',
            'gender' => 'male',
        ])->assertOk()->assertJsonPath('gender', 'male');

        $this->actingAsJwt($client)->putJson('/api/auth/profile', [
            'first_name' => 'Petar',
            'last_name' => 'Petrović',
            'phone' => '060 123 4567',
            'preferred_communication' => 'email',
            'gender' => 'other',
        ])->assertUnprocessable();
    }
}

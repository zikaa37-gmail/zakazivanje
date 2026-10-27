<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\BusinessSetting;
use App\Models\ClientActivityLog;
use App\Models\Service;
use App\Models\StaffMember;
use App\Models\User;
use App\Notifications\ClientDisciplineNotification;
use App\Services\ClientDisciplineService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class ClientDisciplineTest extends TestCase
{
    use RefreshDatabase;

    private Service $cut;

    private StaffMember $ana;

    private User $client;

    private User $owner;

    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo('2026-10-19 08:00:00');
        Notification::fake();

        $this->cut = Service::create(['name' => 'Šišanje', 'duration_minutes' => 30, 'price' => 1500]);
        $this->ana = StaffMember::create(['first_name' => 'Ana', 'last_name' => 'Test', 'booking_confirmation' => BusinessSetting::CONFIRMATION_AUTOMATIC]);
        $this->ana->services()->sync([$this->cut->id]);
        $this->ana->workingHours()->createMany(collect(range(1, 5))->map(fn ($d) => ['weekday' => $d, 'starts_at' => '09:00', 'ends_at' => '17:00'])->all());
        $this->client = User::factory()->create(['password' => Hash::make('tajna123')]);
        $this->owner = User::factory()->create(['role' => User::ROLE_OWNER]);
    }

    private function book(string $at)
    {
        return $this->actingAsJwt($this->client)->postJson('/api/bookings', [
            'service_ids' => [$this->cut->id], 'staff_member_id' => $this->ana->id, 'starts_at' => $at,
        ]);
    }

    private function slots(string $date): array
    {
        return collect($this->actingAsJwt($this->client)->postJson('/api/availability/slots', [
            'service_ids' => [$this->cut->id], 'staff_member_id' => $this->ana->id, 'date' => $date,
        ])->json())->pluck('time')->all();
    }

    private function pastAppointment(string $status, array $extra = []): Appointment
    {
        return Appointment::create([
            'client_id' => $this->client->id, 'staff_member_id' => $this->ana->id,
            'starts_at' => '2026-10-10 10:00', 'ends_at' => '2026-10-10 10:30',
            'status' => $status, 'source' => Appointment::SOURCE_ONLINE, 'price' => 1500, 'discount' => 0, 'total' => 1500,
            ...$extra,
        ]);
    }

    public function test_client_cancellations_move_client_to_yellow_zone(): void
    {
        foreach (['2026-10-21 09:00', '2026-10-22 09:00', '2026-10-23 09:00'] as $at) {
            $id = $this->book($at)->assertCreated()->assertJsonPath('status', Appointment::STATUS_CONFIRMED)->json('id');
            $this->actingAsJwt($this->client)->postJson("/api/my-appointments/{$id}/cancel")->assertOk();
        }

        $this->client->refresh();
        $this->assertSame(User::ZONE_YELLOW, $this->client->discipline_zone);
        $this->assertEquals(3, $this->client->discipline_points);
        Notification::assertSentTo($this->owner, ClientDisciplineNotification::class, fn ($n) => $n->type === ClientDisciplineNotification::ZONE_RAISED);

        $this->assertSame([], $this->slots('2026-10-20'));
        $this->assertNotSame([], $this->slots('2026-10-22'));
        $this->book('2026-10-20 10:00')->assertUnprocessable()->assertJsonPath('errors.starts_at.0', ClientDisciplineService::BUSY_MESSAGE);
        $this->book('2026-10-22 10:00')->assertCreated()->assertJsonPath('status', Appointment::STATUS_PENDING);

        $types = ClientActivityLog::where('user_id', $this->client->id)->pluck('type');
        $this->assertContains('booked', $types);
        $this->assertContains('cancelled', $types);
        $this->assertContains('booking_failed', $types);
        $this->assertContains('zone_changed', $types);
    }

    public function test_no_shows_silently_block_booking(): void
    {
        $this->pastAppointment(Appointment::STATUS_CONFIRMED);
        $second = $this->pastAppointment(Appointment::STATUS_CONFIRMED, ['starts_at' => '2026-10-12 10:00', 'ends_at' => '2026-10-12 10:30']);
        $worker = User::factory()->create(['role' => User::ROLE_WORKER]);

        foreach (Appointment::all() as $appointment) {
            $this->actingAsJwt($worker)->postJson("/api/appointments/{$appointment->id}/status", ['status' => 'no_show'])->assertOk();
        }

        $this->assertSame(User::ZONE_ORANGE, $this->client->refresh()->discipline_zone);

        $this->assertSame([], $this->slots('2026-10-26'));
        $days = $this->actingAsJwt($this->client)->postJson('/api/availability/days', ['service_ids' => [$this->cut->id], 'from' => '2026-10-20', 'days' => 7])->json();
        $this->assertFalse(collect($days)->contains('available', true));
        $this->assertTrue(collect($days)->contains('open', true));

        $this->book('2026-10-26 10:00')->assertUnprocessable()->assertJsonPath('errors.starts_at.0', ClientDisciplineService::BUSY_MESSAGE);
        $this->book('2026-10-27 10:00')->assertUnprocessable();
        Notification::assertSentToTimes($this->owner, ClientDisciplineNotification::class, 3);

        $this->actingAsJwt($this->owner)->postJson('/api/appointments', [
            'client_id' => $this->client->id, 'service_ids' => [$this->cut->id], 'staff_member_id' => $this->ana->id, 'starts_at' => '2026-10-26 10:00',
        ])->assertCreated();

        $this->actingAsJwt($worker)->postJson("/api/appointments/{$second->id}/status", ['status' => 'completed'])->assertOk();
        $this->assertSame(User::ZONE_YELLOW, $this->client->refresh()->discipline_zone);
    }

    public function test_owner_suspends_client_and_client_sees_it_after_login(): void
    {
        $worker = User::factory()->create(['role' => User::ROLE_WORKER]);
        $this->actingAsJwt($worker)->putJson("/api/clients/{$this->client->id}/zone", ['zone' => 'red'])->assertForbidden();

        $this->actingAsJwt($this->owner)->putJson("/api/clients/{$this->client->id}/zone", ['zone' => 'red', 'reason' => 'Stalno otkazuje'])
            ->assertOk()->assertJsonPath('discipline_zone', 'red')->assertJsonPath('zone_manual', true);

        $this->postJson('/api/auth/login', ['email' => $this->client->email, 'password' => 'tajna123'])
            ->assertOk()->assertJsonPath('user.suspended', true)->assertJsonMissingPath('user.discipline_zone');

        $this->book('2026-10-21 09:00')->assertForbidden();
        $this->actingAsJwt($this->client)->postJson('/api/my-waitlist', ['service_ids' => [$this->cut->id], 'date' => '2026-10-21'])->assertForbidden();

        $history = $this->actingAsJwt($worker)->postJson("/api/clients/{$this->client->id}/activity")->assertOk()
            ->assertJsonPath('client.discipline_zone', 'red')->json();
        $this->assertSame(['booking_failed', 'login', 'zone_changed'], collect($history['logs'])->pluck('type')->sort()->values()->unique()->values()->all());

        $this->actingAsJwt($this->owner)->putJson("/api/clients/{$this->client->id}/zone", ['zone' => null])
            ->assertOk()->assertJsonPath('discipline_zone', 'green')->assertJsonPath('zone_manual', false);
    }

    public function test_automatic_suspension_is_optional(): void
    {
        BusinessSetting::current()->update(['discipline_red_points' => 6]);
        $this->pastAppointment(Appointment::STATUS_NO_SHOW);
        $this->pastAppointment(Appointment::STATUS_NO_SHOW);
        $discipline = app(ClientDisciplineService::class);

        $this->assertSame(User::ZONE_ORANGE, $discipline->refresh($this->client)->discipline_zone);

        BusinessSetting::current()->update(['discipline_auto_suspend' => true]);
        $this->assertSame(User::ZONE_RED, $discipline->refresh($this->client)->discipline_zone);

        $this->travelTo('2027-03-01 08:00:00');
        $this->assertSame(User::ZONE_GREEN, $discipline->refresh($this->client)->discipline_zone);
    }

    public function test_yellow_client_gets_only_off_peak_slots(): void
    {
        $regular = User::factory()->create();
        foreach (range(1, 12) as $week) {
            $monday = now()->startOfWeek()->subWeeks($week)->format('Y-m-d');
            Appointment::create([
                'client_id' => $regular->id, 'staff_member_id' => $this->ana->id,
                'starts_at' => "{$monday} 09:00", 'ends_at' => "{$monday} 13:00",
                'status' => Appointment::STATUS_COMPLETED, 'source' => Appointment::SOURCE_ADMIN, 'price' => 1500, 'discount' => 0, 'total' => 1500,
            ]);
        }
        $this->client->forceFill(['discipline_zone' => User::ZONE_YELLOW, 'zone_manual' => true])->save();

        $slots = $this->slots('2026-10-26');
        $this->assertSame('13:00', $slots[0]);
        $this->assertNotContains('10:00', $slots);

        $this->book('2026-10-26 10:00')->assertUnprocessable()->assertJsonPath('errors.starts_at.0', ClientDisciplineService::BUSY_MESSAGE);
        $this->book('2026-10-26 14:00')->assertCreated()->assertJsonPath('status', Appointment::STATUS_PENDING);
        $this->assertTrue(ClientActivityLog::where('user_id', $this->client->id)->where('data->reason', 'peak_slot')->exists());

        $this->actingAsJwt($this->owner)->postJson('/api/dashboard/demand')->assertOk()->assertJsonPath('has_history', true);

        BusinessSetting::current()->update(['discipline_yellow_off_peak' => false]);
        $this->assertContains('10:00', $this->slots('2026-10-26'));
    }

    public function test_discipline_settings_are_hidden_from_public(): void
    {
        $this->getJson('/api/public/business')->assertOk()->assertJsonMissingPath('discipline_enabled');
        $this->actingAsJwt($this->client)->getJson('/api/public/business')->assertJsonMissingPath('discipline_yellow_points');
        $this->actingAsJwt($this->owner)->getJson('/api/public/business')->assertJsonPath('discipline_enabled', true);
    }
}

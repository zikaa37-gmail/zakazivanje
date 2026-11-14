<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\BusinessSetting;
use App\Models\Service;
use App\Models\StaffMember;
use App\Models\User;
use App\Services\Realtime;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RealtimeTest extends TestCase
{
    use RefreshDatabase;

    private array $sent = [];

    private Service $cut;

    private StaffMember $ana;

    private StaffMember $marko;

    private User $client;

    private User $owner;

    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo('2026-10-19 08:00:00');
        config(['services.pusher' => ['app_id' => '1', 'key' => 'test-key', 'secret' => 'test-secret', 'cluster' => 'eu']]);

        $sent = &$this->sent;
        $this->app->instance(Realtime::class, new class($sent) extends Realtime
        {
            public function __construct(private array &$sent) {}

            protected function send(string $channel, array $data): void
            {
                $this->sent[] = ['channel' => $channel, ...$data];
            }
        });

        BusinessSetting::current()->update(['booking_confirmation' => 'manual', 'slot_interval_minutes' => 30, 'booking_min_days_ahead' => 1]);
        $this->cut = Service::create(['name' => 'Šišanje', 'duration_minutes' => 60, 'price' => 2000]);
        $this->ana = $this->staff('Ana');
        $this->marko = $this->staff('Marko');
        $this->client = User::factory()->create(['first_name' => 'Petar', 'last_name' => 'Petrović']);
        $this->owner = User::factory()->create(['role' => User::ROLE_OWNER]);
    }

    private function staff(string $name): StaffMember
    {
        $staff = StaffMember::create(['first_name' => $name, 'last_name' => 'Test']);
        $staff->services()->sync([$this->cut->id]);
        $staff->workingHours()->createMany(collect(range(1, 5))->map(fn ($d) => ['weekday' => $d, 'starts_at' => '09:00', 'ends_at' => '17:00'])->all());

        return $staff;
    }

    private function book(): Appointment
    {
        $id = $this->actingAsJwt($this->client)->postJson('/api/bookings', [
            'service_ids' => [$this->cut->id],
            'staff_member_id' => $this->ana->id,
            'starts_at' => '2026-10-20 10:00',
        ])->assertCreated()->json('id');

        return Appointment::findOrFail($id);
    }

    private function sentTo(string $channel): array
    {
        return array_values(array_filter($this->sent, fn ($e) => $e['channel'] === $channel));
    }

    public function test_online_booking_is_pushed_to_staff_with_a_message(): void
    {
        $appointment = $this->book();

        $events = $this->sentTo(Realtime::STAFF_CHANNEL);
        $this->assertCount(1, $events);
        $this->assertSame('booked', $events[0]['kind']);
        $this->assertSame($appointment->id, $events[0]['appointment_id']);
        $this->assertSame([$this->ana->id], $events[0]['staff_member_ids']);
        $this->assertStringStartsWith('Novi zahtev za termin: Petar Petrović · 20.10. u 10:00', $events[0]['message']);
        $this->assertSame([], $this->sentTo(Realtime::userChannel($this->client->id)));
    }

    public function test_confirmation_by_salon_is_pushed_to_the_client(): void
    {
        $appointment = $this->book();
        $this->sent = [];

        $this->actingAsJwt($this->owner)->postJson("/api/appointments/{$appointment->id}/status", ['status' => 'confirmed'])->assertOk();

        $events = $this->sentTo(Realtime::userChannel($this->client->id));
        $this->assertCount(1, $events);
        $this->assertSame('status', $events[0]['kind']);
        $this->assertSame($this->owner->id, $events[0]['actor_id']);
        $this->assertStringStartsWith('Termin je potvrđen: 20.10. u 10:00', $events[0]['message']);
        $this->assertCount(1, $this->sentTo(Realtime::STAFF_CHANNEL));
    }

    public function test_client_cancellation_and_transfer_reach_staff(): void
    {
        $appointment = $this->book();
        $this->sent = [];

        $this->actingAsJwt($this->owner)->postJson("/api/appointments/{$appointment->id}/reschedule", [
            'staff_member_id' => $this->marko->id, 'starts_at' => '2026-10-20 10:00',
        ])->assertOk();
        $transfer = $this->sentTo(Realtime::STAFF_CHANNEL)[0];
        $this->assertSame('transferred', $transfer['kind']);
        $this->assertEqualsCanonicalizing([$this->ana->id, $this->marko->id], $transfer['staff_member_ids']);
        $this->assertSame('transferred', $this->sentTo(Realtime::userChannel($this->client->id))[0]['kind']);

        $this->sent = [];
        $this->actingAsJwt($this->client)->postJson("/api/my-appointments/{$appointment->id}/cancel", [])->assertOk();
        $events = $this->sentTo(Realtime::STAFF_CHANNEL);
        $this->assertSame('cancelled', $events[0]['kind']);
        $this->assertStringStartsWith('Klijent je otkazao termin', $events[0]['message']);
    }

    public function test_nothing_is_pushed_without_keys(): void
    {
        config(['services.pusher.key' => null]);

        $this->book();

        $this->assertSame([], $this->sent);
        $this->getJson('/api/public/business')->assertOk()->assertJsonPath('realtime', null);
    }

    public function test_channel_authorization(): void
    {
        $this->getJson('/api/public/business')->assertJsonPath('realtime.key', 'test-key');

        $this->actingAsJwt($this->owner)->postJson('/api/realtime/auth', ['socket_id' => '123.456', 'channel_name' => Realtime::STAFF_CHANNEL])
            ->assertOk()->assertJsonStructure(['auth']);
        $this->actingAsJwt($this->client)->postJson('/api/realtime/auth', ['socket_id' => '123.456', 'channel_name' => Realtime::STAFF_CHANNEL])
            ->assertForbidden();
        $this->actingAsJwt($this->client)->postJson('/api/realtime/auth', ['socket_id' => '123.456', 'channel_name' => Realtime::userChannel($this->client->id)])
            ->assertOk();
        $this->actingAsJwt($this->client)->postJson('/api/realtime/auth', ['socket_id' => '123.456', 'channel_name' => Realtime::userChannel($this->owner->id)])
            ->assertForbidden();
    }
}

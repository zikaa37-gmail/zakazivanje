<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Appointment;
use App\Models\BusinessSetting;
use App\Models\InboxNotification;
use App\Models\Service;
use App\Models\StaffMember;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InboxTest extends TestCase
{
    use RefreshDatabase;

    private Service $cut;

    private StaffMember $ana;

    private StaffMember $marko;

    private User $client;

    private User $owner;

    private User $office;

    private User $anaWorker;

    private User $markoWorker;

    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo('2026-10-19 08:00:00');

        BusinessSetting::current()->update(['booking_confirmation' => 'manual', 'slot_interval_minutes' => 30, 'booking_min_days_ahead' => 1, 'notify_admin_new_booking' => false]);
        $this->cut = Service::create(['name' => 'Šišanje', 'duration_minutes' => 60, 'price' => 2000]);
        $this->ana = $this->staff('Ana');
        $this->marko = $this->staff('Marko');
        $this->client = User::factory()->create(['first_name' => 'Petar', 'last_name' => 'Petrović']);
        $this->owner = User::factory()->create(['role' => UserRole::Owner]);
        $this->office = User::factory()->create(['role' => UserRole::Manager, 'email' => null]);
        $this->anaWorker = User::factory()->create(['role' => UserRole::Worker, 'staff_member_id' => $this->ana->id]);
        $this->markoWorker = User::factory()->create(['role' => UserRole::Worker, 'staff_member_id' => $this->marko->id]);
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

    private function inboxOf(User $user)
    {
        return InboxNotification::where('user_id', $user->id)->get();
    }

    public function test_online_booking_lands_in_managers_and_own_worker_inbox_even_without_mail(): void
    {
        $appointment = $this->book();

        foreach ([$this->owner, $this->office, $this->anaWorker] as $user) {
            $items = $this->inboxOf($user);
            $this->assertCount(1, $items, $user->role->value);
            $this->assertSame('Novi termin čeka potvrdu', $items[0]->title);
            $this->assertSame($appointment->id, $items[0]->appointment_id);
            $this->assertSame('/admin/appointments?date=2026-10-20', $items[0]->link);
            $this->assertNull($items[0]->read_at);
        }
        $this->assertCount(0, $this->inboxOf($this->markoWorker));
        $this->assertCount(0, $this->inboxOf($this->client));
    }

    public function test_client_gets_confirmation_and_actor_gets_nothing(): void
    {
        $appointment = $this->book();
        InboxNotification::query()->delete();

        $this->actingAsJwt($this->owner)->postJson("/api/appointments/{$appointment->id}/status", ['status' => 'confirmed'])->assertOk();

        $items = $this->inboxOf($this->client);
        $this->assertCount(1, $items);
        $this->assertSame('Termin je potvrđen', $items[0]->title);
        $this->assertSame('/my-appointments', $items[0]->link);
        $this->assertCount(0, $this->inboxOf($this->owner));
    }

    public function test_list_read_and_read_all(): void
    {
        $this->book();
        $items = $this->inboxOf($this->owner);

        $this->actingAsJwt($this->owner)->postJson('/api/inbox/unread-count')->assertOk()->assertJsonPath('count', 1);

        $this->actingAsJwt($this->owner)->postJson('/api/inbox/'.$items[0]->id.'/read')->assertOk()->assertJsonPath('count', 0);
        $this->actingAsJwt($this->owner)->postJson('/api/inbox/list', ['filter' => 'unread'])->assertOk()->assertJsonCount(0, 'items');
        $this->actingAsJwt($this->owner)->postJson('/api/inbox/list', ['filter' => 'all'])->assertOk()
            ->assertJsonCount(1, 'items')
            ->assertJsonPath('items.0.title', 'Novi termin čeka potvrdu')
            ->assertJsonPath('unread_count', 0);

        $this->actingAsJwt($this->client)->postJson('/api/inbox/'.$items[0]->id.'/read')->assertNotFound();

        $this->actingAsJwt($this->office)->postJson('/api/inbox/read-all')->assertOk();
        $this->assertSame(0, InboxNotification::where('user_id', $this->office->id)->whereNull('read_at')->count());
        $this->assertSame(1, InboxNotification::where('user_id', $this->anaWorker->id)->whereNull('read_at')->count());
    }

    public function test_staff_note_lands_in_recipient_inbox(): void
    {
        $this->actingAsJwt($this->anaWorker)->postJson('/api/notes', ['body' => 'Nestalo je šampona', 'recipient_ids' => [$this->owner->id]])->assertCreated();

        $items = $this->inboxOf($this->owner);
        $this->assertCount(1, $items);
        $this->assertSame('note', $items[0]->kind);
        $this->assertSame('Nestalo je šampona', $items[0]->body);
        $this->assertCount(0, $this->inboxOf($this->anaWorker));
    }
}

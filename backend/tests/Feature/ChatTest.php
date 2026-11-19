<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\BusinessSetting;
use App\Models\ChatSession;
use App\Models\Service;
use App\Models\StaffMember;
use App\Models\User;
use App\Notifications\ChatMessageNotification;
use App\Services\Realtime;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class ChatTest extends TestCase
{
    use RefreshDatabase;

    private User $client;

    private User $owner;

    private User $office;

    private User $anaWorker;

    private User $markoWorker;

    private StaffMember $ana;

    private StaffMember $marko;

    private Service $cut;

    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo('2026-10-19 10:00:00');
        $this->cut = Service::create(['name' => 'Šišanje', 'duration_minutes' => 60, 'price' => 2000]);
        $this->ana = StaffMember::create(['first_name' => 'Ana', 'last_name' => 'Test']);
        $this->marko = StaffMember::create(['first_name' => 'Marko', 'last_name' => 'Test']);
        $this->client = User::factory()->create(['first_name' => 'Petar', 'last_name' => 'Petrović']);
        $this->owner = User::factory()->create(['role' => User::ROLE_OWNER]);
        $this->office = User::factory()->create(['role' => User::ROLE_MANAGER]);
        $this->anaWorker = User::factory()->create(['role' => User::ROLE_WORKER, 'staff_member_id' => $this->ana->id]);
        $this->markoWorker = User::factory()->create(['role' => User::ROLE_WORKER, 'staff_member_id' => $this->marko->id]);
    }

    private function appointmentWith(StaffMember $staff): Appointment
    {
        return Appointment::create([
            'client_id' => $this->client->id,
            'staff_member_id' => $staff->id,
            'starts_at' => '2026-10-20 10:00:00',
            'ends_at' => '2026-10-20 11:00:00',
            'status' => Appointment::STATUS_CONFIRMED,
            'total' => 2000,
        ]);
    }

    private function clientSays(string $body, ?int $appointmentId = null): void
    {
        $this->actingAsJwt($this->client)->postJson('/api/chat/my/messages', ['body' => $body, 'appointment_id' => $appointmentId])->assertCreated();
    }

    private function unread(User $user): int
    {
        return $this->actingAsJwt($user)->postJson('/api/chat/unread-count')->assertOk()->json('count');
    }

    public function test_client_message_opens_a_topic_and_reaches_managers(): void
    {
        $this->clientSays('Da li radite u subotu?');

        $session = ChatSession::sole();
        $this->assertTrue($session->isActive());
        $this->assertSame('Pitanje', $session->subject);
        $this->assertSame(1, $this->unread($this->owner));
        $this->assertSame(1, $this->unread($this->office));
        $this->assertSame(0, $this->unread($this->anaWorker));
        $this->assertSame(0, $this->unread($this->client));

        $this->actingAsJwt($this->office)->postJson('/api/chat/sessions/list', ['status' => 'active'])->assertOk()
            ->assertJsonPath('sessions.0.client_name', 'Petar Petrović')
            ->assertJsonPath('sessions.0.unread', 1)
            ->assertJsonPath('sessions.0.last_message', 'Da li radite u subotu?');
    }

    public function test_client_sees_only_own_conversations(): void
    {
        $other = User::factory()->create(['first_name' => 'Mika', 'last_name' => 'Mikić']);
        $appointment = $this->appointmentWith($this->ana);
        $this->clientSays('Poruka Petra', $appointment->id);
        $petarSession = ChatSession::sole();
        $this->actingAsJwt($this->owner)->postJson("/api/chat/sessions/{$petarSession->id}/messages", ['body' => 'Odgovor Petru'])->assertCreated();

        $this->actingAsJwt($other)->postJson('/api/chat/my')->assertOk()->assertJsonCount(0, 'sessions')->assertJsonPath('unread_count', 0);
        $this->assertSame(0, $this->unread($other));

        $this->actingAsJwt($other)->postJson('/api/chat/my/messages', ['body' => 'Moj termin', 'appointment_id' => $appointment->id])
            ->assertUnprocessable()->assertJsonValidationErrors('appointment_id');
        $this->actingAsJwt($other)->postJson('/api/chat/my/messages', ['body' => 'Poruka Mike'])->assertCreated();

        $this->assertSame(2, ChatSession::count());
        $this->actingAsJwt($other)->postJson('/api/chat/my')->assertOk()
            ->assertJsonCount(1, 'sessions')
            ->assertJsonCount(1, 'sessions.0.messages')
            ->assertJsonPath('sessions.0.messages.0.body', 'Poruka Mike');
        $this->actingAsJwt($this->client)->postJson('/api/chat/my')->assertOk()
            ->assertJsonCount(1, 'sessions')
            ->assertJsonPath('sessions.0.messages.1.body', 'Odgovor Petru');

        $this->actingAsJwt($other)->getJson("/api/chat/sessions/{$petarSession->id}")->assertForbidden();
        $this->actingAsJwt($other)->postJson("/api/chat/sessions/{$petarSession->id}/messages", ['body' => 'x'])->assertForbidden();
        $this->actingAsJwt($other)->postJson('/api/chat/sessions/list')->assertForbidden();
        $this->assertFalse(app(Realtime::class)->canJoin($other, Realtime::userChannel($this->client->id)));
    }

    public function test_worker_sees_only_chats_about_own_appointments(): void
    {
        $appointment = $this->appointmentWith($this->ana);
        $this->clientSays('Kasnim 10 minuta', $appointment->id);
        $session = ChatSession::sole();

        $this->assertSame(1, $this->unread($this->anaWorker));
        $this->actingAsJwt($this->anaWorker)->getJson("/api/chat/sessions/{$session->id}")->assertOk()
            ->assertJsonPath('appointment.id', $appointment->id)
            ->assertJsonPath('messages.0.body', 'Kasnim 10 minuta');
        $this->assertSame(0, $this->unread($this->anaWorker));

        $this->assertSame(0, $this->unread($this->markoWorker));
        $this->actingAsJwt($this->markoWorker)->getJson("/api/chat/sessions/{$session->id}")->assertNotFound();
        $this->actingAsJwt($this->markoWorker)->postJson('/api/chat/sessions/list')->assertOk()->assertJsonCount(0, 'sessions');
    }

    public function test_staff_reply_reaches_client_and_close_starts_a_new_session(): void
    {
        $this->clientSays('Pozdrav');
        $session = ChatSession::sole();

        $this->actingAsJwt($this->office)->postJson("/api/chat/sessions/{$session->id}/messages", ['body' => 'Izvolite?'])->assertCreated();
        $this->assertSame($this->office->id, $session->fresh()->assigned_to);
        $this->assertSame(1, $this->unread($this->client));
        $this->assertSame(1, $this->unread($this->owner));
        $this->assertSame(0, $this->unread($this->office));

        $this->actingAsJwt($this->client)->postJson('/api/chat/my')->assertOk()
            ->assertJsonPath('sessions.0.messages.1.body', 'Izvolite?')
            ->assertJsonPath('sessions.0.messages.1.from_client', false);
        $this->actingAsJwt($this->client)->postJson('/api/chat/my/read')->assertOk();
        $this->assertSame(0, $this->unread($this->client));

        $this->actingAsJwt($this->office)->postJson("/api/chat/sessions/{$session->id}/close")->assertOk();
        $this->clientSays('Još jedno pitanje');
        $this->assertSame(2, ChatSession::count());
    }

    public function test_topics_stay_open_and_keep_their_own_thread(): void
    {
        $this->clientSays('Prvi dan');
        $this->travelTo('2026-10-21 09:00:00');
        $this->clientSays('Drugi dan');
        $this->assertSame(1, ChatSession::count());

        $appointment = $this->appointmentWith($this->ana);
        $this->clientSays('Kasnim', $appointment->id);
        $this->actingAsJwt($this->client)->postJson('/api/chat/my/messages', ['body' => 'Imate li poklon vaučere?', 'subject' => 'Poklon vaučer'])->assertCreated();
        $this->assertSame(3, ChatSession::count());
        $this->assertSame(1, ChatSession::where('appointment_id', $appointment->id)->count());

        $first = ChatSession::where('subject', 'Pitanje')->sole();
        $this->actingAsJwt($this->client)->postJson('/api/chat/my/messages', ['body' => 'Još nešto o tome', 'session_id' => $first->id])->assertCreated();
        $this->assertSame(3, $first->messages()->count());

        $this->actingAsJwt($this->anaWorker)->postJson("/api/chat/sessions/{$first->id}/messages", ['body' => 'x'])->assertNotFound();
        $this->actingAsJwt($this->owner)->getJson("/api/chat/sessions/{$first->id}")->assertOk()
            ->assertJsonPath('subject', 'Pitanje')->assertJsonCount(2, 'other_topics');
        $this->actingAsJwt($this->owner)->postJson('/api/chat/sessions/list', ['status' => 'active'])->assertOk()->assertJsonCount(3, 'sessions');
    }

    public function test_salon_can_start_a_chat_only_with_client_who_has_an_account(): void
    {
        $appointment = $this->appointmentWith($this->ana);

        $this->actingAsJwt($this->office)->postJson('/api/chat/start', [
            'client_id' => $this->client->id, 'appointment_id' => $appointment->id, 'body' => 'Pomerili smo vam termin jer je Ana bolesna.',
        ])->assertCreated();
        $this->assertSame(1, $this->unread($this->client));

        $this->actingAsJwt($this->markoWorker)->postJson('/api/chat/start', [
            'client_id' => $this->client->id, 'appointment_id' => $appointment->id, 'body' => 'Zdravo',
        ])->assertForbidden();

        $guest = User::factory()->create(['password' => null]);
        $this->actingAsJwt($this->office)->postJson('/api/chat/start', ['client_id' => $guest->id, 'body' => 'Zdravo'])
            ->assertUnprocessable()->assertJsonValidationErrors('client_id');
    }

    public function test_disabled_chat_is_refused(): void
    {
        BusinessSetting::current()->update(['chat_enabled' => false]);

        $this->actingAsJwt($this->client)->postJson('/api/chat/my/messages', ['body' => 'Halo'])->assertForbidden();
    }

    public function test_unread_salon_message_is_sent_to_client_once_after_fifteen_minutes(): void
    {
        Notification::fake();
        $this->clientSays('Pozdrav');
        $session = ChatSession::sole();
        $this->actingAsJwt($this->office)->postJson("/api/chat/sessions/{$session->id}/messages", ['body' => 'Javljamo se uskoro'])->assertCreated();

        $this->artisan('chat:notify-unread')->assertSuccessful();
        Notification::assertNothingSent();

        $this->travel(16)->minutes();
        $this->artisan('chat:notify-unread')->assertSuccessful();
        $this->artisan('chat:notify-unread')->assertSuccessful();

        Notification::assertSentToTimes($this->client, ChatMessageNotification::class, 1);
    }
}

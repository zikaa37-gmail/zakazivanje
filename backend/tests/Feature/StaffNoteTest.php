<?php

namespace Tests\Feature;

use App\Models\StaffMember;
use App\Models\User;
use App\Notifications\StaffNoteNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class StaffNoteTest extends TestCase
{
    use RefreshDatabase;

    public function test_worker_posts_note_and_only_selected_staff_are_notified(): void
    {
        Notification::fake();
        $owner = User::factory()->create(['role' => User::ROLE_OWNER]);
        $jelena = User::factory()->create(['role' => User::ROLE_WORKER, 'staff_member_id' => StaffMember::create(['first_name' => 'Jelena', 'last_name' => 'T'])->id]);
        $marko = User::factory()->create(['role' => User::ROLE_WORKER, 'staff_member_id' => StaffMember::create(['first_name' => 'Marko', 'last_name' => 'T'])->id]);
        $sandra = User::factory()->create(['role' => User::ROLE_WORKER, 'staff_member_id' => StaffMember::create(['first_name' => 'Sandra', 'last_name' => 'T'])->id]);

        StaffMember::create(['first_name' => 'Bez', 'last_name' => 'Naloga']);
        $recipients = $this->actingAsJwt($jelena)->postJson('/api/notes/recipients')->assertOk()->assertJsonCount(5)->json();
        $this->assertTrue(collect($recipients)->firstWhere('user_id', $owner->id)['always']);
        $this->assertNull(collect($recipients)->firstWhere('name', 'Bez Naloga')['user_id']);

        $id = $this->actingAsJwt($jelena)->postJson('/api/notes', ['body' => 'Nestalo je farbe 7.1', 'recipient_ids' => [$owner->id, $sandra->id, $jelena->id]])
            ->assertCreated()->json('id');
        $this->actingAsJwt($jelena)->postJson('/api/notes', ['body' => 'Vlasnik uvek dobija', 'recipient_ids' => []])->assertCreated();
        Notification::assertSentToTimes($owner, StaffNoteNotification::class, 2);

        Notification::assertSentTo([$owner, $sandra], StaffNoteNotification::class);
        Notification::assertNotSentTo([$marko, $jelena], StaffNoteNotification::class);

        $this->actingAsJwt($marko)->postJson('/api/notes/list')->assertOk()->assertJsonPath('1.body', 'Nestalo je farbe 7.1')->assertJsonPath('1.unread', false);
        $this->actingAsJwt($sandra)->postJson('/api/notes/unread-count')->assertOk()->assertJsonPath('count', 1);
        $this->actingAsJwt($sandra)->postJson("/api/notes/{$id}/read")->assertOk()->assertJsonPath('readers', [$sandra->first_name.' '.$sandra->last_name]);
        $this->actingAsJwt($sandra)->postJson('/api/notes/unread-count')->assertJsonPath('count', 0);

        $this->actingAsJwt($owner)->postJson("/api/notes/{$id}/take")->assertOk()->assertJsonPath('status', 'taken')->assertJsonPath('taken_by.id', $owner->id);
        $this->actingAsJwt($sandra)->postJson("/api/notes/{$id}/take")->assertUnprocessable()->assertJsonValidationErrors('note');
        $this->actingAsJwt($owner)->postJson("/api/notes/{$id}/take")->assertOk()->assertJsonPath('status', 'open');
        $this->actingAsJwt($sandra)->postJson("/api/notes/{$id}/take")->assertOk()->assertJsonPath('taken_by.id', $sandra->id);

        $this->actingAsJwt($marko)->postJson("/api/notes/{$id}/resolve")->assertOk()->assertJsonPath('status', 'done')->assertJsonPath('resolver', $marko->first_name.' '.$marko->last_name);
        $this->actingAsJwt($marko)->deleteJson("/api/notes/{$id}")->assertForbidden();
        $this->actingAsJwt($jelena)->deleteJson("/api/notes/{$id}")->assertOk();
        $this->actingAsJwt(User::factory()->create())->postJson('/api/notes/list')->assertForbidden();

        \App\Models\BusinessSetting::current()->update(['note_always_notify_ids' => [$marko->id]]);
        Notification::fake();
        $this->actingAsJwt($jelena)->postJson('/api/notes', ['body' => 'Samo Marko uvek', 'recipient_ids' => []])->assertCreated();
        Notification::assertSentTo($marko, StaffNoteNotification::class);
        Notification::assertNotSentTo($owner, StaffNoteNotification::class);
    }
}

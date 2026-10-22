<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\BusinessSetting;
use App\Models\Review;
use App\Models\Service;
use App\Models\StaffMember;
use App\Models\User;
use App\Notifications\ReviewRequestNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class ReviewTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private User $client;

    private StaffMember $ana;

    private Service $cut;

    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo('2026-10-14 08:00:00');

        $this->admin = User::factory()->create(['role' => User::ROLE_ADMIN]);
        $this->client = User::factory()->create(['first_name' => 'Petar', 'last_name' => 'Petrović']);
        $this->cut = Service::create(['name' => 'Šišanje', 'duration_minutes' => 60, 'price' => 2000]);
        $this->ana = StaffMember::create(['first_name' => 'Ana', 'last_name' => 'Test']);
        $this->ana->services()->sync([$this->cut->id]);
        $this->ana->workingHours()->createMany(collect(range(1, 5))->map(fn ($d) => ['weekday' => $d, 'starts_at' => '09:00', 'ends_at' => '17:00'])->all());
    }

    private function appointment(string $at = '2026-10-15 10:00'): Appointment
    {
        $id = $this->actingAsJwt($this->admin)->postJson('/api/appointments', [
            'client_id' => $this->client->id,
            'service_ids' => [$this->cut->id],
            'staff_member_id' => $this->ana->id,
            'starts_at' => $at,
        ])->assertCreated()->json('appointments.0.id');

        return Appointment::find($id);
    }

    private function complete(Appointment $appointment): void
    {
        $this->actingAsJwt($this->admin)->postJson("/api/appointments/{$appointment->id}/status", ['status' => 'completed'])->assertOk();
    }

    public function test_completing_appointment_asks_client_for_review_once(): void
    {
        Notification::fake();
        $appointment = $this->appointment();

        $this->complete($appointment);
        Notification::assertSentTo($this->client, ReviewRequestNotification::class);

        $this->actingAsJwt($this->admin)->postJson("/api/appointments/{$appointment->id}/status", ['status' => 'confirmed'])->assertOk();
        Review::create(['appointment_id' => $appointment->id, 'client_id' => $this->client->id, 'rating' => 5]);
        $this->complete($appointment);
        Notification::assertSentToTimes($this->client, ReviewRequestNotification::class, 1);
    }

    public function test_no_review_request_when_disabled(): void
    {
        Notification::fake();
        BusinessSetting::current()->update(['notify_review_request' => false]);

        $this->complete($this->appointment());

        Notification::assertNotSentTo($this->client, ReviewRequestNotification::class);
    }

    public function test_client_reviews_only_own_completed_appointment(): void
    {
        $appointment = $this->appointment();
        $url = "/api/my-appointments/{$appointment->id}/review";

        $this->actingAsJwt($this->client)->postJson($url, ['rating' => 5])->assertUnprocessable();

        $this->complete($appointment);
        $this->actingAsJwt(User::factory()->create())->postJson($url, ['rating' => 5])->assertNotFound();
        $this->actingAsJwt($this->client)->postJson($url, ['rating' => 6])->assertUnprocessable();
        $this->actingAsJwt($this->client)->postJson($url, ['rating' => 4, 'comment' => '  Odlično, hvala!  '])
            ->assertCreated()
            ->assertJsonPath('comment', 'Odlično, hvala!')
            ->assertJsonPath('staff_member_id', $this->ana->id);

        $this->actingAsJwt($this->client)->postJson($url, ['rating' => 5])->assertOk();
        $this->assertSame(1, Review::count());
        $this->assertSame(5, Review::first()->rating);

        $this->travel(Review::EDITABLE_DAYS + 1)->days();
        $this->actingAsJwt($this->client)->postJson($url, ['rating' => 1])->assertUnprocessable();
    }

    public function test_public_reviews_show_only_visible_with_average(): void
    {
        foreach ([[5, true], [4, true], [1, false]] as $i => [$rating, $visible]) {
            $appointment = $this->appointment('2026-10-15 '.(10 + $i).':00');
            Review::create(['appointment_id' => $appointment->id, 'client_id' => $this->client->id, 'staff_member_id' => $this->ana->id, 'rating' => $rating, 'visible' => $visible, 'comment' => "Ocena {$rating}"]);
        }

        $this->getJson('/api/public/reviews')
            ->assertOk()
            ->assertJsonPath('summary.average', 4.5)
            ->assertJsonPath('summary.count', 2)
            ->assertJsonPath('items.0.author', 'Petar P.')
            ->assertJsonPath('items.0.services', 'Šišanje')
            ->assertJsonCount(2, 'items');

        $admin = $this->actingAsJwt($this->admin)->postJson('/api/reviews/list')->assertOk();
        $admin->assertJsonPath('summary.count', 3)->assertJsonPath('staff.0.average', 3.3);
    }

    public function test_admin_hides_and_replies(): void
    {
        $appointment = $this->appointment();
        $review = Review::create(['appointment_id' => $appointment->id, 'client_id' => $this->client->id, 'rating' => 2]);

        $this->actingAsJwt($this->client)->putJson("/api/reviews/{$review->id}", ['visible' => false])->assertForbidden();

        $this->actingAsJwt($this->admin)->putJson("/api/reviews/{$review->id}", ['reply' => 'Hvala, popravićemo.'])
            ->assertOk()
            ->assertJsonPath('reply', 'Hvala, popravićemo.');
        $this->assertNotNull($review->fresh()->replied_at);

        $this->actingAsJwt($this->admin)->putJson("/api/reviews/{$review->id}", ['visible' => false, 'reply' => ''])->assertOk();
        $this->assertFalse($review->fresh()->visible);
        $this->assertNull($review->fresh()->replied_at);
    }

    public function test_my_appointments_flags_reviewable(): void
    {
        $appointment = $this->appointment();
        $this->complete($appointment);

        $this->actingAsJwt($this->client)->postJson('/api/my-appointments/list', ['scope' => 'past'])
            ->assertJsonPath('0.can_review', true)
            ->assertJsonPath('0.review', null);

        BusinessSetting::current()->update(['reviews_enabled' => false]);
        $this->actingAsJwt($this->client)->postJson('/api/my-appointments/list', ['scope' => 'past'])->assertJsonPath('0.can_review', false);
        $this->getJson('/api/public/reviews')->assertJsonPath('enabled', false);
    }
}

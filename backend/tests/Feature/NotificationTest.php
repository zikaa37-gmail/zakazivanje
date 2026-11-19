<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\BusinessSetting;
use App\Models\NotificationLog;
use App\Models\Service;
use App\Models\StaffMember;
use App\Models\User;
use App\Notifications\AdminAppointmentNotification;
use App\Notifications\AppointmentNotification;
use App\Notifications\Channels\WhatsAppChannel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class NotificationTest extends TestCase
{
    use RefreshDatabase;

    private Service $cut;

    private StaffMember $ana;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo('2026-10-19 08:00:00');

        BusinessSetting::current()->update(['booking_confirmation' => 'manual', 'reminder_hours' => 24, 'booking_lead_minutes' => 60, 'allow_guest_booking' => true]);
        $this->cut = Service::create(['name' => 'Šišanje', 'duration_minutes' => 30, 'price' => 1500]);
        $this->ana = StaffMember::create(['first_name' => 'Ana', 'last_name' => 'Jovanović']);
        $this->ana->services()->sync([$this->cut->id]);
        $this->ana->workingHours()->createMany(collect(range(1, 5))->map(fn ($d) => ['weekday' => $d, 'starts_at' => '09:00', 'ends_at' => '17:00'])->all());
        $this->admin = User::factory()->create(['role' => User::ROLE_OWNER, 'email' => 'salon@example.com']);
    }

    private function guestBooking(array $guest, string $at = '2026-10-21 10:00')
    {
        $this->app['auth']->forgetGuards();

        return $this->withoutToken()->postJson('/api/bookings', [
            'service_ids' => [$this->cut->id],
            'staff_member_id' => $this->ana->id,
            'starts_at' => $at,
            'guest' => ['first_name' => 'Marija', 'last_name' => 'Marković', 'phone' => '064 111 2222', ...$guest],
        ])->assertCreated();
    }

    public function test_online_booking_notifies_client_and_admin_then_confirmation(): void
    {
        Notification::fake();

        $id = $this->guestBooking(['email' => 'marija@example.com'])->json('id');
        $client = Appointment::findOrFail($id)->client;

        Notification::assertSentTo($client, AppointmentNotification::class, fn ($n, $channels) => $n->type === AppointmentNotification::RECEIVED && $channels === ['mail']);
        Notification::assertSentTo($this->admin, AdminAppointmentNotification::class, fn ($n) => $n->type === AdminAppointmentNotification::NEW_BOOKING);

        $this->actingAsJwt($this->admin)->postJson("/api/appointments/{$id}/status", ['status' => 'confirmed'])->assertOk();
        Notification::assertSentTo($client, AppointmentNotification::class, fn ($n) => $n->type === AppointmentNotification::CONFIRMED);

        $this->actingAsJwt($this->admin)->postJson("/api/appointments/{$id}/cancel", ['scope' => 'this'])->assertOk();
        Notification::assertSentTo($client, AppointmentNotification::class, fn ($n) => $n->type === AppointmentNotification::CANCELLED);
    }

    public function test_guest_without_email_gets_whatsapp_and_it_is_logged_as_skipped_without_twilio(): void
    {
        $id = $this->guestBooking([])->json('id');

        $log = NotificationLog::where('appointment_id', $id)->where('type', AppointmentNotification::RECEIVED)->firstOrFail();
        $this->assertSame('whatsapp', $log->channel);
        $this->assertSame('+381641112222', $log->recipient);
        $this->assertSame(NotificationLog::STATUS_SKIPPED, $log->status);

        $this->assertTrue(NotificationLog::where('type', AdminAppointmentNotification::NEW_BOOKING)->where('channel', 'mail')->where('status', 'sent')->exists());
    }

    public function test_confirmation_mail_has_calendar_attachment_and_details(): void
    {
        $this->ana->update(['booking_confirmation' => 'automatic']);
        $appointment = Appointment::findOrFail($this->guestBooking(['email' => 'marija@example.com'])->json('id'));

        $mail = (new AppointmentNotification($appointment, AppointmentNotification::CONFIRMED))->toMail($appointment->client);

        $this->assertStringStartsWith('Termin je potvrđen — ', $mail->subject);
        $this->assertStringContainsString('Sreda, 21.10.2026. u 10:00', implode(' ', $mail->introLines));
        $this->assertSame('termin.ics', $mail->rawAttachments[0]['name']);
        $this->assertStringContainsString('DTSTART:20261021T080000Z', $mail->rawAttachments[0]['data']);
        $this->assertTrue(NotificationLog::where('type', AppointmentNotification::CONFIRMED)->where('status', 'sent')->exists());
    }

    public function test_client_cancel_notifies_admin_and_toggles_disable_messages(): void
    {
        Notification::fake();
        BusinessSetting::current()->update(['notify_booking_received' => false, 'notify_admin_new_booking' => false]);

        $client = User::factory()->create(['email' => 'petar@example.com']);
        $id = $this->actingAsJwt($client)->postJson('/api/bookings', [
            'service_ids' => [$this->cut->id], 'staff_member_id' => $this->ana->id, 'starts_at' => '2026-10-22 10:00',
        ])->assertCreated()->json('id');

        Notification::assertNothingSent();

        BusinessSetting::current()->update(['notify_admin_new_booking' => true]);
        $this->actingAsJwt($client)->postJson("/api/my-appointments/{$id}/cancel")->assertOk();
        Notification::assertSentTo($this->admin, AdminAppointmentNotification::class, fn ($n) => $n->type === AdminAppointmentNotification::CLIENT_CANCELLED);
    }

    public function test_reminders_are_sent_once_and_skip_late_bookings(): void
    {
        Notification::fake();
        $client = User::factory()->create(['email' => 'petar@example.com']);

        $early = $this->actingAsJwt($this->admin)->postJson('/api/appointments', [
            'client_id' => $client->id, 'service_ids' => [$this->cut->id], 'staff_member_id' => $this->ana->id, 'starts_at' => '2026-10-21 10:00',
        ])->json('appointments.0.id');

        $this->travelTo('2026-10-20 12:00:00');
        $late = $this->actingAsJwt($this->admin)->postJson('/api/appointments', [
            'client_id' => $client->id, 'service_ids' => [$this->cut->id], 'staff_member_id' => $this->ana->id, 'starts_at' => '2026-10-21 11:00',
        ])->json('appointments.0.id');

        $this->artisan('appointments:send-reminders')->assertSuccessful();
        $this->artisan('appointments:send-reminders')->assertSuccessful();

        Notification::assertSentToTimes($client, AppointmentNotification::class, 3);
        Notification::assertSentTo($client, AppointmentNotification::class, fn ($n) => $n->type === AppointmentNotification::REMINDER && $n->appointment->id === $early);
        Notification::assertNotSentTo($client, AppointmentNotification::class, fn ($n) => $n->type === AppointmentNotification::REMINDER && $n->appointment->id === $late);
        $this->assertNotNull(Appointment::find($late)->reminder_sent_at);
    }

    public function test_recurring_series_sends_one_message_with_label(): void
    {
        Notification::fake();
        $client = User::factory()->create(['email' => 'petar@example.com']);

        $this->actingAsJwt($this->admin)->postJson('/api/appointments', [
            'client_id' => $client->id, 'service_ids' => [$this->cut->id], 'staff_member_id' => $this->ana->id,
            'starts_at' => '2026-10-19 15:00', 'recurrence' => ['interval_weeks' => 2, 'count' => 3],
        ])->assertCreated();

        Notification::assertSentToTimes($client, AppointmentNotification::class, 1);
        Notification::assertSentTo($client, AppointmentNotification::class, fn ($n) => $n->recurrenceLabel === 'svake druge nedelje');
    }

    public function test_failed_test_mail_returns_readable_error(): void
    {
        config(['mail.default' => 'smtp', 'mail.mailers.smtp.host' => '127.0.0.1', 'mail.mailers.smtp.port' => 1, 'mail.mailers.smtp.timeout' => 1]);

        $this->actingAsJwt($this->admin)->postJson('/api/notifications/test', ['channel' => 'mail'])
            ->assertUnprocessable()->assertJsonValidationErrors('channel');

        $this->assertTrue(NotificationLog::where('type', 'test')->where('status', 'failed')->exists());
    }

    public function test_channel_selection_follows_preference_with_fallback(): void
    {
        $map = ['mail' => 'mail', 'whatsapp' => WhatsAppChannel::class];

        $this->assertSame(['mail'], User::factory()->make(['preferred_communication' => 'email', 'email' => 'a@b.rs', 'phone' => '064 1'])->notificationChannels($map));
        $this->assertSame([WhatsAppChannel::class], User::factory()->make(['preferred_communication' => 'whatsapp', 'email' => 'a@b.rs', 'phone' => '064 123 4567'])->notificationChannels($map));
        $this->assertSame(['mail'], User::factory()->make(['preferred_communication' => 'whatsapp', 'email' => 'a@b.rs', 'phone' => null])->notificationChannels($map));
        $this->assertSame(['mail', WhatsAppChannel::class], User::factory()->make(['preferred_communication' => 'both', 'email' => 'a@b.rs', 'phone' => '064 123 4567'])->notificationChannels($map));
        $this->assertSame([], User::factory()->make(['email' => null, 'phone' => null])->notificationChannels($map));
    }

    public function test_admin_test_message_and_logs(): void
    {
        $this->actingAsJwt($this->admin)->postJson('/api/notifications/test', ['channel' => 'mail'])
            ->assertOk()->assertJsonPath('message', 'Probni mejl je poslat na salon@example.com.');

        $this->actingAsJwt($this->admin)->postJson('/api/notification-logs/list')
            ->assertOk()->assertJsonPath('0.type', 'test')->assertJsonPath('0.status', 'sent');

        $this->admin->update(['phone' => null, 'whatsapp_number' => null]);
        $this->actingAsJwt($this->admin)->postJson('/api/notifications/test', ['channel' => 'whatsapp'])->assertUnprocessable();
        $this->actingAsJwt(User::factory()->create())->postJson('/api/notification-logs/list')->assertForbidden();
    }
}

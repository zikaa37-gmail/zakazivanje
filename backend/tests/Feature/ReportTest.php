<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\BusinessSetting;
use App\Models\StaffMember;
use App\Models\User;
use App\Notifications\ReportNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class ReportTest extends TestCase
{
    use RefreshDatabase;

    private User $owner;

    private StaffMember $ana;

    private StaffMember $marko;

    private User $client;

    protected function setUp(): void
    {
        parent::setUp();
        $this->owner = User::factory()->create(['role' => User::ROLE_OWNER]);
        $this->ana = StaffMember::create(['first_name' => 'Ana', 'last_name' => 'Jovanović']);
        $this->marko = StaffMember::create(['first_name' => 'Marko', 'last_name' => 'Marković', 'active' => false]);
        $this->client = User::factory()->create();

        $this->appointment($this->ana, '2026-11-02 10:00', Appointment::STATUS_COMPLETED, 2000, ['paid_at' => '2026-11-02 11:00', 'payment_method' => 'cash', 'tip' => 300]);
        $this->appointment($this->ana, '2026-11-03 10:00', Appointment::STATUS_COMPLETED, 1500);
        $this->appointment($this->ana, '2026-11-04 10:00', Appointment::STATUS_CANCELLED, 1500, ['cancelled_by' => 'client']);
        $this->appointment($this->marko, '2026-11-02 12:00', Appointment::STATUS_NO_SHOW, 1000);
        $this->appointment($this->marko, '2026-11-20 12:00', Appointment::STATUS_COMPLETED, 3000);
    }

    private function appointment(StaffMember $staff, string $start, string $status, float $total, array $extra = []): Appointment
    {
        $appointment = Appointment::create([
            'client_id' => $this->client->id,
            'staff_member_id' => $staff->id,
            'starts_at' => $start,
            'ends_at' => date('Y-m-d H:i', strtotime($start) + 3600),
            'status' => $status,
            'source' => Appointment::SOURCE_ADMIN,
            'price' => $total,
            'discount' => 0,
            'total' => $total,
            ...$extra,
        ]);
        $appointment->items()->create(['name' => 'Šišanje', 'duration_minutes' => 60, 'price' => $total, 'discount' => 0]);

        return $appointment;
    }

    public function test_summary_week_report_includes_inactive_staff_with_appointments(): void
    {
        $report = $this->actingAsJwt($this->owner)->postJson('/api/reports', ['period' => 'week', 'date' => '2026-11-04'])
            ->assertOk()
            ->assertJsonPath('period.from', '2026-11-02')
            ->assertJsonPath('period.to', '2026-11-08')
            ->json();

        $this->assertSame(3, $report['totals']['appointments']);
        $this->assertSame(2, $report['totals']['completed']);
        $this->assertSame(1, $report['totals']['cancelled_by_client']);
        $this->assertSame(1, $report['totals']['no_shows']);
        $this->assertEquals(3500, $report['totals']['revenue']);
        $this->assertEquals(2000, $report['totals']['paid']);
        $this->assertEquals(2000, $report['totals']['by_method']['cash']);
        $this->assertEquals(300, $report['totals']['tips']);
        $this->assertCount(7, $report['days']);
        $this->assertSame(['Ana Jovanović', 'Marko Marković'], array_column($report['staff'], 'name'));
    }

    public function test_staff_month_report(): void
    {
        $report = $this->actingAsJwt($this->owner)->postJson('/api/reports', ['period' => 'month', 'date' => '2026-11-15', 'staff_member_id' => $this->marko->id])
            ->assertOk()->json();

        $this->assertSame('Izveštaj — Marko Marković', $report['title']);
        $this->assertSame(2, $report['totals']['appointments']);
        $this->assertEquals(3000, $report['totals']['revenue']);
        $this->assertSame([], $report['staff']);
    }

    public function test_linked_worker_sees_only_own_report_and_admin_worker_only_sends_to_owner(): void
    {
        $worker = User::factory()->create(['role' => User::ROLE_WORKER, 'staff_member_id' => $this->ana->id]);

        $this->actingAsJwt($worker)->postJson('/api/reports', ['period' => 'day', 'date' => '2026-11-02'])
            ->assertOk()->assertJsonPath('staff_member.id', $this->ana->id)->assertJsonCount(1, 'appointments');
        $this->actingAsJwt($worker)->postJson('/api/reports', ['period' => 'day', 'date' => '2026-11-02', 'staff_member_id' => $this->marko->id])
            ->assertUnprocessable();

        $reception = User::factory()->create(['role' => User::ROLE_MANAGER]);
        $this->actingAsJwt($reception)->postJson('/api/reports', ['period' => 'day', 'date' => '2026-11-02'])->assertForbidden();
        $this->actingAsJwt($reception)->postJson('/api/reports/pdf', ['period' => 'day', 'date' => '2026-11-02'])->assertForbidden();

        Notification::fake();
        $this->actingAsJwt($reception)->postJson('/api/reports/send', ['period' => 'day', 'date' => '2026-11-02', 'channel' => 'mail'])->assertOk();
        Notification::assertSentTo($this->owner, ReportNotification::class);
        Notification::assertNotSentTo($reception, ReportNotification::class);

        $this->actingAsJwt($this->client)->postJson('/api/reports', ['period' => 'day', 'date' => '2026-11-02'])->assertForbidden();
    }

    public function test_pdf_and_send(): void
    {
        $response = $this->actingAsJwt($this->owner)->postJson('/api/reports/pdf', ['period' => 'week', 'date' => '2026-11-04'])->assertOk();
        $this->assertSame('application/pdf', $response->headers->get('Content-Type'));
        $this->assertStringStartsWith('%PDF', $response->getContent());

        Notification::fake();
        $this->actingAsJwt($this->owner)->postJson('/api/reports/send', ['period' => 'week', 'date' => '2026-11-04', 'channel' => 'mail'])->assertOk();
        Notification::assertSentTo($this->owner, ReportNotification::class);
    }

    public function test_scheduled_reports_are_off_by_default(): void
    {
        Notification::fake();

        $this->artisan('reports:send-scheduled', ['--date' => '2026-11-30'])->assertSuccessful();
        Notification::assertNothingSent();

        BusinessSetting::current()->update(['report_auto_enabled' => true]);
        User::factory()->create(['role' => User::ROLE_WORKER, 'staff_member_id' => $this->ana->id]);
        User::factory()->create(['role' => User::ROLE_MANAGER]);

        $this->artisan('reports:send-scheduled', ['--date' => '2026-11-30'])->assertSuccessful();
        Notification::assertCount(4);
    }
}

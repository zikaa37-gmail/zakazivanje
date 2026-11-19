<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\BlockedTime;
use App\Models\Service;
use App\Models\StaffMember;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private StaffMember $ana;

    private Service $cut;

    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo('2026-10-14 08:00:00');

        $this->admin = User::factory()->create(['role' => User::ROLE_OWNER]);
        $this->cut = Service::create(['name' => 'Šišanje', 'duration_minutes' => 60, 'price' => 2000]);
        $this->ana = StaffMember::create(['first_name' => 'Ana', 'last_name' => 'Test']);
        $this->ana->services()->sync([$this->cut->id]);
        $this->ana->workingHours()->createMany(collect(range(1, 5))->map(fn ($d) => ['weekday' => $d, 'starts_at' => '09:00', 'ends_at' => '17:00'])->all());
    }

    private function appointment(string $at, string $status, ?User $client = null, ?StaffMember $staff = null): Appointment
    {
        $id = $this->actingAsJwt($this->admin)->postJson('/api/appointments', [
            'client_id' => ($client ?? User::factory()->create())->id,
            'service_ids' => [$this->cut->id],
            'staff_member_id' => ($staff ?? $this->ana)->id,
            'starts_at' => $at,
        ])->assertCreated()->json('appointments.0.id');

        if ($status !== 'confirmed') {
            Appointment::whereKey($id)->update(['status' => $status]);
        }

        return Appointment::find($id);
    }

    public function test_admin_only(): void
    {
        $this->postJson('/api/dashboard/today')->assertUnauthorized();
        $this->actingAsJwt(User::factory()->create())->postJson('/api/dashboard/stats', ['from' => '2026-10-01', 'to' => '2026-10-07'])->assertForbidden();
    }

    public function test_stats_summary_series_top_services_and_utilization(): void
    {
        $this->appointment('2026-10-19 09:00', 'completed');
        $this->appointment('2026-10-19 10:00', 'completed');
        $this->appointment('2026-10-20 09:00', 'no_show');
        $this->appointment('2026-10-20 11:00', 'cancelled');
        $this->appointment('2026-10-21 09:00', 'confirmed');
        $this->appointment('2026-10-13 09:00', 'completed');
        BlockedTime::create(['staff_member_id' => null, 'starts_at' => '2026-10-21 12:00', 'ends_at' => '2026-10-21 13:00']);

        $stats = $this->actingAsJwt($this->admin)->postJson('/api/dashboard/stats', ['from' => '2026-10-19', 'to' => '2026-10-25'])->assertOk()->json();

        $this->assertSame(4, $stats['summary']['appointments']);
        $this->assertSame(2, $stats['summary']['completed']);
        $this->assertSame(1, $stats['summary']['cancelled']);
        $this->assertSame(1, $stats['summary']['no_shows']);
        $this->assertEqualsWithDelta(33.3, $stats['summary']['no_show_rate'], 0.05);
        $this->assertEqualsWithDelta(4000, $stats['summary']['revenue'], 0.01);
        $this->assertEqualsWithDelta(2000, $stats['summary']['average_ticket'], 0.01);
        $this->assertSame(1, $stats['previous']['completed']);

        $this->assertCount(7, $stats['series']);
        $this->assertSame(['date' => '2026-10-19', 'appointments' => 2, 'revenue' => 4000], array_map(fn ($v) => is_float($v) ? (int) $v : $v, $stats['series'][0]));
        $this->assertSame(0, $stats['series'][6]['appointments']);

        $this->assertSame('Šišanje', $stats['top_services'][0]['name']);
        $this->assertSame(4, $stats['top_services'][0]['count']);

        $ana = $stats['staff_utilization'][0];
        $this->assertSame(240, $ana['booked_minutes']);
        $this->assertSame(5 * 480 - 60, $ana['available_minutes']);
        $this->assertEqualsWithDelta(10.3, $ana['rate'], 0.05);
    }

    public function test_today_lists_schedule_next_and_pending(): void
    {
        $this->travelTo('2026-10-19 08:00:00');
        $this->appointment('2026-10-19 09:00', 'confirmed');
        $pending = $this->appointment('2026-10-19 11:00', 'pending');
        $this->appointment('2026-10-19 13:00', 'cancelled');
        $this->appointment('2026-10-22 10:00', 'pending');

        $this->travelTo('2026-10-19 10:30:00');
        $today = $this->actingAsJwt($this->admin)->postJson('/api/dashboard/today')->assertOk()->json();

        $this->assertCount(2, $today['appointments']);
        $this->assertSame($pending->id, $today['next']['id']);
        $this->assertCount(2, $today['pending']);
        $this->assertSame('09:00 – 17:00', $today['staff'][0]['hours']);
        $this->assertSame(2, $today['staff'][0]['appointments']);
        $this->assertEqualsWithDelta(4000, $today['expected_revenue'], 0.01);
    }

    public function test_today_filters_by_staff_and_linked_worker_sees_only_own(): void
    {
        $this->travelTo('2026-10-19 08:00:00');
        $marko = StaffMember::create(['first_name' => 'Marko', 'last_name' => 'Test']);
        $marko->services()->sync([$this->cut->id]);
        $marko->workingHours()->createMany(collect(range(1, 5))->map(fn ($d) => ['weekday' => $d, 'starts_at' => '09:00', 'ends_at' => '17:00'])->all());
        $this->appointment('2026-10-19 09:00', 'confirmed');
        $markos = $this->appointment('2026-10-19 10:00', 'pending', null, $marko);

        $filtered = $this->actingAsJwt($this->admin)->postJson('/api/dashboard/today', ['staff_member_id' => $marko->id])->assertOk()->json();
        $this->assertSame([$markos->id], array_column($filtered['appointments'], 'id'));
        $this->assertSame($markos->id, $filtered['next']['id']);
        $this->assertSame([$markos->id], array_column($filtered['pending'], 'id'));
        $this->assertEqualsWithDelta(2000, $filtered['expected_revenue'], 0.01);
        $this->assertCount(2, $filtered['staff']);

        $worker = User::factory()->create(['role' => User::ROLE_WORKER, 'staff_member_id' => $this->ana->id]);
        $own = $this->actingAsJwt($worker)->postJson('/api/dashboard/today', ['staff_member_id' => $marko->id])->assertOk()->json();
        $this->assertSame($this->ana->id, $own['staff_member_id']);
        $this->assertCount(1, $own['appointments']);
        $this->assertSame($this->ana->id, $own['appointments'][0]['staff_member_id']);
        $this->assertSame([], $own['pending']);

        $office = User::factory()->create(['role' => User::ROLE_MANAGER]);
        $all = $this->actingAsJwt($office)->postJson('/api/dashboard/today')->assertOk()->json();
        $this->assertNull($all['staff_member_id']);
        $this->assertCount(2, $all['appointments']);
    }

    public function test_period_is_limited_to_one_year(): void
    {
        $this->actingAsJwt($this->admin)->postJson('/api/dashboard/stats', ['from' => '2025-01-01', 'to' => '2026-10-01'])
            ->assertUnprocessable()->assertJsonValidationErrors('to');
    }
}

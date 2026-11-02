<?php

namespace Tests\Feature;

use App\Models\Service;
use App\Models\ServiceCategory;
use App\Models\StaffMember;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ServiceCategoryTest extends TestCase
{
    use RefreshDatabase;

    private User $owner;

    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo('2026-10-14 08:00:00');
        $this->owner = User::factory()->create(['role' => User::ROLE_OWNER]);
    }

    public function test_categories_are_managed_by_managers_only(): void
    {
        $worker = User::factory()->create(['role' => User::ROLE_WORKER, 'staff_member_id' => StaffMember::create(['first_name' => 'Ana', 'last_name' => 'Test'])->id]);
        $this->actingAsJwt($worker)->postJson('/api/service-categories', ['name' => 'Nokti'])->assertForbidden();

        $id = $this->actingAsJwt($this->owner)->postJson('/api/service-categories', ['name' => 'Nokti'])
            ->assertCreated()->assertJsonPath('services_count', 0)->json('id');
        $this->actingAsJwt($this->owner)->postJson('/api/service-categories', ['name' => 'Nokti'])
            ->assertUnprocessable()->assertJsonPath('errors.name.0', 'Kategorija sa tim nazivom već postoji.');

        $this->actingAsJwt($this->owner)->putJson("/api/service-categories/{$id}", ['name' => 'Manikir i pedikir'])
            ->assertOk()->assertJsonPath('name', 'Manikir i pedikir');
    }

    public function test_service_carries_category_name_and_lists_follow_category_order(): void
    {
        $hair = ServiceCategory::create(['name' => 'Kosa', 'sort_order' => 1]);
        $nails = ServiceCategory::create(['name' => 'Nokti', 'sort_order' => 0]);
        Service::create(['name' => 'Šišanje', 'duration_minutes' => 30, 'price' => 1500, 'service_category_id' => $hair->id]);
        Service::create(['name' => 'Gel lak', 'duration_minutes' => 60, 'price' => 2000, 'service_category_id' => $nails->id]);
        Service::create(['name' => 'Konsultacija', 'duration_minutes' => 15, 'price' => 500]);

        $this->getJson('/api/public/services')->assertOk()
            ->assertJsonPath('0.name', 'Gel lak')->assertJsonPath('0.category', 'Nokti')
            ->assertJsonPath('1.category', 'Kosa')
            ->assertJsonPath('2.category', null);

        $this->actingAsJwt($this->owner)->postJson('/api/service-categories/reorder', ['ids' => [$hair->id, $nails->id]])->assertOk();
        $this->getJson('/api/public/services')->assertJsonPath('0.name', 'Šišanje');
    }

    public function test_deactivated_category_hides_services_from_online_booking_but_not_from_salon(): void
    {
        $category = ServiceCategory::create(['name' => 'Nokti']);
        $service = Service::create(['name' => 'Gel lak', 'duration_minutes' => 60, 'price' => 2000, 'service_category_id' => $category->id]);
        $staff = StaffMember::create(['first_name' => 'Ana', 'last_name' => 'Test']);
        $staff->services()->sync([$service->id]);
        $staff->workingHours()->createMany(collect(range(1, 5))->map(fn ($d) => ['weekday' => $d, 'starts_at' => '09:00', 'ends_at' => '17:00'])->all());
        $client = User::factory()->create();

        $this->actingAsJwt($this->owner)->postJson("/api/service-categories/{$category->id}/active", ['active' => false])
            ->assertOk()->assertJsonPath('active', false);

        $this->withoutToken()->getJson('/api/public/services')->assertOk()->assertJsonCount(0);
        $this->postJson('/api/availability/slots', ['service_ids' => [$service->id], 'date' => '2026-10-16'])->assertOk()->assertJsonCount(0);
        $this->actingAsJwt($client)->postJson('/api/bookings', ['service_ids' => [$service->id], 'starts_at' => '2026-10-16 10:00'])->assertUnprocessable();

        $this->actingAsJwt($this->owner)->postJson('/api/services/list')->assertOk()->assertJsonPath('0.name', 'Gel lak');
        $this->actingAsJwt($this->owner)->postJson('/api/appointments', [
            'client_id' => $client->id,
            'service_ids' => [$service->id],
            'staff_member_id' => $staff->id,
            'starts_at' => '2026-10-16 10:00',
        ])->assertCreated();
    }

    public function test_category_with_services_cannot_be_deleted(): void
    {
        $category = ServiceCategory::create(['name' => 'Nokti']);
        $empty = ServiceCategory::create(['name' => 'Trepavice']);
        Service::create(['name' => 'Gel lak', 'duration_minutes' => 60, 'price' => 2000, 'service_category_id' => $category->id]);

        $this->actingAsJwt($this->owner)->deleteJson("/api/service-categories/{$category->id}")->assertUnprocessable();
        $this->actingAsJwt($this->owner)->deleteJson("/api/service-categories/{$empty->id}")->assertOk();
        $this->assertDatabaseMissing('service_categories', ['id' => $empty->id]);
    }

    public function test_apply_creates_categories_and_services_without_duplicates(): void
    {
        ServiceCategory::create(['name' => 'Nokti']);
        Service::create(['name' => 'Gel lak', 'duration_minutes' => 60, 'price' => 2000]);
        $staff = StaffMember::create(['first_name' => 'Ana', 'last_name' => 'Test']);

        $this->actingAsJwt($this->owner)->postJson('/api/service-categories/apply', [
            'categories' => [
                ['name' => 'nokti', 'services' => [
                    ['name' => 'Gel lak', 'duration_minutes' => 60, 'price' => 2200],
                    ['name' => 'Manikir', 'duration_minutes' => 45, 'price' => 1500, 'audience' => 'all'],
                ]],
                ['name' => 'Trepavice', 'services' => [
                    ['name' => 'Nadogradnja trepavica', 'duration_minutes' => 120, 'price' => null, 'audience' => 'female'],
                ]],
            ],
            'staff_member_ids' => [$staff->id],
        ])->assertOk()
            ->assertJsonPath('categories_created', 1)
            ->assertJsonPath('services_created', 2)
            ->assertJsonPath('services_skipped', 1);

        $this->assertSame(2, ServiceCategory::count());
        $manicure = Service::where('name', 'Manikir')->first();
        $this->assertSame('Nokti', $manicure->category);
        $this->assertTrue($manicure->active);
        $this->assertTrue($manicure->staffMembers->contains($staff));
        $this->assertFalse(Service::where('name', 'Nadogradnja trepavica')->first()->active);
    }
}

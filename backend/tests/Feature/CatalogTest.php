<?php

namespace Tests\Feature;

use App\Models\BusinessSetting;
use App\Models\Promotion;
use App\Models\Service;
use App\Models\StaffMember;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CatalogTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->create(['role' => User::ROLE_ADMIN]);
    }

    public function test_admin_routes_require_admin(): void
    {
        $this->postJson('/api/staff/list')->assertUnauthorized();
        $this->actingAsJwt(User::factory()->create())->postJson('/api/services/list')->assertForbidden();
    }

    public function test_staff_with_services_and_working_hours(): void
    {
        $service = Service::create(['name' => 'Šišanje', 'duration_minutes' => 30, 'price' => 1500]);

        $id = $this->actingAsJwt($this->admin)->postJson('/api/staff', [
            'first_name' => 'Ana',
            'last_name' => 'Jovanović',
            'booking_confirmation' => 'automatic',
            'service_ids' => [$service->id],
            'working_hours' => [
                ['weekday' => 1, 'starts_at' => '09:00', 'ends_at' => '13:00'],
                ['weekday' => 1, 'starts_at' => '14:00', 'ends_at' => '18:00'],
            ],
        ])->assertCreated()->assertJsonPath('working_hours.1.starts_at', '14:00')->json('id');

        $this->assertSame('automatic', StaffMember::find($id)->confirmationMode());

        $this->actingAsJwt($this->admin)->putJson("/api/staff/{$id}", [
            'first_name' => 'Ana',
            'last_name' => 'Jovanović',
            'booking_confirmation' => null,
            'working_hours' => [
                ['weekday' => 2, 'starts_at' => '09:00', 'ends_at' => '12:00'],
                ['weekday' => 2, 'starts_at' => '11:00', 'ends_at' => '15:00'],
            ],
        ])->assertUnprocessable()->assertJsonValidationErrors('working_hours');

        $this->actingAsJwt($this->admin)->putJson("/api/staff/{$id}", [
            'first_name' => 'Ana',
            'last_name' => 'Jovanović',
            'booking_confirmation' => null,
        ])->assertOk();

        BusinessSetting::current()->update(['booking_confirmation' => 'manual']);
        $this->assertSame('manual', StaffMember::find($id)->confirmationMode());
    }

    public function test_service_crud_and_public_listing(): void
    {
        $staff = StaffMember::create(['first_name' => 'Ana', 'last_name' => 'Jovanović']);

        $id = $this->actingAsJwt($this->admin)->postJson('/api/services', [
            'name' => 'Farbanje', 'duration_minutes' => 90, 'price' => 4500, 'staff_member_ids' => [$staff->id],
        ])->assertCreated()->assertJsonPath('staff_members.0.id', $staff->id)->json('id');

        $this->actingAsJwt($this->admin)->putJson("/api/services/{$id}", [
            'name' => 'Farbanje', 'duration_minutes' => 90, 'price' => 4500, 'active' => false,
        ])->assertOk();

        $this->getJson('/api/public/services')->assertOk()->assertJsonCount(0);
    }

    public function test_promotion_requires_fields_for_its_type(): void
    {
        $this->actingAsJwt($this->admin)->postJson('/api/promotions', ['name' => '2+1', 'type' => 'bundle', 'buy_quantity' => 2])
            ->assertUnprocessable()->assertJsonValidationErrors('free_quantity');

        $service = Service::create(['name' => 'Šišanje', 'duration_minutes' => 30, 'price' => 1500]);

        $this->actingAsJwt($this->admin)->postJson('/api/promotions', [
            'name' => 'Paket', 'type' => 'package', 'package_price' => 1000, 'service_ids' => [$service->id],
        ])->assertUnprocessable()->assertJsonValidationErrors('service_ids');

        $this->actingAsJwt($this->admin)->postJson('/api/promotions', [
            'name' => '-10%', 'type' => 'discount_percent', 'discount_percent' => 10, 'package_price' => 999,
        ])->assertCreated()->assertJsonPath('package_price', null);
    }

    public function test_price_quote_applies_package_then_best_line_discount(): void
    {
        $cut = Service::create(['name' => 'Šišanje', 'duration_minutes' => 45, 'price' => 2500]);
        $blow = Service::create(['name' => 'Feniranje', 'duration_minutes' => 30, 'price' => 1200]);
        $nails = Service::create(['name' => 'Manikir', 'duration_minutes' => 60, 'price' => 2000]);

        Promotion::create(['name' => 'Paket', 'type' => 'package', 'package_price' => 3200])->services()->sync([$cut->id, $blow->id]);
        Promotion::create(['name' => '-10%', 'type' => 'discount_percent', 'discount_percent' => 10])->services()->sync([$nails->id]);
        Promotion::create(['name' => '-300', 'type' => 'discount_amount', 'discount_amount' => 300])->services()->sync([$nails->id]);
        Promotion::create(['name' => 'Isteklo', 'type' => 'discount_percent', 'discount_percent' => 90, 'ends_on' => '2020-01-01']);

        $quote = $this->actingAsJwt($this->admin)->postJson('/api/services/quote', [
            'service_ids' => [$cut->id, $blow->id, $nails->id],
            'date' => '2026-10-21',
        ])->assertOk()->json();

        $this->assertEqualsWithDelta(3200, $quote['packages'][0]['total'], 0.01);
        $this->assertSame('-300', $quote['lines'][0]['promotion_name']);
        $this->assertEqualsWithDelta(4900, $quote['total'], 0.01);
    }

    public function test_bundle_and_loyalty(): void
    {
        $cut = Service::create(['name' => 'Muško šišanje', 'duration_minutes' => 30, 'price' => 1500]);
        Promotion::create(['name' => '2+1', 'type' => 'bundle', 'buy_quantity' => 2, 'free_quantity' => 1])->services()->sync([$cut->id]);
        Promotion::create(['name' => 'Loyalty', 'type' => 'loyalty', 'loyalty_visits' => 5, 'discount_percent' => 50]);

        $quote = fn (int $ofService, int $visits) => $this->actingAsJwt($this->admin)->postJson('/api/services/quote', [
            'service_ids' => [$cut->id],
            'completed_visits_by_service' => [$cut->id => $ofService],
            'completed_visits' => $visits,
        ])->json('total');

        $this->assertEqualsWithDelta(1500, $quote(0, 0), 0.01);
        $this->assertEqualsWithDelta(1500, $quote(1, 1), 0.01);
        $this->assertEqualsWithDelta(0, $quote(2, 2), 0.01);
        $this->assertEqualsWithDelta(1500, $quote(3, 3), 0.01);
        $this->assertEqualsWithDelta(750, $quote(3, 4), 0.01);
    }

    public function test_clients_crud_and_search(): void
    {
        $id = $this->actingAsJwt($this->admin)->postJson('/api/clients', [
            'first_name' => 'Ivana', 'last_name' => 'Mitić', 'phone' => '065 444 5555', 'note' => 'Telefonom',
        ])->assertCreated()->assertJsonPath('has_account', false)->json('id');

        User::factory()->create(['first_name' => 'Petar', 'last_name' => 'Petrović']);

        $this->actingAsJwt($this->admin)->postJson('/api/clients/list', ['search' => '444'])
            ->assertOk()->assertJsonPath('total', 1)->assertJsonPath('data.0.id', $id);

        $this->actingAsJwt($this->admin)->putJson("/api/clients/{$this->admin->id}", [
            'first_name' => 'X', 'last_name' => 'Y', 'phone' => '1',
        ])->assertNotFound();

        $this->postJson('/api/auth/login', ['email' => 'x@example.com', 'password' => 'x'])->assertUnprocessable();

        $this->actingAsJwt($this->admin)->deleteJson("/api/clients/{$id}")->assertOk();
    }
}

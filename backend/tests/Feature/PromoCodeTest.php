<?php

namespace Tests\Feature;

use App\Models\BusinessSetting;
use App\Models\Promotion;
use App\Models\Service;
use App\Models\StaffMember;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PromoCodeTest extends TestCase
{
    use RefreshDatabase;

    private Service $cut;

    private StaffMember $ana;

    private User $owner;

    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo('2026-11-23 08:00:00');

        BusinessSetting::current()->update([
            'booking_confirmation' => 'manual',
            'slot_interval_minutes' => 30,
            'booking_lead_minutes' => 60,
            'booking_horizon_days' => 60,
            'booking_min_days_ahead' => 0,
            'allow_guest_booking' => true,
        ]);

        $this->owner = User::factory()->create(['role' => User::ROLE_OWNER]);
        $this->cut = Service::create(['name' => 'Šišanje', 'duration_minutes' => 30, 'price' => 2000]);
        $this->ana = StaffMember::create(['first_name' => 'Ana', 'last_name' => 'Test']);
        $this->ana->services()->sync([$this->cut->id]);
        $this->ana->workingHours()->createMany(collect(range(1, 7))->map(fn ($d) => ['weekday' => $d, 'starts_at' => '09:00', 'ends_at' => '17:00'])->all());
    }

    private function promotion(array $overrides = []): array
    {
        return [
            'name' => 'Crni petak',
            'code' => 'crnipetak20',
            'type' => Promotion::TYPE_PERCENT,
            'discount_percent' => 20,
            'starts_on' => '2026-11-27',
            'ends_on' => '2026-11-27',
            'active' => true,
            'service_ids' => [],
            ...$overrides,
        ];
    }

    private function quote(?string $code, string $date = '2026-11-27'): array
    {
        $this->app['auth']->forgetGuards();

        return $this->withoutToken()->postJson('/api/bookings/quote', ['service_ids' => [$this->cut->id], 'date' => $date, 'promo_code' => $code])->assertOk()->json();
    }

    private function book(string $at, string $phone, ?string $code): \Illuminate\Testing\TestResponse
    {
        $this->app['auth']->forgetGuards();

        return $this->withoutToken()->postJson('/api/bookings', [
            'service_ids' => [$this->cut->id],
            'staff_member_id' => $this->ana->id,
            'starts_at' => $at,
            'promo_code' => $code,
            'guest' => ['first_name' => 'Mila', 'last_name' => 'M', 'phone' => $phone],
        ]);
    }

    public function test_code_discount_applies_only_with_code_and_limits_are_enforced(): void
    {
        $this->actingAsJwt($this->owner)->postJson('/api/promotions', $this->promotion(['max_uses' => 1]))
            ->assertCreated()->assertJsonPath('code', 'CRNIPETAK20');
        $this->actingAsJwt($this->owner)->postJson('/api/promotions', $this->promotion(['name' => 'Duplikat']))
            ->assertUnprocessable()->assertJsonValidationErrors('code');

        $this->assertEquals(2000, $this->quote(null)['total']);
        $withCode = $this->quote('CrniPetak20');
        $this->assertEquals(1600, $withCode['total']);
        $this->assertTrue($withCode['code_applied']);
        $this->assertNotNull($this->quote('CRNIPETAK20', '2026-11-28')['code_error']);
        $this->assertNotNull($this->quote('NEPOSTOJI')['code_error']);

        $this->book('2026-11-27 10:00', '061 111 1111', 'crnipetak20')->assertCreated()->assertJsonPath('total', 1600);
        $this->book('2026-11-27 11:00', '062 222 2222', 'crnipetak20')->assertUnprocessable()->assertJsonValidationErrors('promo_code');
        $this->book('2026-11-27 11:00', '062 222 2222', null)->assertCreated()->assertJsonPath('total', 2000);
    }

    public function test_once_per_client_code(): void
    {
        $this->actingAsJwt($this->owner)->postJson('/api/promotions', $this->promotion(['code' => 'INSTA10', 'discount_percent' => 10, 'starts_on' => null, 'ends_on' => null, 'once_per_client' => true]))->assertCreated();

        $this->book('2026-11-24 10:00', '061 111 1111', 'INSTA10')->assertCreated()->assertJsonPath('total', 1800);
        $this->book('2026-11-25 10:00', '061 111 1111', 'INSTA10')->assertUnprocessable()->assertJsonValidationErrors('promo_code');
        $this->book('2026-11-25 10:00', '063 333 3333', 'INSTA10')->assertCreated()->assertJsonPath('total', 1800);
    }
}

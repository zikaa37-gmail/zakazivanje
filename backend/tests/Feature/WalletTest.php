<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Appointment;
use App\Models\GiftCard;
use App\Models\Service;
use App\Models\StaffMember;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WalletTest extends TestCase
{
    use RefreshDatabase;

    private User $owner;

    private User $client;

    private Appointment $appointment;

    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo('2026-10-14 08:00:00');

        $this->owner = User::factory()->create(['role' => UserRole::Owner]);
        $this->client = User::factory()->create(['first_name' => 'Petar', 'last_name' => 'Petrović']);
        $cut = Service::create(['name' => 'Šišanje', 'duration_minutes' => 60, 'price' => 2000]);
        $ana = StaffMember::create(['first_name' => 'Ana', 'last_name' => 'Test']);
        $ana->services()->sync([$cut->id]);
        $ana->workingHours()->createMany(collect(range(1, 5))->map(fn ($d) => ['weekday' => $d, 'starts_at' => '09:00', 'ends_at' => '17:00'])->all());

        $id = $this->actingAsJwt($this->owner)->postJson('/api/appointments', [
            'client_id' => $this->client->id,
            'service_ids' => [$cut->id],
            'staff_member_id' => $ana->id,
            'starts_at' => '2026-10-20 10:00',
        ])->assertCreated()->json('appointments.0.id');
        $this->appointment = Appointment::find($id);
    }

    private function complete(array $payload)
    {
        return $this->actingAsJwt($this->owner)->postJson("/api/appointments/{$this->appointment->id}/complete", [
            'service_outcome' => 'done',
            'due_amount' => 2000,
            ...$payload,
        ]);
    }

    public function test_deposit_pays_appointment_and_refunds_on_correction(): void
    {
        $this->actingAsJwt($this->owner)->postJson("/api/clients/{$this->client->id}/wallet/deposit", ['amount' => 1500, 'payment_method' => 'cash', 'note' => 'Unapred'])
            ->assertOk()->assertJsonPath('balance', 1500);

        $this->complete(['payment' => 'full', 'payment_method' => 'wallet'])
            ->assertUnprocessable()->assertJsonValidationErrors('payment_method');

        $this->complete(['payment' => 'partial', 'paid_amount' => 1500, 'payment_method' => 'wallet', 'note' => 'Ostatak gotovinom'])->assertOk();
        $this->actingAsJwt($this->owner)->postJson("/api/clients/{$this->client->id}/wallet")->assertJsonPath('balance', 0);

        $this->complete(['payment' => 'full', 'payment_method' => 'cash'])->assertOk()->assertJsonPath('outstanding', 0);

        $this->actingAsJwt($this->owner)->postJson('/api/reports', ['period' => 'month', 'date' => '2026-10-20'])
            ->assertOk()
            ->assertJsonPath('totals.by_method.wallet', 1500)
            ->assertJsonPath('totals.by_method.cash', 500)
            ->assertJsonPath('prepaid.deposits', 1500);

        $this->actingAsJwt($this->owner)->postJson("/api/appointments/{$this->appointment->id}/paid", ['method' => null])->assertOk();
        $this->actingAsJwt($this->owner)->postJson("/api/clients/{$this->client->id}/wallet")->assertJsonPath('balance', 1500);
    }

    public function test_gift_card_is_sold_redeemed_once_and_spent(): void
    {
        $card = $this->actingAsJwt($this->owner)->postJson('/api/gift-cards', ['amount' => 3000, 'payment_method' => 'card', 'buyer_name' => 'Marko', 'recipient_name' => 'Jelena'])
            ->assertCreated()->assertJsonPath('status', 'active')->json();
        $this->assertMatchesRegularExpression('/^[A-Z2-9]{8}$/', $card['code']);

        $code = substr($card['code'], 0, 4).'-'.strtolower(substr($card['code'], 4));
        $this->actingAsJwt($this->client)->postJson('/api/my-wallet/redeem', ['code' => $code])->assertOk()->assertJsonPath('balance', 3000);
        $this->actingAsJwt($this->client)->postJson('/api/my-wallet/redeem', ['code' => $card['code']])->assertUnprocessable()->assertJsonValidationErrors('code');
        $this->assertSame(GiftCard::STATUS_REDEEMED, GiftCard::find($card['id'])->status);

        $this->complete(['payment' => 'full', 'payment_method' => 'wallet'])->assertOk()->assertJsonPath('outstanding', 0);
        $this->actingAsJwt($this->client)->postJson('/api/my-wallet')->assertOk()->assertJsonPath('balance', 1000);

        $this->actingAsJwt($this->owner)->postJson("/api/gift-cards/{$card['id']}/cancel")->assertUnprocessable();
        $this->actingAsJwt($this->client)->postJson('/api/gift-cards', ['amount' => 1000, 'payment_method' => 'cash'])->assertForbidden();
    }

    public function test_expired_or_cancelled_card_cannot_be_redeemed_and_adjust_needs_manager(): void
    {
        $expired = GiftCard::create(['code' => 'AAAA2222', 'amount' => 1000, 'payment_method' => 'cash', 'expires_on' => '2026-10-01']);
        $this->actingAsJwt($this->owner)->postJson("/api/clients/{$this->client->id}/wallet/redeem", ['code' => 'AAAA2222'])
            ->assertUnprocessable()->assertJsonPath('errors.code.0', 'Ova poklon kartica je istekla 01.10.2026..');

        $active = GiftCard::create(['code' => 'BBBB3333', 'amount' => 1000, 'payment_method' => 'cash']);
        $this->actingAsJwt($this->owner)->postJson("/api/gift-cards/{$active->id}/cancel")->assertOk()->assertJsonPath('status', 'cancelled');
        $this->actingAsJwt($this->owner)->postJson("/api/clients/{$this->client->id}/wallet/redeem", ['code' => 'BBBB3333'])->assertUnprocessable();
        $this->assertSame(GiftCard::STATUS_EXPIRED, $expired->fresh()->status);

        $worker = User::factory()->create(['role' => UserRole::Worker, 'staff_member_id' => $this->appointment->staff_member_id]);
        $this->actingAsJwt($worker)->postJson("/api/clients/{$this->client->id}/wallet/adjust", ['amount' => 500, 'note' => 'x'])->assertForbidden();
        $this->actingAsJwt($this->owner)->postJson("/api/clients/{$this->client->id}/wallet/adjust", ['amount' => -500, 'note' => 'Greška'])->assertUnprocessable();
        $this->actingAsJwt($this->owner)->postJson("/api/clients/{$this->client->id}/wallet/adjust", ['amount' => 500, 'note' => 'Kompenzacija'])->assertOk()->assertJsonPath('balance', 500);
    }
}

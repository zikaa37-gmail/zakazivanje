<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Appointment;
use App\Models\GiftCard;
use App\Models\InboxNotification;
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

    public function test_physical_card_is_bearer_partial_and_can_be_claimed_once(): void
    {
        $card = $this->actingAsJwt($this->owner)->postJson('/api/gift-cards', ['kind' => 'physical', 'card_number' => '0042', 'amount' => 1500, 'payment_method' => 'card', 'buyer_name' => 'Marko'])
            ->assertCreated()->assertJsonPath('status', 'active')->assertJsonPath('balance', 1500)->json();
        $this->assertMatchesRegularExpression('/^[A-Z2-9]{8}$/', $card['code']);
        $code = substr($card['code'], 0, 4).'-'.strtolower(substr($card['code'], 4));

        $this->actingAsJwt($this->client)->postJson('/api/my-wallet/claim', ['code' => $code])->assertOk()->assertJsonPath('gift_cards.0.code', $card['code']);
        $other = User::factory()->create();
        $this->actingAsJwt($other)->postJson('/api/my-wallet/claim', ['code' => $card['code']])->assertUnprocessable()->assertJsonValidationErrors('code');

        $this->complete(['payment' => 'full', 'gift_card_code' => $card['code']])->assertUnprocessable()->assertJsonValidationErrors('payment_method');
        $this->complete(['payment' => 'full', 'gift_card_code' => $card['code'], 'payment_method' => 'cash'])
            ->assertOk()->assertJsonPath('outstanding', 0)->assertJsonPath('gift_card_left', 0);
        $this->assertSame(GiftCard::STATUS_USED, GiftCard::find($card['id'])->status);
        $this->assertSame(1, InboxNotification::where('user_id', $this->client->id)->where('kind', 'gift_card')->count());

        $this->actingAsJwt($this->owner)->postJson('/api/reports', ['period' => 'month', 'date' => '2026-10-20'])
            ->assertOk()->assertJsonPath('totals.by_method.gift_card', 1500)->assertJsonPath('totals.by_method.cash', 500)->assertJsonPath('prepaid.gift_cards', 1500);
        $this->actingAsJwt($this->owner)->postJson('/api/gift-cards/check', ['code' => $code])->assertOk()->assertJsonPath('balance', 0)->assertJsonCount(1, 'uses');
        $this->actingAsJwt($this->owner)->postJson("/api/gift-cards/{$card['id']}/cancel")->assertUnprocessable();
        $this->actingAsJwt($this->client)->postJson('/api/gift-cards', ['kind' => 'physical', 'amount' => 1000, 'payment_method' => 'cash'])->assertForbidden();
    }

    public function test_digital_card_pays_from_client_account_and_cancellation_refunds(): void
    {
        $this->actingAsJwt($this->owner)->postJson('/api/gift-cards', ['kind' => 'digital', 'amount' => 1000, 'payment_method' => 'cash'])->assertUnprocessable()->assertJsonValidationErrors('owner_id');
        $card = $this->actingAsJwt($this->owner)->postJson('/api/gift-cards', ['kind' => 'digital', 'owner_id' => $this->client->id, 'amount' => 1000, 'payment_method' => 'cash', 'buyer_name' => 'Mama'])->assertCreated()->json();
        $this->assertSame(1, InboxNotification::where('user_id', $this->client->id)->where('kind', 'gift_card')->count());

        $this->actingAsJwt($this->client)->postJson("/api/my-appointments/{$this->appointment->id}/pay", ['source' => 'gift_card', 'code' => $card['code']])
            ->assertOk()->assertJsonPath('wallet.gift_cards.0.balance', 0);
        $this->assertSame(1000.0, (float) $this->appointment->fresh()->paid_amount);
        $this->actingAsJwt($this->client)->postJson("/api/my-appointments/{$this->appointment->id}/pay", ['source' => 'wallet'])->assertUnprocessable();

        $this->actingAsJwt($this->owner)->postJson("/api/appointments/{$this->appointment->id}/cancel", ['scope' => 'this'])->assertOk();
        $this->assertSame(1000.0, (float) GiftCard::find($card['id'])->balance);
        $this->assertNull($this->appointment->fresh()->paid_at);
    }

    public function test_expired_or_cancelled_card_cannot_be_used_and_adjust_needs_manager(): void
    {
        GiftCard::create(['code' => 'AAAA2222', 'kind' => 'physical', 'amount' => 1000, 'balance' => 1000, 'payment_method' => 'cash', 'expires_on' => '2026-10-01']);
        $this->complete(['payment' => 'full', 'gift_card_code' => 'AAAA2222', 'payment_method' => 'cash'])
            ->assertUnprocessable()->assertJsonPath('errors.gift_card_code.0', 'Poklon kartica AAAA-2222 je istekla 01.10.2026.');

        $active = GiftCard::create(['code' => 'BBBB3333', 'kind' => 'physical', 'amount' => 1000, 'balance' => 1000, 'payment_method' => 'cash']);
        $this->actingAsJwt($this->owner)->postJson("/api/gift-cards/{$active->id}/cancel")->assertOk()->assertJsonPath('status', 'cancelled');
        $this->actingAsJwt($this->owner)->postJson("/api/clients/{$this->client->id}/wallet/claim", ['code' => 'BBBB3333'])->assertUnprocessable();

        $worker = User::factory()->create(['role' => UserRole::Worker, 'staff_member_id' => $this->appointment->staff_member_id]);
        $this->actingAsJwt($worker)->postJson("/api/clients/{$this->client->id}/wallet/adjust", ['amount' => 500, 'note' => 'x'])->assertForbidden();
        $this->actingAsJwt($this->owner)->postJson("/api/clients/{$this->client->id}/wallet/adjust", ['amount' => -500, 'note' => 'Greška'])->assertUnprocessable();
        $this->actingAsJwt($this->owner)->postJson("/api/clients/{$this->client->id}/wallet/adjust", ['amount' => 500, 'note' => 'Kompenzacija'])->assertOk()->assertJsonPath('balance', 500);
    }

    public function test_gift_card_list_filters_status_in_query(): void
    {
        GiftCard::create(['code' => 'ACTV2222', 'kind' => 'physical', 'amount' => 1000, 'balance' => 400, 'payment_method' => 'cash']);
        GiftCard::create(['code' => 'USED2222', 'kind' => 'physical', 'amount' => 1000, 'balance' => 0, 'payment_method' => 'cash']);
        GiftCard::create(['code' => 'EXPD2222', 'kind' => 'physical', 'amount' => 1000, 'balance' => 1000, 'payment_method' => 'cash', 'expires_on' => '2026-10-13']);
        GiftCard::create(['code' => 'CNCL2222', 'kind' => 'physical', 'amount' => 1000, 'balance' => 1000, 'payment_method' => 'cash', 'cancelled_at' => now()]);

        foreach (['active' => 'ACTV2222', 'used' => 'USED2222', 'expired' => 'EXPD2222', 'cancelled' => 'CNCL2222'] as $status => $code) {
            $this->actingAsJwt($this->owner)->postJson('/api/gift-cards/list', ['status' => $status])
                ->assertOk()->assertJsonCount(1)->assertJsonPath('0.code', $code)->assertJsonPath('0.status', $status);
        }
    }

    public function test_deactivated_client_keeps_balance_and_cards(): void
    {
        $this->actingAsJwt($this->owner)->postJson("/api/clients/{$this->client->id}/wallet/deposit", ['amount' => 1500, 'payment_method' => 'cash'])->assertOk();
        GiftCard::create(['code' => 'MINE2222', 'kind' => 'digital', 'owner_id' => $this->client->id, 'amount' => 1000, 'balance' => 1000, 'payment_method' => 'cash']);

        $this->actingAsJwt($this->owner)->getJson("/api/clients/{$this->client->id}/deactivate-check")
            ->assertOk()->assertJsonPath('future', 1)->assertJsonPath('balance', 1500)->assertJsonPath('gift_cards', 1);
        $this->actingAsJwt($this->owner)->deleteJson("/api/clients/{$this->client->id}")->assertOk()->assertJsonPath('cancelled_appointments', 1);

        $this->assertModelExists($this->client);
        $this->assertFalse($this->client->fresh()->active);
        $this->actingAsJwt($this->owner)->postJson("/api/clients/{$this->client->id}/wallet")->assertOk()->assertJsonPath('balance', 1500)->assertJsonCount(1, 'gift_cards');
        $this->actingAsJwt($this->client)->postJson('/api/my-wallet')->assertUnauthorized();
    }
}

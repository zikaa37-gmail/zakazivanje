<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\BusinessSetting;
use App\Models\CancellationFee;
use App\Models\Service;
use App\Models\StaffMember;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CancellationFeeTest extends TestCase
{
    use RefreshDatabase;

    private Service $cut;

    private Service $massage;

    private StaffMember $ana;

    private User $owner;

    private User $client;

    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo('2026-10-19 08:00:00');
        BusinessSetting::current()->update([
            'booking_confirmation' => 'automatic',
            'cancellation_days_before' => 1,
            'cancellation_fee_enabled' => true,
            'cancellation_free_late' => 1,
            'cancellation_fee_type' => 'percent',
            'cancellation_fee_value' => 50,
        ]);

        $this->cut = Service::create(['name' => 'Šišanje', 'duration_minutes' => 60, 'price' => 2000]);
        $this->massage = Service::create(['name' => 'Masaža', 'duration_minutes' => 60, 'price' => 4000, 'cancellation_fee_type' => 'service_plus_fixed', 'cancellation_fee_value' => 500, 'cancellation_free_late' => 0]);
        $this->ana = StaffMember::create(['first_name' => 'Ana', 'last_name' => 'Test']);
        $this->ana->services()->sync([$this->cut->id, $this->massage->id]);
        $this->ana->workingHours()->createMany(collect(range(1, 5))->map(fn ($d) => ['weekday' => $d, 'starts_at' => '09:00', 'ends_at' => '17:00'])->all());
        $this->owner = User::factory()->create(['role' => User::ROLE_OWNER]);
        $this->client = User::factory()->create(['email' => 'petar@example.com']);
    }

    private function book(string $at, ?Service $service = null): int
    {
        return $this->actingAsJwt($this->owner)->postJson('/api/appointments', [
            'client_id' => $this->client->id,
            'service_ids' => [($service ?? $this->cut)->id],
            'staff_member_id' => $this->ana->id,
            'starts_at' => $at,
        ])->assertCreated()->json('appointments.0.id');
    }

    private function cancel(int $id, bool $accept = true)
    {
        return $this->actingAsJwt($this->client)->postJson("/api/my-appointments/{$id}/cancel", ['accept_late' => $accept]);
    }

    public function test_early_cancellation_is_free_and_not_counted(): void
    {
        $id = $this->book('2026-10-21 10:00');

        $this->actingAsJwt($this->client)->postJson("/api/my-appointments/{$id}/cancel-preview")->assertOk()->assertJsonPath('late', false);
        $this->cancel($id, false)->assertOk();
        $this->assertSame(0, CancellationFee::count());
    }

    public function test_late_cancellation_counts_down_then_charges(): void
    {
        $first = $this->book('2026-10-19 10:00');
        $second = $this->book('2026-10-19 12:00');

        $this->actingAsJwt($this->client)->postJson('/api/my-appointments/list', ['scope' => 'upcoming'])
            ->assertJsonPath('0.can_cancel', true)->assertJsonPath('0.can_reschedule', false)->assertJsonPath('0.late_cancel', true);

        $this->actingAsJwt($this->client)->postJson("/api/my-appointments/{$first}/cancel-preview")
            ->assertJsonPath('late', true)->assertJsonPath('free', true)->assertJsonPath('free_left_after', 0)->assertJsonPath('next_amount', 1000);

        $this->cancel($first, false)->assertUnprocessable()->assertJsonValidationErrors('accept_late');
        $this->cancel($first)->assertOk()->assertJsonPath('cancellation_fee.status', 'free');

        $this->actingAsJwt($this->client)->postJson("/api/my-appointments/{$second}/cancel-preview")
            ->assertJsonPath('free', false)->assertJsonPath('amount', 1000);
        $this->cancel($second)->assertOk()->assertJsonPath('cancellation_fee.status', 'open')->assertJsonPath('cancellation_fee.amount', 1000);

        $this->actingAsJwt($this->client)->getJson('/api/my-cancellation-status')->assertJsonPath('open_amount', 1000)->assertJsonPath('free_left', 0);
    }

    public function test_service_fee_and_client_discount(): void
    {
        $this->client->update(['cancellation_discount_type' => 'percent', 'cancellation_discount_value' => 10]);
        $id = $this->book('2026-10-19 10:00', $this->massage);

        $this->cancel($id)->assertOk()->assertJsonPath('cancellation_fee.amount', 4050)->assertJsonPath('cancellation_fee.base_amount', 4500);
    }

    public function test_exempt_client_and_free_change_are_not_charged(): void
    {
        $this->client->update(['cancellation_discount_type' => 'exempt']);
        $id = $this->book('2026-10-19 10:00', $this->massage);
        $this->cancel($id)->assertOk()->assertJsonPath('cancellation_fee.status', 'free')->assertJsonPath('cancellation_fee.amount', 0);

        $this->client->update(['cancellation_discount_type' => null]);
        $other = $this->book('2026-10-19 12:00', $this->massage);
        Appointment::find($other)->update(['free_change_reason' => Appointment::FREE_CHANGE_SALON_REQUEST]);
        $this->cancel($other, false)->assertOk()->assertJsonPath('cancellation_fee', null);
    }

    public function test_salon_records_late_client_cancellation_and_can_waive_adjust_or_mark_paid(): void
    {
        $this->client->update(['cancellation_discount_type' => null]);
        BusinessSetting::current()->update(['cancellation_free_late' => 0]);
        $a = $this->book('2026-10-19 10:00');
        $b = $this->book('2026-10-19 12:00');
        $c = $this->book('2026-10-19 14:00');

        $feeA = $this->actingAsJwt($this->owner)->postJson("/api/appointments/{$a}/cancel", ['scope' => 'this', 'by_client' => true])
            ->assertOk()->assertJsonPath('cancellation_fee.amount', 1000)->json('cancellation_fee.id');
        $feeB = $this->actingAsJwt($this->owner)->postJson("/api/appointments/{$b}/cancel", ['scope' => 'this', 'by_client' => true])->json('cancellation_fee.id');
        $feeC = $this->actingAsJwt($this->owner)->postJson("/api/appointments/{$c}/cancel", ['scope' => 'this', 'by_client' => true])->json('cancellation_fee.id');

        $this->actingAsJwt($this->owner)->postJson("/api/cancellation-fees/{$feeA}/waive", ['reason' => 'Bolest u porodici'])->assertOk()->assertJsonPath('status', 'waived');
        $this->actingAsJwt($this->owner)->postJson("/api/cancellation-fees/{$feeB}/adjust", ['amount' => 300, 'reason' => 'Stalni klijent'])->assertOk()->assertJsonPath('amount', 300);
        $this->actingAsJwt($this->owner)->postJson("/api/cancellation-fees/{$feeC}/paid", ['payment_method' => 'cash'])->assertOk()->assertJsonPath('status', 'paid');
        $this->actingAsJwt($this->owner)->postJson("/api/cancellation-fees/{$feeC}/waive", ['reason' => 'Greška'])->assertUnprocessable();

        $this->actingAsJwt($this->owner)->postJson('/api/cancellation-fees/list', ['client_id' => $this->client->id])->assertOk()->assertJsonCount(3);
        $this->actingAsJwt($this->owner)->getJson("/api/clients/{$this->client->id}/cancellation-status")->assertJsonPath('open_amount', 300)->assertJsonPath('used', 2);
    }

    public function test_disabled_fee_keeps_old_deadline(): void
    {
        BusinessSetting::current()->update(['cancellation_fee_enabled' => false]);
        $id = $this->book('2026-10-19 10:00');

        $this->cancel($id)->assertUnprocessable()->assertJsonValidationErrors('appointment');
    }
}

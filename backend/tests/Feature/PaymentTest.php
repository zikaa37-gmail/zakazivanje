<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\BusinessSetting;
use App\Models\Service;
use App\Models\StaffMember;
use App\Models\User;
use App\Services\PaymentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PaymentTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private User $client;

    private Appointment $appointment;

    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo('2026-10-14 08:00:00');

        $this->admin = User::factory()->create(['role' => User::ROLE_ADMIN]);
        $this->client = User::factory()->create(['first_name' => 'Petar', 'last_name' => 'Petrović']);
        $cut = Service::create(['name' => 'Šišanje', 'duration_minutes' => 60, 'price' => 2000]);
        $ana = StaffMember::create(['first_name' => 'Ana', 'last_name' => 'Test']);
        $ana->services()->sync([$cut->id]);
        $ana->workingHours()->createMany(collect(range(1, 5))->map(fn ($d) => ['weekday' => $d, 'starts_at' => '09:00', 'ends_at' => '17:00'])->all());

        $id = $this->actingAsJwt($this->admin)->postJson('/api/appointments', [
            'client_id' => $this->client->id,
            'service_ids' => [$cut->id],
            'staff_member_id' => $ana->id,
            'starts_at' => '2026-10-20 10:00',
        ])->assertCreated()->json('appointments.0.id');
        $this->appointment = Appointment::find($id);

        BusinessSetting::current()->update(['bank_account' => '160-319153-07', 'payee_name' => 'Salon Lepota', 'payee_address' => 'Glavna 1, Beograd']);
    }

    public function test_reference_passes_mod97_check(): void
    {
        $reference = PaymentService::mod97Reference('100000042');
        $check = substr($reference, 0, 2);
        $base = substr($reference, 2);

        $this->assertSame('100000042', $base);
        $this->assertSame(1, (int) bcmod($base.$check, '97'));
    }

    public function test_admin_gets_ips_qr_and_pdf_slip(): void
    {
        $details = $this->actingAsJwt($this->admin)->postJson("/api/appointments/{$this->appointment->id}/payment")->assertOk()->json();

        $this->assertStringContainsString('R:160000000031915307', $details['payload']);
        $this->assertStringContainsString('I:RSD2000,00', $details['payload']);
        $this->assertStringContainsString('P:Petar Petrović', $details['payload']);
        $this->assertStringContainsString('RO:97'.$details['reference'], $details['payload']);
        $this->assertStringStartsWith('data:image/png;base64,', $details['qr']);

        $this->actingAsJwt($this->admin)->post("/api/appointments/{$this->appointment->id}/slip")
            ->assertOk()
            ->assertHeader('Content-Type', 'application/pdf');
    }

    public function test_client_pays_own_appointment_only_when_enabled(): void
    {
        $url = "/api/my-appointments/{$this->appointment->id}/payment";

        $this->actingAsJwt($this->client)->postJson($url)->assertUnprocessable();
        $this->actingAsJwt($this->client)->postJson('/api/my-appointments/list', ['scope' => 'upcoming'])->assertJsonPath('0.can_pay', false);

        BusinessSetting::current()->update(['online_payment_enabled' => true]);

        $this->actingAsJwt($this->client)->postJson('/api/my-appointments/list', ['scope' => 'upcoming'])->assertJsonPath('0.can_pay', true);
        $this->actingAsJwt($this->client)->postJson($url)->assertOk()->assertJsonPath('amount', 2000);
        $this->actingAsJwt(User::factory()->create())->postJson($url)->assertNotFound();
    }

    public function test_admin_marks_paid_and_clears_it(): void
    {
        BusinessSetting::current()->update(['online_payment_enabled' => true]);
        $paid = "/api/appointments/{$this->appointment->id}/paid";

        $this->actingAsJwt($this->admin)->postJson($paid, ['method' => 'cash'])->assertOk()->assertJsonPath('payment_method', 'cash');
        $this->assertNotNull($this->appointment->fresh()->paid_at);

        $this->actingAsJwt($this->client)->postJson("/api/my-appointments/{$this->appointment->id}/payment")
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Termin je već plaćen.');

        $this->actingAsJwt($this->admin)->postJson($paid, ['method' => null])->assertOk();
        $this->assertNull($this->appointment->fresh()->paid_at);

        $this->actingAsJwt($this->admin)->postJson($paid, ['method' => 'bitcoin'])->assertUnprocessable();
    }

    public function test_online_payment_requires_bank_account(): void
    {
        BusinessSetting::current()->update(['bank_account' => null]);
        $settings = BusinessSetting::current();

        $this->actingAsJwt($this->admin)->putJson('/api/business-settings', [
            'name' => $settings->name,
            'category' => $settings->category,
            'booking_confirmation' => $settings->booking_confirmation,
            'bank_account' => null,
            'online_payment_enabled' => true,
        ])->assertUnprocessable()->assertJsonValidationErrors('bank_account');

        $this->actingAsJwt($this->admin)->putJson('/api/business-settings', [
            'name' => $settings->name,
            'category' => $settings->category,
            'booking_confirmation' => $settings->booking_confirmation,
            'bank_account' => '160-1234-56',
            'online_payment_enabled' => true,
        ])->assertOk()->assertJsonPath('online_payment_enabled', true);
    }
}

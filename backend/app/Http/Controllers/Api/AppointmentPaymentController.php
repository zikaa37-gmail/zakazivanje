<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\BusinessSetting;
use App\Services\PaymentService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use RuntimeException;

class AppointmentPaymentController extends Controller
{
    public function __construct(private PaymentService $payments) {}

    public function details(Appointment $appointment)
    {
        return $this->guard(fn () => $this->payments->details($appointment));
    }

    public function slip(Appointment $appointment)
    {
        return $this->pdf($appointment);
    }

    public function markPaid(Request $request, Appointment $appointment)
    {
        $data = $request->validate([
            'method' => ['nullable', Rule::in(Appointment::PAYMENT_METHODS)],
        ]);

        $appointment->update([
            'payment_method' => $data['method'] ?? null,
            'paid_at' => isset($data['method']) ? ($appointment->paid_at ?? now()) : null,
        ]);

        return $appointment->load(['items', 'staffMember:id,first_name,last_name,color', 'client:id,first_name,last_name,phone,email', 'recurrence:id,interval_weeks,active']);
    }

    public function clientDetails(Request $request, Appointment $appointment)
    {
        $this->authorizeClient($request, $appointment);

        return $this->guard(fn () => $this->payments->details($appointment));
    }

    public function clientSlip(Request $request, Appointment $appointment)
    {
        $this->authorizeClient($request, $appointment);

        return $this->pdf($appointment);
    }

    private function authorizeClient(Request $request, Appointment $appointment): void
    {
        abort_unless($appointment->client_id === $request->user()->id, 404);
        abort_unless(BusinessSetting::current()->online_payment_enabled, 422, 'Plaćanje unapred nije uključeno — platićeš u salonu.');
    }

    private function pdf(Appointment $appointment)
    {
        return $this->guard(fn () => response($this->payments->slip($appointment), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="uplatnica.pdf"',
        ]));
    }

    private function guard(callable $callback)
    {
        try {
            return $callback();
        } catch (RuntimeException $exception) {
            abort(422, $exception->getMessage());
        }
    }
}

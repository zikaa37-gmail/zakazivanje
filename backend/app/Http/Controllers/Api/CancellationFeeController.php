<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\CancellationFee;
use App\Models\User;
use App\Services\CancellationFeeService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CancellationFeeController extends Controller
{
    public function __construct(private CancellationFeeService $fees) {}

    public function index(Request $request)
    {
        $data = $request->validate([
            'client_id' => ['nullable', 'integer'],
            'status' => ['nullable', Rule::in([CancellationFee::STATUS_FREE, CancellationFee::STATUS_OPEN, CancellationFee::STATUS_PAID, CancellationFee::STATUS_WAIVED])],
        ]);

        return $this->fees->list($data);
    }

    public function clientStatus(User $client)
    {
        abort_unless($client->role === User::ROLE_CLIENT, 404);

        return $this->fees->status($client);
    }

    public function preview(Appointment $appointment)
    {
        return $this->fees->preview($appointment);
    }

    public function paid(Request $request, CancellationFee $fee)
    {
        $data = $request->validate(['payment_method' => ['required', Rule::in(Appointment::PAYMENT_METHODS)]]);

        return $this->fees->markPaid($fee, $data['payment_method'], $request->user());
    }

    public function waive(Request $request, CancellationFee $fee)
    {
        $data = $request->validate(['reason' => ['required', 'string', 'min:3', 'max:255']]);

        return $this->fees->waive($fee, $data['reason'], $request->user());
    }

    public function adjust(Request $request, CancellationFee $fee)
    {
        $data = $request->validate([
            'amount' => ['required', 'numeric', 'min:0', 'max:10000000'],
            'reason' => ['required', 'string', 'min:3', 'max:255'],
        ]);

        return $this->fees->adjust($fee, (float) $data['amount'], $data['reason'], $request->user());
    }
}

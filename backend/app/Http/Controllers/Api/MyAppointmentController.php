<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\BusinessSetting;
use App\Services\AppointmentNotifier;
use App\Services\BookingService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class MyAppointmentController extends Controller
{
    public function index(Request $request)
    {
        $data = $request->validate(['scope' => ['required', Rule::in(['upcoming', 'past'])]]);
        $upcoming = $data['scope'] === 'upcoming';

        return Appointment::query()
            ->where('client_id', $request->user()->id)
            ->when($upcoming,
                fn ($q) => $q->where('ends_at', '>=', now())->whereIn('status', Appointment::BLOCKING_STATUSES),
                fn ($q) => $q->where(fn ($w) => $w->where('ends_at', '<', now())->orWhereNotIn('status', Appointment::BLOCKING_STATUSES)))
            ->with(['items', 'staffMember:id,first_name,last_name,title,color'])
            ->orderBy('starts_at', $upcoming ? 'asc' : 'desc')
            ->limit(100)
            ->get()
            ->map(fn (Appointment $a) => [...$a->toArray(), 'can_cancel' => $this->canCancel($a)]);
    }

    public function cancel(Request $request, Appointment $appointment, BookingService $bookings, AppointmentNotifier $notifier)
    {
        abort_unless($appointment->client_id === $request->user()->id, 404);

        if (! $this->canCancel($appointment)) {
            $label = BusinessSetting::current()->cancellationLabel();
            throw ValidationException::withMessages(['appointment' => ["Otkazivanje je moguće {$label} — pozovi salon."]]);
        }

        $bookings->cancel($appointment, 'client');
        $notifier->cancelledByClient($appointment);

        return $appointment;
    }

    private function canCancel(Appointment $appointment): bool
    {
        return in_array($appointment->status, Appointment::BLOCKING_STATUSES, true)
            && now()->lt(BusinessSetting::current()->cancellationDeadline($appointment->starts_at));
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Events\ClientActivity;
use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\BusinessSetting;
use App\Models\User;
use App\Services\AppointmentNotifier;
use App\Services\AvailabilityService;
use App\Services\BookingService;
use App\Services\ClientDisciplineService;
use App\Services\PriceQuoteService;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class BookingController extends Controller
{
    public function __construct(
        private AvailabilityService $availability,
        private BookingService $bookings,
        private AppointmentNotifier $notifier,
        private ClientDisciplineService $discipline,
    ) {}

    public function slots(Request $request)
    {
        $data = $request->validate([
            'service_ids' => ['required', 'array', 'min:1'],
            'service_ids.*' => ['integer', 'distinct'],
            'staff_member_id' => ['nullable', 'integer'],
            'date' => ['required', 'date_format:Y-m-d'],
            'ignore_appointment_id' => ['nullable', 'integer'],
        ]);

        $date = CarbonImmutable::parse($data['date']);
        $this->discipline->logAvailability($request->user(), ['date' => $data['date'], 'staff_member_id' => $data['staff_member_id'] ?? null]);
        if ($this->discipline->hidesDate($request->user(), $date)) {
            return [];
        }

        $slots = $this->availability->slots(
            $this->availability->servicesInOrder($data['service_ids']),
            $data['staff_member_id'] ?? null,
            $date,
            $this->ownAppointmentId($request, $data['ignore_appointment_id'] ?? null),
        );

        return $this->offPeakOnly($request->user(), $date, $slots);
    }

    public function days(Request $request)
    {
        $data = $request->validate([
            'service_ids' => ['required', 'array', 'min:1'],
            'service_ids.*' => ['integer', 'distinct'],
            'staff_member_id' => ['nullable', 'integer'],
            'from' => ['required', 'date_format:Y-m-d'],
            'days' => ['nullable', 'integer', 'min:1', 'max:31'],
            'ignore_appointment_id' => ['nullable', 'integer'],
        ]);

        $days = $this->availability->days(
            $this->availability->servicesInOrder($data['service_ids']),
            $data['staff_member_id'] ?? null,
            CarbonImmutable::parse($data['from']),
            $data['days'] ?? 14,
            $this->ownAppointmentId($request, $data['ignore_appointment_id'] ?? null),
        );
        $this->discipline->logAvailability($request->user(), ['from' => $data['from'], 'staff_member_id' => $data['staff_member_id'] ?? null]);

        $services = $this->availability->servicesInOrder($data['service_ids']);
        $offPeak = $this->discipline->restrictions($request->user())['off_peak_only'];

        return collect($days)
            ->map(function ($day) use ($request, $data, $services, $offPeak) {
                $date = CarbonImmutable::parse($day['date']);
                if (! $day['open'] || ! $day['available']) {
                    return $day;
                }
                if ($this->discipline->hidesDate($request->user(), $date)) {
                    return [...$day, 'available' => false];
                }
                if ($offPeak) {
                    $slots = $this->availability->slots($services, $data['staff_member_id'] ?? null, $date, $this->ownAppointmentId($request, $data['ignore_appointment_id'] ?? null));

                    return [...$day, 'available' => $this->offPeakOnly($request->user(), $date, $slots) !== []];
                }

                return $day;
            })
            ->all();
    }

    public function quote(Request $request)
    {
        $data = $request->validate([
            'service_ids' => ['required', 'array', 'min:1'],
            'service_ids.*' => ['integer', 'distinct'],
            'date' => ['nullable', 'date_format:Y-m-d'],
        ]);

        $services = $this->availability->servicesInOrder($data['service_ids']);
        $date = isset($data['date']) ? CarbonImmutable::parse($data['date']) : CarbonImmutable::today();

        return $request->user()
            ? $this->bookings->quoteFor($request->user(), $services, $date)
            : app(PriceQuoteService::class)->quote($services, $date);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'service_ids' => ['required', 'array', 'min:1'],
            'service_ids.*' => ['integer', 'distinct', 'exists:services,id'],
            'staff_member_id' => ['nullable', 'integer', 'exists:staff_members,id'],
            'starts_at' => ['required', 'date_format:Y-m-d H:i'],
            'note' => ['nullable', 'string', 'max:500'],
            'guest' => [$request->user() ? 'prohibited' : 'required', 'array'],
            'guest.first_name' => ['required_with:guest', 'string', 'min:2', 'max:100'],
            'guest.last_name' => ['required_with:guest', 'string', 'min:1', 'max:100'],
            'guest.phone' => ['required_with:guest', 'string', 'max:30', 'regex:/^[\d\s+\-()]+$/'],
            'guest.email' => ['nullable', 'email', 'max:255'],
        ]);

        $client = $request->user() ?? $this->guestClient($data['guest']);

        if ($client->isStaff()) {
            throw ValidationException::withMessages(['guest' => ['Osoblje zakazuje kroz stranicu Termini.']]);
        }

        $start = CarbonImmutable::createFromFormat('Y-m-d H:i', $data['starts_at']);
        $this->discipline->ensureCanBook($client, $start);

        try {
            $appointment = $this->bookings->book(
                $client,
                $this->availability->servicesInOrder($data['service_ids']),
                $data['staff_member_id'] ?? null,
                $start,
                Appointment::SOURCE_ONLINE,
                $data['note'] ?? null,
            );
        } catch (ValidationException $e) {
            ClientActivity::dispatch($client, ClientActivity::BOOKING_FAILED, ['starts_at' => $data['starts_at'], 'service_ids' => $data['service_ids'], 'reason' => collect($e->errors())->flatten()->first()]);
            throw $e;
        }
        ClientActivity::dispatch($client, ClientActivity::BOOKED, ['appointment_id' => $appointment->id, 'starts_at' => $data['starts_at'], 'status' => $appointment->status]);

        $this->notifier->booked($appointment);

        return response()->json($appointment, 201);
    }

    private function offPeakOnly(?User $client, CarbonImmutable $date, array $slots): array
    {
        return array_values(array_filter($slots, fn ($slot) => $this->discipline->allowsSlot($client, $date->setTimeFromTimeString($slot['time']))));
    }

    private function ownAppointmentId(Request $request, ?int $id): ?int
    {
        if (! $id || ! $request->user()) {
            return null;
        }

        return Appointment::whereKey($id)->where('client_id', $request->user()->id)->exists() ? $id : null;
    }

    private function guestClient(array $guest): User
    {
        if (! BusinessSetting::current()->allow_guest_booking) {
            throw ValidationException::withMessages(['guest' => ['Za zakazivanje je potreban nalog — prijavi se ili se registruj.']]);
        }

        $email = $guest['email'] ?? null;
        $digits = preg_replace('/\D/', '', $guest['phone']);

        if ($email) {
            $byEmail = User::where('email', $email)->first();
            if ($byEmail && $byEmail->password !== null) {
                throw ValidationException::withMessages(['guest.email' => ['Za ovaj email već postoji nalog — prijavi se da zakažeš.']]);
            }
            if ($byEmail) {
                return $byEmail;
            }
        }

        $byPhone = User::query()
            ->where('role', User::ROLE_CLIENT)
            ->whereNull('password')
            ->whereNotNull('phone')
            ->get(['id', 'phone'])
            ->first(fn (User $u) => preg_replace('/\D/', '', $u->phone) === $digits);

        if ($byPhone) {
            return User::find($byPhone->id);
        }

        return User::create([
            'first_name' => $guest['first_name'],
            'last_name' => $guest['last_name'],
            'phone' => $guest['phone'],
            'email' => $email,
            'role' => User::ROLE_CLIENT,
            'preferred_communication' => $email ? 'email' : 'whatsapp',
        ]);
    }
}

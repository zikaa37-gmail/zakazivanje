<?php

namespace App\Http\Controllers\Api;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\CancellationFee;
use App\Models\ClientActivityLog;
use App\Models\User;
use App\Services\ClientDeactivationService;
use App\Services\ClientDisciplineService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ClientController extends Controller
{
    public function __construct(
        private readonly ClientDisciplineService $discipline,
        private readonly ClientDeactivationService $deactivation,
    ) {}

    private const PHONE_PATTERN = 'regex:/^[\d\s+\-()]+$/';

    public function index(Request $request)
    {
        $data = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
            'zone' => ['nullable', Rule::in(User::ZONES)],
            'active' => ['nullable', 'boolean'],
        ]);

        $search = trim($data['search'] ?? '');

        return User::query()
            ->where('role', UserRole::Client)
            ->where('active', $data['active'] ?? true)
            ->when($data['zone'] ?? null, fn ($q, $zone) => $q->where('discipline_zone', $zone))
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($q) use ($search) {
                    $q->where('first_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%")
                        ->orWhere('nickname', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%")
                        ->orWhere('phone', 'like', "%{$search}%");
                });
            })
            ->orderBy('first_name')
            ->orderBy('last_name')
            ->paginate(25, ['*'], 'page', $data['page'] ?? 1)
            ->through(fn (User $user) => $this->present($user));
    }

    public function directory()
    {
        return User::query()
            ->where('role', UserRole::Client)
            ->where('active', true)
            ->orderBy('first_name')
            ->orderBy('last_name')
            ->get()
            ->map(fn (User $user) => $this->present($user->makeHidden('avatar')));
    }

    public function store(Request $request)
    {
        $client = User::create([...$this->validated($request), 'role' => UserRole::Client]);

        return response()->json($this->present($client->refresh()), 201);
    }

    public function update(Request $request, User $client)
    {
        abort_unless($client->role === UserRole::Client, 404);

        $client->update($this->validated($request, $client));

        return $this->present($client);
    }

    public function nickname(Request $request, User $client)
    {
        abort_unless($client->role === UserRole::Client, 404);

        $data = $request->validate(['nickname' => ['nullable', 'string', 'max:60']], ['nickname.max' => 'Nadimak može imati najviše 60 znakova.']);
        $client->nickname = filled($data['nickname'] ?? null) ? trim($data['nickname']) : null;
        $client->save();

        return $this->present($client);
    }

    public function activity(Request $request, User $client)
    {
        abort_unless($client->role === UserRole::Client, 404);

        $data = $request->validate(['before_id' => ['nullable', 'integer']]);

        $logs = ClientActivityLog::query()
            ->where('user_id', $client->id)
            ->when($data['before_id'] ?? null, fn ($q, $id) => $q->where('id', '<', $id))
            ->with('actor:id,first_name,last_name')
            ->orderByDesc('id')
            ->limit(100)
            ->get();

        return [
            'client' => $this->present($this->discipline->refresh($client)),
            'stats' => $this->discipline->stats($client),
            'logs' => $logs,
            'work_notes' => ($data['before_id'] ?? null) ? [] : Appointment::query()
                ->where('client_id', $client->id)
                ->whereNotNull('completion_note')
                ->with(['items:id,appointment_id,name', 'staffMember:id,first_name'])
                ->orderByDesc('starts_at')
                ->limit(10)
                ->get(['id', 'staff_member_id', 'starts_at', 'completion_note']),
            'has_more' => $logs->count() === 100,
        ];
    }

    public function zone(Request $request, User $client)
    {
        abort_unless($client->role === UserRole::Client, 404);

        $data = $request->validate([
            'zone' => ['nullable', Rule::in(User::ZONES)],
            'reason' => ['nullable', 'string', 'max:255'],
            'until' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:today'],
        ]);

        $client = $this->discipline->setManual($client, $data['zone'] ?? null, $data['reason'] ?? null, $data['until'] ?? null, $request->user());

        return $this->present($client);
    }

    private function present(User $user): array
    {
        return [...$user->makeVisible([...User::DISCIPLINE_FIELDS, ...User::CANCELLATION_FIELDS])->toArray(), 'has_account' => $user->password !== null];
    }

    public function destroy(User $client)
    {
        abort_unless($client->role === UserRole::Client, 404);

        $cancelled = $this->deactivation->setActive($client, false, true);

        return ['message' => 'Klijent je deaktiviran.', 'cancelled_appointments' => $cancelled];
    }

    public function setActive(Request $request, User $client)
    {
        abort_unless($client->role === UserRole::Client, 404);
        $data = $request->validate(['active' => ['required', 'boolean'], 'cancel_future' => ['sometimes', 'boolean']]);

        $cancelled = $this->deactivation->setActive($client, $data['active'], $data['cancel_future'] ?? false);

        return [...$this->present($client->refresh()), 'cancelled_appointments' => $cancelled];
    }

    public function deactivateCheck(User $client)
    {
        abort_unless($client->role === UserRole::Client, 404);

        return $this->deactivation->impact($client);
    }

    private function validated(Request $request, ?User $client = null): array
    {
        return $request->validate([
            'first_name' => ['required', 'string', 'min:2', 'max:100'],
            'last_name' => ['required', 'string', 'min:1', 'max:100'],
            'nickname' => ['nullable', 'string', 'max:60'],
            'email' => ['nullable', 'email', 'max:255', Rule::unique('users', 'email')->ignore($client?->id)],
            'phone' => ['required', 'string', 'max:30', self::PHONE_PATTERN],
            'whatsapp_number' => ['nullable', 'string', 'max:30', self::PHONE_PATTERN],
            'preferred_communication' => ['nullable', Rule::in(User::COMMUNICATION_CHANNELS)],
            'gender' => ['nullable', Rule::in(User::GENDERS)],
            'favorite_staff_member_id' => ['nullable', 'integer', 'exists:staff_members,id'],
            'note' => ['nullable', 'string', 'max:2000'],
            'cancellation_discount_type' => ['nullable', Rule::in(CancellationFee::DISCOUNT_TYPES)],
            'cancellation_discount_value' => ['nullable', 'numeric', 'min:0', 'max:1000000', Rule::when($request->input('cancellation_discount_type') === CancellationFee::DISCOUNT_PERCENT, ['max:100'])],
        ]);
    }
}

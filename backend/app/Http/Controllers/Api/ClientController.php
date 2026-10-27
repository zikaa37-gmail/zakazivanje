<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ClientActivityLog;
use App\Models\User;
use App\Services\ClientDisciplineService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ClientController extends Controller
{
    public function __construct(private ClientDisciplineService $discipline) {}

    private const PHONE_PATTERN = 'regex:/^[\d\s+\-()]+$/';

    public function index(Request $request)
    {
        $data = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
            'zone' => ['nullable', Rule::in(User::ZONES)],
        ]);

        $search = trim($data['search'] ?? '');

        return User::query()
            ->where('role', User::ROLE_CLIENT)
            ->when($data['zone'] ?? null, fn ($q, $zone) => $q->where('discipline_zone', $zone))
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($q) use ($search) {
                    $q->where('first_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%")
                        ->orWhere('phone', 'like', "%{$search}%");
                });
            })
            ->orderBy('first_name')
            ->orderBy('last_name')
            ->paginate(25, ['*'], 'page', $data['page'] ?? 1)
            ->through(fn (User $user) => $this->present($user));
    }

    public function store(Request $request)
    {
        $client = User::create([...$this->validated($request), 'role' => User::ROLE_CLIENT]);

        return response()->json($this->present($client->refresh()), 201);
    }

    public function update(Request $request, User $client)
    {
        abort_unless($client->role === User::ROLE_CLIENT, 404);

        $client->update($this->validated($request, $client));

        return $this->present($client);
    }

    public function activity(Request $request, User $client)
    {
        abort_unless($client->role === User::ROLE_CLIENT, 404);

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
            'has_more' => $logs->count() === 100,
        ];
    }

    public function zone(Request $request, User $client)
    {
        abort_unless($client->role === User::ROLE_CLIENT, 404);

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
        return [...$user->makeVisible(User::DISCIPLINE_FIELDS)->toArray(), 'has_account' => $user->password !== null];
    }

    public function destroy(User $client)
    {
        abort_unless($client->role === User::ROLE_CLIENT, 404);

        $client->delete();

        return response()->json(['message' => 'Klijent je obrisan.']);
    }

    private function validated(Request $request, ?User $client = null): array
    {
        return $request->validate([
            'first_name' => ['required', 'string', 'min:2', 'max:100'],
            'last_name' => ['required', 'string', 'min:1', 'max:100'],
            'email' => ['nullable', 'email', 'max:255', Rule::unique('users', 'email')->ignore($client?->id)],
            'phone' => ['required', 'string', 'max:30', self::PHONE_PATTERN],
            'whatsapp_number' => ['nullable', 'string', 'max:30', self::PHONE_PATTERN],
            'preferred_communication' => ['nullable', Rule::in(User::COMMUNICATION_CHANNELS)],
            'gender' => ['nullable', Rule::in(User::GENDERS)],
            'favorite_staff_member_id' => ['nullable', 'integer', 'exists:staff_members,id'],
            'note' => ['nullable', 'string', 'max:2000'],
            'active' => ['boolean'],
        ]);
    }
}

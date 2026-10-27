<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\StaffAccountService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class TeamController extends Controller
{
    private const PHONE_PATTERN = 'regex:/^[\d\s+\-()]+$/';

    public function __construct(private StaffAccountService $accounts) {}

    public function index()
    {
        return User::query()
            ->whereIn('role', User::STAFF_ROLES)
            ->with('staffMember:id,first_name,last_name,title,color,active')
            ->orderByRaw('role = ? desc', [User::ROLE_OWNER])
            ->orderBy('first_name')
            ->orderBy('last_name')
            ->get()
            ->map(fn (User $user) => $this->present($user));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            ...$this->profileRules(),
            'role' => ['required', Rule::in(User::STAFF_ROLES)],
            'send_invite' => ['boolean'],
        ]);

        $user = User::create([...collect($data)->except('send_invite')->all(), 'active' => true]);

        if ($data['send_invite'] ?? false) {
            $this->accounts->invite($user);
        }

        return response()->json($this->present($user->load('staffMember')), 201);
    }

    public function update(Request $request, User $user)
    {
        abort_unless($user->isStaff(), 404);

        $linked = $user->staff_member_id !== null;
        $data = $request->validate([
            ...($linked ? [] : $this->profileRules($user)),
            'role' => ['required', Rule::in(User::STAFF_ROLES)],
            'active' => ['boolean'],
        ]);

        if ($user->is($request->user()) && ($data['role'] !== $user->role || ! ($data['active'] ?? true))) {
            throw ValidationException::withMessages(['role' => ['Ne možeš da promeniš ulogu ili deaktiviraš svoj nalog.']]);
        }
        if ($user->isOwner() && ($data['role'] !== User::ROLE_OWNER || ! ($data['active'] ?? true))) {
            $this->ensureAnotherOwner($user);
        }

        $user->update($data);
        if (! $user->active) {
            $user->refreshTokens()->update(['revoked_at' => now()]);
        }

        return $this->present($user->load('staffMember'));
    }

    public function invite(User $user)
    {
        abort_unless($user->isStaff(), 404);

        if (blank($user->email)) {
            throw ValidationException::withMessages(['email' => ['Nalog nema email adresu.']]);
        }

        $this->accounts->invite($user);

        return response()->json(['message' => "Pozivnica je poslata na {$user->email}."]);
    }

    public function destroy(Request $request, User $user)
    {
        abort_unless($user->isStaff(), 404);

        if ($user->is($request->user())) {
            throw ValidationException::withMessages(['user' => ['Ne možeš da obrišeš svoj nalog.']]);
        }
        if ($user->staff_member_id !== null) {
            throw ValidationException::withMessages(['user' => ['Nalog zaposlenog se gasi u Zaposleni (deaktivacija ili brisanje).']]);
        }
        if ($user->isOwner()) {
            $this->ensureAnotherOwner($user);
        }

        $user->refreshTokens()->delete();
        $user->delete();

        return response()->json(['message' => 'Nalog je obrisan.']);
    }

    private function profileRules(?User $user = null): array
    {
        return [
            'first_name' => ['required', 'string', 'min:2', 'max:100'],
            'last_name' => ['required', 'string', 'min:1', 'max:100'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user?->id)],
            'phone' => ['nullable', 'string', 'max:30', self::PHONE_PATTERN],
        ];
    }

    private function ensureAnotherOwner(User $user): void
    {
        $others = User::where('role', User::ROLE_OWNER)->where('active', true)->whereKeyNot($user->id)->exists();

        if (! $others) {
            throw ValidationException::withMessages(['role' => ['Mora da ostane bar jedan aktivan vlasnik.']]);
        }
    }

    private function present(User $user): array
    {
        return [...$user->toArray(), 'has_password' => $user->password !== null];
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ClientController extends Controller
{
    private const PHONE_PATTERN = 'regex:/^[\d\s+\-()]+$/';

    public function index(Request $request)
    {
        $data = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);

        $search = trim($data['search'] ?? '');

        return User::query()
            ->where('role', User::ROLE_CLIENT)
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
            ->through(fn (User $user) => [...$user->toArray(), 'has_account' => $user->password !== null]);
    }

    public function store(Request $request)
    {
        $client = User::create([...$this->validated($request), 'role' => User::ROLE_CLIENT]);

        return response()->json([...$client->toArray(), 'has_account' => false], 201);
    }

    public function update(Request $request, User $client)
    {
        abort_unless($client->role === User::ROLE_CLIENT, 404);

        $client->update($this->validated($request, $client));

        return [...$client->toArray(), 'has_account' => $client->password !== null];
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
            'note' => ['nullable', 'string', 'max:2000'],
            'active' => ['boolean'],
        ]);
    }
}

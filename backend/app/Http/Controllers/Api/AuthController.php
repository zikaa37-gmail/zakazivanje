<?php

namespace App\Http\Controllers\Api;

use App\Events\ClientActivity;
use App\Http\Controllers\Controller;
use App\Models\RefreshToken;
use App\Models\User;
use App\Services\ClientDisciplineService;
use App\Services\JwtService;
use App\Services\MarketingService;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    private const PHONE_PATTERN = 'regex:/^[\d\s+\-()]+$/';

    public function __construct(private JwtService $jwt, private ClientDisciplineService $discipline, private MarketingService $marketing) {}

    public function register(Request $request)
    {
        $sent = fn () => response()->json([
            'message' => 'Poslali smo link za aktivaciju na '.$request->input('email').'. Link važi '.User::VERIFICATION_DAYS.' dana.',
        ], 201);

        if (filled($request->input('website')) || ($request->filled('started_at') && now()->getTimestampMs() - (int) $request->input('started_at') < 3000)) {
            return $sent();
        }

        $existing = User::where('email', $request->input('email'))
            ->where('role', User::ROLE_CLIENT)
            ->where(fn ($q) => $q->whereNull('password')->orWhereNull('email_verified_at'))
            ->first();

        $data = $request->validate($this->userRules($existing), [
            'email.unique' => 'Nalog sa ovim mejlom već postoji. Prijavi se ili resetuj lozinku.',
        ]);
        $next = $this->safeNext($request->input('next'));
        unset($data['next']);

        $user = $existing
            ? tap($existing)->update($data)
            : User::create([...$data, 'role' => User::ROLE_CLIENT]);
        $referral = $this->marketing->referral($request);
        if ($referral['source'] && ! $user->signup_source) {
            $user->forceFill(['signup_source' => $referral['source'], 'signup_campaign' => $referral['campaign']])->save();
        }
        $user->sendEmailVerification($next);

        return $sent();
    }

    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('email', $credentials['email'])->first();

        if (! $user || $user->password === null || ! Hash::check($credentials['password'], $user->password)) {
            if ($user) {
                ClientActivity::dispatch($user, ClientActivity::LOGIN_FAILED);
            }
            throw ValidationException::withMessages(['email' => ['Pogrešan email ili lozinka.']]);
        }

        if (! $user->active) {
            throw ValidationException::withMessages(['email' => ['Nalog je deaktiviran.']]);
        }

        if ($user->role === User::ROLE_CLIENT && $user->email_verified_at === null) {
            if (! $user->email_verification_sent_at || $user->email_verification_sent_at->lt(now()->subMinutes(10))) {
                $user->sendEmailVerification($this->safeNext($request->input('next')));
            }
            throw ValidationException::withMessages(['email' => ['Nalog još nije aktiviran. Poslali smo ti link za aktivaciju na mejl (važi '.User::VERIFICATION_DAYS.' dana).']]);
        }

        $user->forceFill(['last_login_at' => now()])->save();
        ClientActivity::dispatch($user, ClientActivity::LOGIN);
        $this->marketing->recordLogin($user, $this->marketing->referral($request));
        $this->discipline->refresh($user);

        return response()->json($this->tokensFor($user));
    }

    public function quickLogins()
    {
        $labels = [User::ROLE_OWNER => 'Vlasnik', User::ROLE_MANAGER => 'Administrativni radnik', User::ROLE_WORKER => 'Radnik', User::ROLE_CLIENT => 'Klijent'];
        $emails = config('auth_jwt.quick_login_emails');

        $users = User::whereIn('email', $emails)->where('active', true)->get()
            ->sortBy(fn (User $user) => array_search($user->email, $emails))
            ->map(fn (User $user) => [
                'email' => $user->email,
                'label' => ($labels[$user->role] ?? $user->role).' ('.$user->first_name.')',
            ]);

        return response()->json($users->values());
    }

    public function quickLogin(Request $request)
    {
        $data = $request->validate(['email' => ['required', 'email']]);
        abort_unless(in_array($data['email'], config('auth_jwt.quick_login_emails'), true), 404);

        $user = User::where('email', $data['email'])->where('active', true)->firstOrFail();
        $user->forceFill(['last_login_at' => now()])->save();

        return response()->json($this->tokensFor($user));
    }

    public function refresh(Request $request)
    {
        $data = $request->validate(['refresh_token' => ['required', 'string']]);

        $stored = RefreshToken::where('token_hash', hash('sha256', $data['refresh_token']))->first();

        if (! $stored || ! $stored->isValid() || ! $stored->user->active) {
            throw ValidationException::withMessages([
                'refresh_token' => ['Sesija je istekla. Prijavi se ponovo.'],
            ]);
        }

        $stored->update(['revoked_at' => now()]);
        if (Cache::add("activity:session:{$stored->user_id}", true, now()->endOfDay())) {
            ClientActivity::dispatch($stored->user, ClientActivity::SESSION);
            $this->discipline->refresh($stored->user);
        }

        return response()->json($this->tokensFor($stored->user));
    }

    public function logout(Request $request)
    {
        $data = $request->validate(['refresh_token' => ['sometimes', 'string']]);

        if (! empty($data['refresh_token'])) {
            RefreshToken::where('token_hash', hash('sha256', $data['refresh_token']))
                ->update(['revoked_at' => now()]);
        }

        return response()->json(['message' => 'Odjavljeni ste.']);
    }

    public function me(Request $request)
    {
        return $request->user();
    }

    public function updateProfile(Request $request)
    {
        $user = $request->user();

        $data = $request->validate([
            'first_name' => ['required', 'string', 'min:2', 'max:100'],
            'last_name' => ['required', 'string', 'min:2', 'max:100'],
            'phone' => ['required', 'string', 'max:30', self::PHONE_PATTERN],
            'whatsapp_number' => ['nullable', 'string', 'max:30', self::PHONE_PATTERN],
            'preferred_communication' => ['required', Rule::in(User::COMMUNICATION_CHANNELS)],
            'gender' => ['nullable', Rule::in(User::GENDERS)],
            'favorite_staff_member_id' => ['sometimes', 'nullable', 'integer', Rule::exists('staff_members', 'id')->where('active', true)],
        ]);

        $user->update($data);

        return $user;
    }

    public function favoriteStaff(Request $request)
    {
        $data = $request->validate([
            'staff_member_id' => ['nullable', 'integer', Rule::exists('staff_members', 'id')->where('active', true)],
        ]);

        $request->user()->update(['favorite_staff_member_id' => $data['staff_member_id'] ?? null]);

        return $request->user();
    }

    public function verifyEmail(Request $request)
    {
        $data = $request->validate(['token' => ['required', 'string']]);

        $user = User::where('email_verification_token', hash('sha256', $data['token']))->first();

        if (! $user) {
            throw ValidationException::withMessages(['token' => ['Link za aktivaciju je nevažeći ili je već iskorišćen.']]);
        }
        if ($user->verificationExpired()) {
            throw ValidationException::withMessages(['token' => ['Link je istekao (važi '.User::VERIFICATION_DAYS.' dana). Registruj se ponovo istim mejlom ili zatraži novi link.']]);
        }

        $user->forceFill(['email_verified_at' => now(), 'email_verification_token' => null, 'last_login_at' => now()])->save();
        ClientActivity::dispatch($user, ClientActivity::LOGIN);

        return response()->json(['message' => 'Nalog je aktiviran.', ...$this->tokensFor($user)]);
    }

    public function resendVerification(Request $request)
    {
        $data = $request->validate(['email' => ['required', 'email']]);

        $user = User::where('email', $data['email'])->whereNull('email_verified_at')->first();
        $user?->sendEmailVerification($this->safeNext($request->input('next')));

        return response()->json(['message' => 'Ako nalog postoji i nije potvrđen, poslali smo novi link.']);
    }

    public function forgotPassword(Request $request)
    {
        $data = $request->validate(['email' => ['required', 'email']]);

        Password::sendResetLink($data);

        return response()->json([
            'message' => 'Ako nalog sa tim email-om postoji, poslali smo link za resetovanje lozinke.',
        ]);
    }

    public function resetPassword(Request $request)
    {
        $data = $request->validate([
            'token' => ['required', 'string'],
            'email' => ['required', 'email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $status = Password::reset($data, function (User $user, string $password) {
            $user->forceFill(['password' => Hash::make($password), 'remember_token' => Str::random(60)])->save();
            $user->refreshTokens()->update(['revoked_at' => now()]);

            event(new PasswordReset($user));
        });

        if ($status !== Password::PASSWORD_RESET) {
            $message = match ($status) {
                Password::RESET_THROTTLED => 'Sačekaj malo pre nego što ponovo zatražiš reset lozinke.',
                default => 'Link za reset lozinke je nevažeći ili je istekao.',
            };

            throw ValidationException::withMessages(['email' => [$message]]);
        }

        return response()->json(['message' => 'Lozinka je promenjena. Prijavi se sa novom lozinkom.']);
    }

    public function changePassword(Request $request)
    {
        $data = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $user = $request->user();

        if (! Hash::check($data['current_password'], $user->password)) {
            throw ValidationException::withMessages(['current_password' => ['Trenutna lozinka nije tačna.']]);
        }

        $user->forceFill(['password' => Hash::make($data['password'])])->save();
        $user->refreshTokens()->update(['revoked_at' => now()]);

        return response()->json(['message' => 'Lozinka je promenjena. Prijavi se ponovo.']);
    }

    private function userRules(?User $placeholder = null): array
    {
        return [
            'first_name' => ['required', 'string', 'min:2', 'max:100'],
            'last_name' => ['required', 'string', 'min:2', 'max:100'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($placeholder?->id)],
            'password' => ['required', 'string', 'min:8'],
            'phone' => ['required', 'string', 'max:30', self::PHONE_PATTERN],
            'whatsapp_number' => ['nullable', 'string', 'max:30', self::PHONE_PATTERN],
            'preferred_communication' => ['nullable', Rule::in(User::COMMUNICATION_CHANNELS)],
            'gender' => ['nullable', Rule::in(User::GENDERS)],
        ];
    }

    private function safeNext(?string $next): ?string
    {
        return $next && str_starts_with($next, '/') && ! str_starts_with($next, '//') ? mb_substr($next, 0, 300) : null;
    }

    private function tokensFor(User $user): array
    {
        $refreshToken = Str::random(80);

        RefreshToken::create([
            'user_id' => $user->id,
            'token_hash' => hash('sha256', $refreshToken),
            'expires_at' => now()->addDays((int) config('auth_jwt.refresh_ttl_days')),
        ]);

        return [
            'access_token' => $this->jwt->issueAccessToken($user),
            'refresh_token' => $refreshToken,
            'user' => $user,
        ];
    }
}

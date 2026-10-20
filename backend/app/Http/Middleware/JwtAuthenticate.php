<?php

namespace App\Http\Middleware;

use App\Models\User;
use App\Services\JwtService;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class JwtAuthenticate
{
    public function __construct(private JwtService $jwt) {}

    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->bearerToken();
        $payload = $token ? $this->jwt->decode($token) : null;
        $user = $payload && isset($payload->sub) ? User::find($payload->sub) : null;

        if (! $user || ! $user->active) {
            abort(401, 'Unauthenticated.');
        }

        Auth::setUser($user);
        $request->setUserResolver(fn () => $user);

        return $next($request);
    }
}

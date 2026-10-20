<?php

namespace App\Services;

use App\Models\User;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use stdClass;

class JwtService
{
    private string $secret;

    private string $algo = 'HS256';

    public function __construct()
    {
        $this->secret = (string) config('auth_jwt.secret');
    }

    public function issueAccessToken(User $user): string
    {
        $now = time();

        return JWT::encode([
            'sub' => $user->id,
            'role' => $user->role,
            'iat' => $now,
            'exp' => $now + (int) config('auth_jwt.access_ttl_minutes') * 60,
        ], $this->secret, $this->algo);
    }

    public function decode(string $token): ?stdClass
    {
        try {
            return JWT::decode($token, new Key($this->secret, $this->algo));
        } catch (\Throwable) {
            return null;
        }
    }
}

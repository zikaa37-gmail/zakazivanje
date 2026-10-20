<?php

namespace Tests;

use App\Models\User;
use App\Services\JwtService;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    protected function actingAsJwt(User $user): static
    {
        return $this->withToken(app(JwtService::class)->issueAccessToken($user));
    }
}

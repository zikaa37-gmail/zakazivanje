<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void {}

    public function boot(): void
    {
        Schema::defaultStringLength(191);

        RateLimiter::for('auth', fn (Request $request) => Limit::perMinute(10)->by('auth|'.$request->ip()));
        RateLimiter::for('booking', fn (Request $request) => Limit::perMinute(10)->by('booking|'.($request->user()?->id ?? $request->ip())));
        RateLimiter::for('public', fn (Request $request) => Limit::perMinute(240)->by('public|'.$request->ip()));
    }
}

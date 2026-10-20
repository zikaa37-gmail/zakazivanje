<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use App\Models\NotificationLog;
use Illuminate\Http\Request;
use Illuminate\Notifications\Events\NotificationFailed;
use Illuminate\Notifications\Events\NotificationSent;
use Illuminate\Support\Facades\Event;
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
        $log = function ($event, string $status) {
            if ($event->channel !== 'mail') {
                return;
            }
            $notification = $event->notification;
            NotificationLog::record(
                $event->notifiable instanceof \App\Models\User ? $event->notifiable : null,
                method_exists($notification, 'logType') ? $notification->logType() : class_basename($notification),
                'mail',
                $event->notifiable->email ?? null,
                $status,
                method_exists($notification, 'appointmentId') ? $notification->appointmentId() : null,
                $status === NotificationLog::STATUS_FAILED ? (string) data_get($event, 'data.message', 'Slanje nije uspelo') : null,
            );
        };
        Event::listen(NotificationSent::class, fn (NotificationSent $event) => $log($event, NotificationLog::STATUS_SENT));
        Event::listen(NotificationFailed::class, fn (NotificationFailed $event) => $log($event, NotificationLog::STATUS_FAILED));

        RateLimiter::for('public', fn (Request $request) => Limit::perMinute(240)->by('public|'.$request->ip()));
    }
}

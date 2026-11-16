<?php

namespace App\Services;

use App\Models\PushSubscription;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;
use Minishlink\WebPush\Subscription;
use Minishlink\WebPush\WebPush;
use Throwable;

class WebPushService
{
    public function configured(): bool
    {
        return (bool) (config('services.webpush.public_key') && config('services.webpush.private_key'));
    }

    public function publicKey(): ?string
    {
        return $this->configured() ? config('services.webpush.public_key') : null;
    }

    public function subscribe(User $user, string $endpoint, string $p256dh, string $auth, ?string $userAgent): void
    {
        PushSubscription::updateOrCreate(
            ['endpoint_hash' => PushSubscription::hashOf($endpoint)],
            ['user_id' => $user->id, 'endpoint' => $endpoint, 'p256dh' => $p256dh, 'auth' => $auth, 'user_agent' => $userAgent ? mb_substr($userAgent, 0, 255) : null],
        );
    }

    public function unsubscribe(string $endpoint): void
    {
        PushSubscription::where('endpoint_hash', PushSubscription::hashOf($endpoint))->delete();
    }

    public function toUser(int $userId, string $title, ?string $body, ?string $link, string $tag): void
    {
        if (! $this->configured() || ! PushSubscription::where('user_id', $userId)->exists()) {
            return;
        }

        defer(fn () => $this->deliver($userId, ['title' => $title, 'body' => $body, 'link' => $link, 'tag' => $tag]));
    }

    public function badgeCount(int $userId): int
    {
        $user = User::find($userId);

        return $user ? app(Inbox::class)->unreadCount($user) + app(ChatService::class)->unreadCount($user) : 0;
    }

    private function deliver(int $userId, array $payload): void
    {
        $subscriptions = PushSubscription::where('user_id', $userId)->get();
        if ($subscriptions->isEmpty()) {
            return;
        }

        $this->send($subscriptions, [...$payload, 'badge' => $this->badgeCount($userId)]);
    }

    protected function send(Collection $subscriptions, array $payload): void
    {
        try {
            $push = new WebPush(['VAPID' => [
                'subject' => config('services.webpush.subject') ?: config('app.url'),
                'publicKey' => config('services.webpush.public_key'),
                'privateKey' => config('services.webpush.private_key'),
            ]], ['TTL' => 86400, 'urgency' => 'high']);

            $json = json_encode($payload, JSON_UNESCAPED_UNICODE);
            foreach ($subscriptions as $subscription) {
                $push->queueNotification(Subscription::create([
                    'endpoint' => $subscription->endpoint,
                    'publicKey' => $subscription->p256dh,
                    'authToken' => $subscription->auth,
                    'contentEncoding' => 'aes128gcm',
                ]), $json);
            }

            foreach ($push->flush() as $report) {
                if ($report->isSubscriptionExpired()) {
                    $this->unsubscribe($report->getEndpoint());
                } elseif (! $report->isSuccess()) {
                    Log::warning('Web push failed: '.$report->getReason());
                }
            }
        } catch (Throwable $e) {
            Log::warning('Web push failed: '.$e->getMessage());
        }
    }
}

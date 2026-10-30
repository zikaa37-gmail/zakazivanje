<?php

namespace App\Services;

use App\Models\BusinessSetting;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\ValidationException;

class InstagramService
{
    private const API = 'https://graph.instagram.com';

    private const AUTHORIZE_URL = 'https://www.instagram.com/oauth/authorize';

    private const TOKEN_URL = 'https://api.instagram.com/oauth/access_token';

    private const CACHE_KEY = 'instagram:posts';

    private const INSIGHT_METRICS = ['reach', 'profile_views', 'website_clicks', 'accounts_engaged', 'total_interactions'];

    public function posts(): array
    {
        $settings = BusinessSetting::current();
        if (! $settings->instagram_feed_enabled || ! $settings->instagram_token) {
            return [];
        }

        if (($cached = Cache::get(self::CACHE_KEY)) !== null) {
            return $cached;
        }

        $response = Http::timeout(10)->get(self::API.'/me/media', [
            'fields' => 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp',
            'limit' => 12,
            'access_token' => $settings->instagram_token,
        ]);

        if (! $response->successful()) {
            Cache::put(self::CACHE_KEY, [], now()->addMinutes(10));

            return [];
        }

        $posts = collect($response->json('data', []))
            ->map(fn ($post) => [
                'id' => (string) $post['id'],
                'caption' => $post['caption'] ?? null,
                'type' => $post['media_type'] ?? 'IMAGE',
                'image' => ($post['media_type'] ?? '') === 'VIDEO' ? ($post['thumbnail_url'] ?? null) : ($post['media_url'] ?? null),
                'permalink' => $post['permalink'] ?? null,
                'posted_at' => $post['timestamp'] ?? null,
            ])
            ->filter(fn ($post) => $post['image'] && $post['permalink'])
            ->values()
            ->all();

        Cache::put(self::CACHE_KEY, $posts, now()->addHour());

        return $posts;
    }

    public function insights(CarbonImmutable $from, CarbonImmutable $to): ?array
    {
        $settings = BusinessSetting::current();
        if (! $settings->instagram_insights_enabled || ! $settings->instagram_token) {
            return null;
        }

        $to = $to->min(CarbonImmutable::today());
        $from = $from->max($to->subDays(89));

        return Cache::remember("instagram:insights:{$from->toDateString()}:{$to->toDateString()}", now()->addHour(), function () use ($settings, $from, $to) {
            $totals = array_fill_keys(self::INSIGHT_METRICS, 0);
            $failed = false;

            for ($start = $from; $start->lte($to); $start = $start->addDays(30)) {
                $end = $start->addDays(29)->min($to);
                $response = Http::timeout(10)->get(self::API.'/me/insights', [
                    'metric' => implode(',', self::INSIGHT_METRICS),
                    'period' => 'day',
                    'metric_type' => 'total_value',
                    'since' => $start->startOfDay()->timestamp,
                    'until' => $end->endOfDay()->timestamp,
                    'access_token' => $settings->instagram_token,
                ]);
                if (! $response->successful()) {
                    $failed = true;
                    break;
                }
                foreach ($response->json('data', []) as $metric) {
                    if (array_key_exists($metric['name'] ?? '', $totals)) {
                        $totals[$metric['name']] += (int) ($metric['total_value']['value'] ?? 0);
                    }
                }
            }

            return [
                'available' => ! $failed,
                'from' => $from->toDateString(),
                'to' => $to->toDateString(),
                ...$totals,
                'top_posts' => $failed ? [] : $this->topPosts($settings->instagram_token, $from, $to),
            ];
        });
    }

    private function topPosts(string $token, CarbonImmutable $from, CarbonImmutable $to): array
    {
        $media = Http::timeout(10)->get(self::API.'/me/media', [
            'fields' => 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count',
            'limit' => 25,
            'access_token' => $token,
        ]);
        if (! $media->successful()) {
            return [];
        }

        return collect($media->json('data', []))
            ->filter(fn ($post) => isset($post['timestamp']) && CarbonImmutable::parse($post['timestamp'])->between($from->startOfDay(), $to->endOfDay()))
            ->take(10)
            ->map(function ($post) use ($token) {
                $insights = Http::timeout(10)->get(self::API."/{$post['id']}/insights", ['metric' => 'reach,total_interactions', 'access_token' => $token]);
                $values = collect($insights->successful() ? $insights->json('data', []) : [])
                    ->mapWithKeys(fn ($m) => [$m['name'] => (int) ($m['values'][0]['value'] ?? $m['total_value']['value'] ?? 0)]);

                return [
                    'id' => (string) $post['id'],
                    'caption' => $post['caption'] ?? null,
                    'image' => ($post['media_type'] ?? '') === 'VIDEO' ? ($post['thumbnail_url'] ?? null) : ($post['media_url'] ?? null),
                    'permalink' => $post['permalink'] ?? null,
                    'posted_at' => $post['timestamp'],
                    'reach' => $values['reach'] ?? 0,
                    'interactions' => $values['total_interactions'] ?? ((int) ($post['like_count'] ?? 0) + (int) ($post['comments_count'] ?? 0)),
                ];
            })
            ->sortByDesc('reach')
            ->take(3)
            ->values()
            ->all();
    }

    public function oauthAvailable(): bool
    {
        return (bool) config('instagram.app_id') && (bool) config('instagram.app_secret');
    }

    public function authorizeUrl(User $owner): string
    {
        $state = Crypt::encryptString(json_encode(['uid' => $owner->id, 'exp' => now()->addMinutes(15)->timestamp]));

        return self::AUTHORIZE_URL.'?'.http_build_query([
            'client_id' => config('instagram.app_id'),
            'redirect_uri' => $this->redirectUri(),
            'response_type' => 'code',
            'scope' => implode(',', config('instagram.scopes')),
            'state' => $state,
        ]);
    }

    public function handleCallback(?string $code, ?string $state): void
    {
        try {
            $payload = json_decode(Crypt::decryptString((string) $state), true);
        } catch (DecryptException) {
            $payload = null;
        }

        $owner = $payload && ($payload['exp'] ?? 0) >= now()->timestamp ? User::find($payload['uid'] ?? 0) : null;
        if (! $owner?->isManager() || ! $code) {
            throw ValidationException::withMessages(['instagram' => ['Povezivanje je isteklo ili je otkazano. Pokušaj ponovo.']]);
        }

        $short = Http::asForm()->timeout(10)->post(self::TOKEN_URL, [
            'client_id' => config('instagram.app_id'),
            'client_secret' => config('instagram.app_secret'),
            'grant_type' => 'authorization_code',
            'redirect_uri' => $this->redirectUri(),
            'code' => $code,
        ]);
        if (! $short->successful() || ! $short->json('access_token')) {
            throw ValidationException::withMessages(['instagram' => ['Instagram nije izdao pristup. Proveri da li je nalog poslovni (Business / Creator).']]);
        }

        $long = Http::timeout(10)->get(self::API.'/access_token', [
            'grant_type' => 'ig_exchange_token',
            'client_secret' => config('instagram.app_secret'),
            'access_token' => $short->json('access_token'),
        ]);
        if (! $long->successful() || ! $long->json('access_token')) {
            throw ValidationException::withMessages(['instagram' => ['Instagram nije izdao dugotrajni pristup. Pokušaj ponovo.']]);
        }

        $this->connect($long->json('access_token'), (int) $long->json('expires_in', 5184000));
    }

    public function redirectUri(): string
    {
        return config('instagram.redirect_uri') ?: route('instagram.callback');
    }

    public function connect(string $token, int $expiresIn = 5184000): BusinessSetting
    {
        $response = Http::timeout(10)->get(self::API.'/me', ['fields' => 'user_id,username', 'access_token' => $token]);

        if (! $response->successful() || ! $response->json('username')) {
            throw ValidationException::withMessages(['token' => ['Instagram nije prihvatio token. Proveri da li je token za poslovni (Business / Creator) nalog.']]);
        }

        $settings = BusinessSetting::current();
        $settings->forceFill([
            'instagram_token' => $token,
            'instagram_username' => $response->json('username'),
            'instagram_user_id' => $response->json('user_id') ? (string) $response->json('user_id') : null,
            'instagram_token_expires_at' => now()->addSeconds($expiresIn),
            'instagram_feed_enabled' => true,
        ])->save();
        $this->forget();

        return $settings;
    }

    public function disconnect(): BusinessSetting
    {
        $settings = BusinessSetting::current();
        $settings->forceFill(['instagram_token' => null, 'instagram_username' => null, 'instagram_user_id' => null, 'instagram_publishing_enabled' => false, 'instagram_free_slots_enabled' => false, 'instagram_token_expires_at' => null, 'instagram_feed_enabled' => false])->save();
        $this->forget();

        return $settings;
    }

    public function refreshToken(): bool
    {
        $settings = BusinessSetting::current();
        if (! $settings->instagram_token) {
            return false;
        }

        $response = Http::timeout(10)->get(self::API.'/refresh_access_token', [
            'grant_type' => 'ig_refresh_token',
            'access_token' => $settings->instagram_token,
        ]);

        if (! $response->successful() || ! $response->json('access_token')) {
            return false;
        }

        $settings->forceFill([
            'instagram_token' => $response->json('access_token'),
            'instagram_token_expires_at' => now()->addSeconds((int) $response->json('expires_in', 5184000)),
        ])->save();

        return true;
    }

    public function forget(): void
    {
        Cache::forget(self::CACHE_KEY);
    }
}

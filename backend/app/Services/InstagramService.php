<?php

namespace App\Services;

use App\Models\BusinessSetting;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\ValidationException;

class InstagramService
{
    private const API = 'https://graph.instagram.com';

    private const CACHE_KEY = 'instagram:posts';

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

    public function connect(string $token): BusinessSetting
    {
        $response = Http::timeout(10)->get(self::API.'/me', ['fields' => 'username', 'access_token' => $token]);

        if (! $response->successful() || ! $response->json('username')) {
            throw ValidationException::withMessages(['token' => ['Instagram nije prihvatio token. Proveri da li je token za poslovni (Business / Creator) nalog.']]);
        }

        $settings = BusinessSetting::current();
        $settings->forceFill([
            'instagram_token' => $token,
            'instagram_username' => $response->json('username'),
            'instagram_token_expires_at' => now()->addDays(60),
            'instagram_feed_enabled' => true,
        ])->save();
        $this->forget();

        return $settings;
    }

    public function disconnect(): BusinessSetting
    {
        $settings = BusinessSetting::current();
        $settings->forceFill(['instagram_token' => null, 'instagram_username' => null, 'instagram_token_expires_at' => null, 'instagram_feed_enabled' => false])->save();
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

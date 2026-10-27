<?php

namespace App\Services;

use App\Models\BusinessSetting;
use App\Models\InstagramPost;
use Carbon\CarbonImmutable;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class InstagramPublisher
{
    private const API = 'https://graph.instagram.com';

    private const STATUS_CHECKS = 10;

    public function __construct(private FreeSlotsStoryService $freeSlots) {}

    public function available(): bool
    {
        $settings = BusinessSetting::current();

        return $settings->instagram_publishing_enabled && (bool) $settings->instagram_token;
    }

    public function publish(InstagramPost $post): InstagramPost
    {
        $settings = BusinessSetting::current();
        $post->update(['status' => InstagramPost::STATUS_PUBLISHING, 'error' => null]);

        try {
            if (! $settings->instagram_token) {
                throw new RuntimeException('Instagram nije povezan.');
            }
            $token = $settings->instagram_token;
            $userId = $this->userId($settings);

            $params = ['image_url' => $post->imageUrl(), 'access_token' => $token];
            if ($post->kind === InstagramPost::KIND_STORY) {
                $params['media_type'] = 'STORIES';
            } elseif ($post->caption) {
                $params['caption'] = $post->caption;
            }

            $containerId = $this->expect(Http::asForm()->timeout(60)->post(self::API."/{$userId}/media", $params), 'id');
            $this->waitUntilReady($containerId, $token);
            $mediaId = $this->expect(Http::asForm()->timeout(60)->post(self::API."/{$userId}/media_publish", ['creation_id' => $containerId, 'access_token' => $token]), 'id');
            $permalink = Http::timeout(10)->get(self::API."/{$mediaId}", ['fields' => 'permalink', 'access_token' => $token])->json('permalink');

            $post->update([
                'status' => InstagramPost::STATUS_PUBLISHED,
                'published_at' => now(),
                'media_id' => $mediaId,
                'permalink' => $permalink,
                'image' => null,
            ]);
            app(InstagramService::class)->forget();
        } catch (RuntimeException $e) {
            $post->update(['status' => InstagramPost::STATUS_FAILED, 'error' => $e->getMessage()]);
        } catch (ConnectionException) {
            $post->update(['status' => InstagramPost::STATUS_FAILED, 'error' => 'Instagram trenutno nije dostupan. Pokušaj ponovo za nekoliko minuta.']);
        }

        return $post->refresh();
    }

    public function publishDue(): int
    {
        if (! $this->available()) {
            return 0;
        }

        $due = InstagramPost::query()
            ->where('status', InstagramPost::STATUS_SCHEDULED)
            ->where('scheduled_at', '<=', now())
            ->orderBy('scheduled_at')
            ->get();

        $due->each(fn (InstagramPost $post) => $this->publish($post));

        return $due->count();
    }

    public function queueFreeSlotsStory(): ?InstagramPost
    {
        $settings = BusinessSetting::current();
        if (! $this->available() || ! $settings->instagram_free_slots_enabled) {
            return null;
        }

        $now = CarbonImmutable::now();
        $days = array_map('intval', $settings->instagram_free_slots_days ?? []);
        if (! in_array($now->isoWeekday(), $days, true) || $now->format('H:i') < $settings->instagram_free_slots_time) {
            return null;
        }

        $alreadyToday = InstagramPost::query()
            ->where('source', InstagramPost::SOURCE_FREE_SLOTS)
            ->whereDate('created_at', $now->toDateString())
            ->exists();
        if ($alreadyToday) {
            return null;
        }

        $date = $now->addDay()->startOfDay();
        $story = $this->freeSlots->build($date);

        return InstagramPost::create([
            'kind' => InstagramPost::KIND_STORY,
            'source' => InstagramPost::SOURCE_FREE_SLOTS,
            'image' => $story['image'] ?? null,
            'slots' => $story ? ['date' => $story['date'], 'ranges' => $story['ranges']] : null,
            'status' => $story ? InstagramPost::STATUS_SCHEDULED : InstagramPost::STATUS_SKIPPED,
            'error' => $story ? null : 'Za '.$this->freeSlots->dayLabel($date).' nema slobodnih manje traženih termina.',
            'scheduled_at' => $now,
        ]);
    }

    private function userId(BusinessSetting $settings): string
    {
        if ($settings->instagram_user_id) {
            return $settings->instagram_user_id;
        }

        $id = (string) Http::timeout(10)->get(self::API.'/me', ['fields' => 'user_id', 'access_token' => $settings->instagram_token])->json('user_id');
        if ($id === '') {
            throw new RuntimeException('Instagram nije vratio podatke o nalogu. Poveži nalog ponovo.');
        }
        $settings->forceFill(['instagram_user_id' => $id])->save();

        return $id;
    }

    private function waitUntilReady(string $containerId, string $token): void
    {
        for ($i = 0; $i < self::STATUS_CHECKS; $i++) {
            $status = Http::timeout(10)->get(self::API."/{$containerId}", ['fields' => 'status_code', 'access_token' => $token])->json('status_code');
            if ($status === 'FINISHED' || $status === null) {
                return;
            }
            if (in_array($status, ['ERROR', 'EXPIRED'], true)) {
                throw new RuntimeException('Instagram nije mogao da obradi sliku. Proveri format (JPEG, 4:5 do 1,91:1 za objavu, 9:16 za story).');
            }
            sleep(3);
        }

        throw new RuntimeException('Instagram predugo obrađuje sliku. Pokušaj ponovo za nekoliko minuta.');
    }

    private function expect(Response $response, string $key): string
    {
        $value = (string) $response->json($key);
        if (! $response->successful() || $value === '') {
            $message = $response->json('error.error_user_msg') ?? $response->json('error.message') ?? 'Instagram je odbio objavu.';
            throw new RuntimeException($message);
        }

        return $value;
    }
}

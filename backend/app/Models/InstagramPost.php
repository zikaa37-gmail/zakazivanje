<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

#[Fillable(['kind', 'source', 'caption', 'image', 'token', 'status', 'scheduled_at', 'published_at', 'media_id', 'permalink', 'error', 'slots', 'created_by'])]
#[Hidden(['image', 'token'])]
class InstagramPost extends Model
{
    public const MAX_IMAGE_LENGTH = 8_000_000;

    public const KIND_POST = 'post';

    public const KIND_STORY = 'story';

    public const KINDS = [self::KIND_POST, self::KIND_STORY];

    public const SOURCE_MANUAL = 'manual';

    public const SOURCE_FREE_SLOTS = 'free_slots';

    public const STATUS_SCHEDULED = 'scheduled';

    public const STATUS_PUBLISHING = 'publishing';

    public const STATUS_PUBLISHED = 'published';

    public const STATUS_FAILED = 'failed';

    public const STATUS_SKIPPED = 'skipped';

    protected static function booted(): void
    {
        static::creating(fn (InstagramPost $post) => $post->token ??= Str::random(40));
    }

    protected function casts(): array
    {
        return [
            'scheduled_at' => 'datetime',
            'published_at' => 'datetime',
            'slots' => 'array',
            'created_by' => 'integer',
        ];
    }

    public function imageUrl(): string
    {
        return route('instagram.media', ['token' => $this->token]);
    }

    public function imageBytes(): ?string
    {
        if (! $this->image || ! preg_match('/^data:image\/jpeg;base64,(.+)$/s', $this->image, $match)) {
            return null;
        }

        return base64_decode($match[1]) ?: null;
    }

    public function present(): array
    {
        return [
            'id' => $this->id,
            'kind' => $this->kind,
            'source' => $this->source,
            'caption' => $this->caption,
            'status' => $this->status,
            'scheduled_at' => $this->scheduled_at?->toIso8601String(),
            'published_at' => $this->published_at?->toIso8601String(),
            'permalink' => $this->permalink,
            'error' => $this->error,
            'slots' => $this->slots,
            'image_url' => $this->image ? $this->imageUrl() : null,
        ];
    }
}

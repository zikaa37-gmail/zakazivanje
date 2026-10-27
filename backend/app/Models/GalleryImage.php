<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['data', 'mime', 'width', 'height', 'caption', 'service_id', 'kind', 'featured', 'visible', 'position'])]
#[Hidden(['data'])]
class GalleryImage extends Model
{
    public const MAX_DATA_LENGTH = 4_000_000;

    public const KIND_WORK = 'work';

    public const KIND_SALON = 'salon';

    public const KINDS = [self::KIND_WORK, self::KIND_SALON];

    protected function casts(): array
    {
        return [
            'width' => 'integer',
            'height' => 'integer',
            'service_id' => 'integer',
            'featured' => 'boolean',
            'visible' => 'boolean',
            'position' => 'integer',
        ];
    }

    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class);
    }

    public function present(): array
    {
        return [
            ...$this->only(['id', 'caption', 'service_id', 'kind', 'featured', 'width', 'height', 'visible', 'position']),
            'service_name' => $this->service?->name,
            'url' => '/public/gallery/images/'.$this->id.'?v='.$this->updated_at?->timestamp,
        ];
    }
}

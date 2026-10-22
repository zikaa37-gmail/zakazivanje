<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['data', 'mime', 'width', 'height', 'caption', 'service_id', 'visible', 'position'])]
#[Hidden(['data'])]
class GalleryImage extends Model
{
    public const MAX_DATA_LENGTH = 4_000_000;

    protected function casts(): array
    {
        return [
            'width' => 'integer',
            'height' => 'integer',
            'service_id' => 'integer',
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
            ...$this->only(['id', 'caption', 'service_id', 'width', 'height', 'visible', 'position']),
            'service_name' => $this->service?->name,
            'url' => '/public/gallery/images/'.$this->id.'?v='.$this->updated_at?->timestamp,
        ];
    }
}

<?php

namespace App\Support;

final class Like
{
    public static function contains(string $term): string
    {
        return '%'.addcslashes($term, '\%_').'%';
    }
}

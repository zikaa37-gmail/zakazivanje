<?php

namespace App\Enums;

enum UserRole: string
{
    case Client = 'client';
    case Owner = 'owner';
    case Manager = 'manager';
    case Worker = 'worker';

    public static function staff(): array
    {
        return [self::Owner, self::Manager, self::Worker];
    }

    public function isStaff(): bool
    {
        return $this !== self::Client;
    }

    public function label(): string
    {
        return match ($this) {
            self::Client => 'Klijent',
            self::Owner => 'Vlasnik',
            self::Manager => 'Menadžer',
            self::Worker => 'Radnik',
        };
    }
}

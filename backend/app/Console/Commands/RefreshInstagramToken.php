<?php

namespace App\Console\Commands;

use App\Services\InstagramService;
use Illuminate\Console\Command;

class RefreshInstagramToken extends Command
{
    protected $signature = 'instagram:refresh-token';

    protected $description = 'Obnavlja Instagram token (važi 60 dana)';

    public function handle(InstagramService $instagram): int
    {
        $this->info($instagram->refreshToken() ? 'Token je obnovljen.' : 'Token nije obnovljen.');

        return self::SUCCESS;
    }
}

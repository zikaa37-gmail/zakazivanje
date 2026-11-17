<?php

namespace App\Console\Commands;

use App\Services\ChangeNoticeService;
use Illuminate\Console\Command;

class SendChangeNotices extends Command
{
    protected $signature = 'appointments:send-change-notices';

    protected $description = 'Šalje obaveštenja o pomerenim terminima kad prođe vreme od poslednjeg pomeranja';

    public function handle(ChangeNoticeService $notices): int
    {
        $this->info('Poslato: '.$notices->sendDue());

        return self::SUCCESS;
    }
}

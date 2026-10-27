<?php

namespace App\Console\Commands;

use App\Services\InstagramPublisher;
use Illuminate\Console\Command;

class PublishInstagramPosts extends Command
{
    protected $signature = 'instagram:publish-scheduled';

    protected $description = 'Objavljuje zakazane objave na Instagramu i pravi story sa slobodnim terminima';

    public function handle(InstagramPublisher $publisher): int
    {
        $story = $publisher->queueFreeSlotsStory();
        if ($story) {
            $this->info($story->error ?? 'Story sa slobodnim terminima je spreman.');
        }

        $this->info('Objavljeno: '.$publisher->publishDue());

        return self::SUCCESS;
    }
}

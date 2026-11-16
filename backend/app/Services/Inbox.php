<?php

namespace App\Services;

use App\Models\InboxNotification;
use App\Models\User;
use Illuminate\Support\Facades\Auth;

class Inbox
{
    public const EVENT = 'inbox';

    public function __construct(private Realtime $realtime, private WebPushService $webPush) {}

    public function deliver(iterable $users, object $notification): void
    {
        foreach ($users as $user) {
            if (! $this->canReceive($user)) {
                continue;
            }

            $item = InboxNotification::create(['user_id' => $user->id, ...$notification->toInbox($user)]);

            $this->realtime->toUser($user->id, self::EVENT, [
                'id' => $item->id,
                'kind' => $item->kind,
                'title' => $item->title,
                'body' => $item->body,
                'link' => $item->link,
            ]);
            $this->webPush->toUser($user->id, $item->title, $item->body, $item->link, 'inbox-'.$item->id);
        }
    }

    public function unreadCount(User $user): int
    {
        return InboxNotification::where('user_id', $user->id)->whereNull('read_at')->count();
    }

    private function canReceive(mixed $user): bool
    {
        return $user instanceof User
            && $user->active !== false
            && $user->id !== Auth::id()
            && ($user->isStaff() || $user->password !== null);
    }
}

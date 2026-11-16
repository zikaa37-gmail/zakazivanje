<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\InboxNotification;
use App\Services\Inbox;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class InboxController extends Controller
{
    private const PAGE = 30;

    public function index(Request $request, Inbox $inbox)
    {
        $data = $request->validate([
            'filter' => ['nullable', Rule::in(['unread', 'all'])],
            'before_id' => ['nullable', 'integer'],
        ]);
        $user = $request->user();

        $items = InboxNotification::query()
            ->where('user_id', $user->id)
            ->when(($data['filter'] ?? 'all') === 'unread', fn ($q) => $q->whereNull('read_at'))
            ->when($data['before_id'] ?? null, fn ($q, $id) => $q->where('id', '<', $id))
            ->latest('id')
            ->limit(self::PAGE + 1)
            ->get(['id', 'kind', 'title', 'body', 'link', 'appointment_id', 'read_at', 'created_at']);

        return [
            'items' => $items->take(self::PAGE)->values(),
            'has_more' => $items->count() > self::PAGE,
            'unread_count' => $inbox->unreadCount($user),
        ];
    }

    public function unreadCount(Request $request, Inbox $inbox)
    {
        return ['count' => $inbox->unreadCount($request->user())];
    }

    public function markRead(Request $request, Inbox $inbox, int $id)
    {
        $item = InboxNotification::where('user_id', $request->user()->id)->findOrFail($id);
        $item->read_at ??= now();
        $item->save();

        return ['count' => $inbox->unreadCount($request->user())];
    }

    public function markAllRead(Request $request)
    {
        InboxNotification::where('user_id', $request->user()->id)->whereNull('read_at')->update(['read_at' => now()]);

        return ['count' => 0];
    }
}

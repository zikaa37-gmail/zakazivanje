<?php

namespace App\Console\Commands;

use App\Models\ChatMessage;
use App\Models\ChatSession;
use App\Notifications\ChatMessageNotification;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class NotifyUnreadChat extends Command
{
    public const AFTER_MINUTES = 15;

    protected $signature = 'chat:notify-unread';

    protected $description = 'Šalje klijentu mejl / WhatsApp za poruke salona koje nije pročitao u aplikaciji';

    public function handle(): int
    {
        $sent = 0;
        ChatMessage::query()
            ->join('chat_sessions', 'chat_sessions.id', '=', 'chat_messages.chat_session_id')
            ->leftJoin('chat_reads', fn ($j) => $j->on('chat_reads.chat_session_id', '=', 'chat_sessions.id')->whereColumn('chat_reads.user_id', 'chat_sessions.client_id'))
            ->whereNull('chat_messages.notified_at')
            ->whereColumn('chat_messages.user_id', '!=', 'chat_sessions.client_id')
            ->where(fn ($q) => $q->whereNull('chat_reads.last_read_message_id')->orWhereColumn('chat_messages.id', '>', 'chat_reads.last_read_message_id'))
            ->where('chat_messages.created_at', '<=', now()->subMinutes(self::AFTER_MINUTES))
            ->where('chat_messages.created_at', '>=', now()->subDay())
            ->orderBy('chat_messages.id')
            ->get(['chat_messages.*'])
            ->groupBy('chat_session_id')
            ->each(function ($messages, $sessionId) use (&$sent) {
                $session = ChatSession::with('client')->find($sessionId);
                DB::table('chat_messages')->whereIn('id', $messages->pluck('id'))->update(['notified_at' => now()]);
                $client = $session?->client;
                if (! $client || $client->notificationChannels(['mail' => 'mail', 'whatsapp' => 'whatsapp']) === []) {
                    return;
                }
                $client->notify(new ChatMessageNotification($session, $messages->pluck('body')->all()));
                $sent++;
            });

        $this->info("Poslato: {$sent}");

        return self::SUCCESS;
    }
}

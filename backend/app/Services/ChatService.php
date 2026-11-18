<?php

namespace App\Services;

use App\Enums\UserRole;
use App\Models\Appointment;
use App\Models\BusinessSetting;
use App\Models\ChatMessage;
use App\Models\ChatSession;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpException;

class ChatService
{
    public const EVENT = 'chat';

    public function __construct(private Realtime $realtime, private WebPushService $webPush) {}

    public function ensureEnabled(): void
    {
        if (! BusinessSetting::current()->chat_enabled) {
            throw new HttpException(403, 'Poruke sa salonom trenutno nisu uključene.');
        }
    }

    public function openTopic(User $client, ?int $appointmentId): ?ChatSession
    {
        return ChatSession::where('client_id', $client->id)
            ->active()
            ->when($appointmentId, fn ($q) => $q->where('appointment_id', $appointmentId), fn ($q) => $q->whereNull('appointment_id'))
            ->latest('id')
            ->first();
    }

    public function subjectFor(?string $subject, ?int $appointmentId, string $fallback): string
    {
        $subject = trim((string) $subject);
        if ($subject !== '') {
            return mb_substr($subject, 0, 150);
        }
        $appointment = $appointmentId ? Appointment::with('items')->find($appointmentId) : null;

        return $appointment
            ? 'Termin '.$appointment->starts_at->format('d.m. \u H:i').' · '.$appointment->items->pluck('name')->join(' + ')
            : $fallback;
    }

    public function sendByClient(User $client, string $body, ?int $appointmentId = null, ?int $sessionId = null, ?string $subject = null): ChatMessage
    {
        $this->ensureEnabled();
        if ($appointmentId !== null && ! Appointment::where('id', $appointmentId)->where('client_id', $client->id)->exists()) {
            throw ValidationException::withMessages(['appointment_id' => ['Termin nije pronađen.']]);
        }

        return DB::transaction(function () use ($client, $body, $appointmentId, $sessionId, $subject) {
            if ($sessionId !== null) {
                $session = ChatSession::where('client_id', $client->id)->findOrFail($sessionId);
                $session->fill(['closed_at' => null, 'closed_by' => null]);
            } else {
                $session = (filled($subject) ? null : $this->openTopic($client, $appointmentId)) ?? ChatSession::create([
                    'client_id' => $client->id,
                    'started_by' => $client->id,
                    'appointment_id' => $appointmentId,
                    'subject' => $this->subjectFor($subject, $appointmentId, 'Pitanje'),
                ]);
            }

            return $this->append($session, $client, $body);
        });
    }

    public function sendByStaff(User $staff, ChatSession $session, string $body): ChatMessage
    {
        $this->ensureEnabled();

        return DB::transaction(function () use ($staff, $session, $body) {
            if (! $session->isActive()) {
                $session->fill(['closed_at' => null, 'closed_by' => null]);
            }
            $session->assigned_to ??= $staff->id;

            return $this->append($session, $staff, $body);
        });
    }

    public function startByStaff(User $staff, User $client, string $body, ?int $appointmentId = null, ?string $subject = null): ChatMessage
    {
        $this->ensureEnabled();
        if ($client->role !== UserRole::Client || $client->password === null) {
            throw ValidationException::withMessages(['client_id' => ['Klijent nema nalog u aplikaciji — javite mu se telefonom.']]);
        }

        if ($appointmentId !== null && ! Appointment::where('id', $appointmentId)->where('client_id', $client->id)->exists()) {
            throw ValidationException::withMessages(['appointment_id' => ['Termin nije pronađen.']]);
        }
        $session = (filled($subject) || $appointmentId === null ? null : $this->openTopic($client, $appointmentId)) ?? new ChatSession([
            'client_id' => $client->id,
            'appointment_id' => $appointmentId,
            'subject' => $this->subjectFor($subject, $appointmentId, 'Poruka salona'),
            'started_by' => $staff->id,
            'assigned_to' => $staff->id,
        ]);
        abort_unless($staff->isManager() || ($appointmentId !== null && $this->ownsAppointment($staff, $appointmentId)), 403);

        return $this->sendByStaff($staff, $session, $body);
    }

    public function close(ChatSession $session, User $staff): void
    {
        $session->update(['closed_at' => now(), 'closed_by' => $staff->id]);
        $this->broadcast($session, ['session_id' => $session->id, 'closed' => true]);
    }

    public function markRead(ChatSession $session, User $user): void
    {
        $last = (int) $session->messages()->max('id');
        DB::table('chat_reads')->upsert(
            [['chat_session_id' => $session->id, 'user_id' => $user->id, 'last_read_message_id' => $last]],
            ['chat_session_id', 'user_id'],
            ['last_read_message_id'],
        );
    }

    public function canSee(User $staff, ChatSession $session): bool
    {
        if ($staff->isManager()) {
            return true;
        }

        return $session->assigned_to === $staff->id
            || $session->started_by === $staff->id
            || ($session->appointment_id !== null && $this->ownsAppointment($staff, $session->appointment_id));
    }

    public function visibleTo(User $staff): Builder
    {
        return ChatSession::query()->when(! $staff->isManager(), fn ($q) => $q->where(fn ($w) => $w
            ->whereHas('appointment', fn ($a) => $a->where('staff_member_id', $staff->staff_member_id ?? 0))
            ->orWhere('assigned_to', $staff->id)
            ->orWhere('started_by', $staff->id)));
    }

    private function ownsAppointment(User $staff, int $appointmentId): bool
    {
        return $staff->staff_member_id !== null && Appointment::where('id', $appointmentId)->where('staff_member_id', $staff->staff_member_id)->exists();
    }

    public function unreadCount(User $user): int
    {
        return $this->unreadQuery($user)->count();
    }

    public function unreadBySession(User $user, array $sessionIds): Collection
    {
        return $this->unreadQuery($user)
            ->whereIn('chat_messages.chat_session_id', $sessionIds)
            ->groupBy('chat_messages.chat_session_id')
            ->pluck(DB::raw('count(*)'), 'chat_messages.chat_session_id');
    }

    public function staffRecipients(ChatSession $session): Collection
    {
        $staffMemberId = $session->appointment?->staff_member_id;

        return User::where('active', true)
            ->where(fn ($q) => $q->whereIn('role', [UserRole::Owner, UserRole::Manager])
                ->when($staffMemberId, fn ($q) => $q->orWhere(fn ($q) => $q->where('role', UserRole::Worker)->where('staff_member_id', $staffMemberId))))
            ->get();
    }

    public function present(ChatMessage $message): array
    {
        $author = $message->author;

        return [
            'id' => $message->id,
            'chat_session_id' => $message->chat_session_id,
            'body' => $message->body,
            'created_at' => $message->created_at?->toIso8601String(),
            'author_id' => $message->user_id,
            'author_name' => $author ? trim($author->first_name.' '.$author->last_name) : null,
            'from_client' => $author?->role === UserRole::Client,
        ];
    }

    private function append(ChatSession $session, User $author, string $body): ChatMessage
    {
        $session->last_message_at = now();
        $session->save();

        $message = $session->messages()->create(['user_id' => $author->id, 'body' => trim($body)]);
        $message->setRelation('author', $author);
        $this->markRead($session, $author);

        $this->broadcast($session, ['session_id' => $session->id, 'message' => $this->present($message)], $author->id);
        $this->pushMessage($session, $message, $author);

        return $message;
    }

    private function pushMessage(ChatSession $session, ChatMessage $message, User $author): void
    {
        $body = mb_strimwidth($message->body, 0, 160, '…');
        if ($author->id === $session->client_id) {
            foreach ($this->staffRecipients($session) as $staff) {
                $this->webPush->toUser($staff->id, 'Poruka: '.$author->salonName(), $body, '/admin/chat?session='.$session->id, 'chat-'.$session->id);
            }

            return;
        }

        $this->webPush->toUser($session->client_id, BusinessSetting::current()->name, $body, '/?chat=1', 'chat-'.$session->id);
    }

    private function broadcast(ChatSession $session, array $data, ?int $exceptUserId = null): void
    {
        $session->loadMissing('appointment');
        $userIds = $this->staffRecipients($session)->pluck('id')->push($session->client_id)->unique()->reject(fn ($id) => $id === $exceptUserId);
        foreach ($userIds as $userId) {
            $this->realtime->toUser($userId, self::EVENT, $data);
        }
    }

    private function unreadQuery(User $user)
    {
        $query = ChatMessage::query()
            ->join('chat_sessions', 'chat_sessions.id', '=', 'chat_messages.chat_session_id')
            ->leftJoin('chat_reads', fn ($j) => $j->on('chat_reads.chat_session_id', '=', 'chat_sessions.id')->where('chat_reads.user_id', $user->id))
            ->where(fn ($q) => $q->whereNull('chat_reads.last_read_message_id')->orWhereColumn('chat_messages.id', '>', 'chat_reads.last_read_message_id'));

        if ($user->isStaff()) {
            $visible = $this->visibleTo($user)->select('id');

            return $query->whereColumn('chat_messages.user_id', 'chat_sessions.client_id')->whereIn('chat_sessions.id', $visible);
        }

        return $query->where('chat_sessions.client_id', $user->id)->where(fn ($q) => $q->whereNull('chat_messages.user_id')->orWhere('chat_messages.user_id', '!=', $user->id));
    }
}

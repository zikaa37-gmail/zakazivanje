<?php

namespace App\Http\Controllers\Api;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\ChatMessage;
use App\Models\ChatSession;
use App\Models\User;
use App\Services\ChatService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class ChatController extends Controller
{
    private const BODY_RULES = ['required', 'string', 'max:2000'];

    private const BODY_MESSAGES = ['body.required' => 'Napiši poruku.', 'body.max' => 'Poruka je predugačka.'];

    public function __construct(private ChatService $chat) {}

    public function unreadCount(Request $request)
    {
        return ['count' => $this->chat->unreadCount($request->user())];
    }

    public function mine(Request $request)
    {
        $user = $request->user();
        $sessions = ChatSession::where('client_id', $user->id)
            ->with(['messages.author:id,first_name,last_name,role', 'appointment.items', 'appointment.staffMember:id,first_name,last_name'])
            ->orderByRaw('closed_at is not null')
            ->orderByDesc('last_message_at')
            ->limit(20)
            ->get();

        return [
            'sessions' => $sessions->map(fn (ChatSession $s) => $this->presentSession($s, true))->values(),
            'unread_count' => $this->chat->unreadCount($user),
        ];
    }

    public function sendMine(Request $request)
    {
        $data = $request->validate([
            'body' => self::BODY_RULES,
            'appointment_id' => ['nullable', 'integer'],
            'session_id' => ['nullable', 'integer'],
            'subject' => ['nullable', 'string', 'max:150'],
        ], self::BODY_MESSAGES);

        $message = $this->chat->sendByClient($request->user(), $data['body'], $data['appointment_id'] ?? null, $data['session_id'] ?? null, $data['subject'] ?? null);

        return response()->json($this->chat->present($message), 201);
    }

    public function readMine(Request $request)
    {
        ChatSession::where('client_id', $request->user()->id)->get()->each(fn (ChatSession $s) => $this->chat->markRead($s, $request->user()));

        return ['count' => 0];
    }

    public function index(Request $request)
    {
        $data = $request->validate(['status' => ['nullable', Rule::in(['active', 'closed'])]]);
        $user = $request->user();

        $sessions = $this->chat->visibleTo($user)
            ->when(($data['status'] ?? 'active') === 'active', fn ($q) => $q->active(), fn ($q) => $q->inactive())
            ->with(['client:id,first_name,last_name,nickname,phone', 'assignee:id,first_name,last_name', 'appointment.items', 'appointment.staffMember:id,first_name,last_name'])
            ->withCount('messages')
            ->orderByDesc('last_message_at')
            ->orderByDesc('id')
            ->limit(100)
            ->get();

        $unread = $this->chat->unreadBySession($user, $sessions->pluck('id')->all());
        $participants = ChatMessage::query()
            ->whereIn('chat_session_id', $sessions->pluck('id'))
            ->whereNotNull('user_id')
            ->with('author:id,first_name,role')
            ->get(['chat_session_id', 'user_id'])
            ->filter(fn (ChatMessage $m) => $m->author && $m->author->role !== UserRole::Client)
            ->groupBy('chat_session_id')
            ->map(fn ($messages) => $messages->pluck('author.first_name')->unique()->values());
        $last = ChatMessage::whereIn('id', ChatMessage::selectRaw('max(id)')->whereIn('chat_session_id', $sessions->pluck('id'))->groupBy('chat_session_id'))->get()->keyBy('chat_session_id');

        return [
            'sessions' => $sessions->map(fn (ChatSession $s) => [
                ...$this->presentSession($s),
                'unread' => (int) ($unread[$s->id] ?? 0),
                'last_message' => isset($last[$s->id]) ? Str::limit($last[$s->id]->body, 80) : null,
                'last_from_client' => isset($last[$s->id]) && $last[$s->id]->user_id === $s->client_id,
                'participants' => $participants[$s->id] ?? [],
            ])->values(),
            'unread_count' => $this->chat->unreadCount($user),
        ];
    }

    public function show(Request $request, ChatSession $session)
    {
        abort_unless($this->chat->canSee($request->user(), $session), 404);
        $session->load(['client:id,first_name,last_name,nickname,phone,email', 'assignee:id,first_name,last_name', 'messages.author:id,first_name,last_name,role', 'appointment.items', 'appointment.staffMember:id,first_name,last_name']);
        $this->chat->markRead($session, $request->user());

        $topics = $this->chat->visibleTo($request->user())->where('client_id', $session->client_id)->whereKeyNot($session->id)
            ->orderByDesc('last_message_at')->limit(10)->get(['id', 'subject', 'closed_at', 'last_message_at', 'created_at']);

        return [
            ...$this->presentSession($session, true),
            'client' => $session->client?->only(['id', 'first_name', 'last_name', 'nickname', 'phone', 'email']),
            'other_topics' => $topics->map(fn (ChatSession $s) => ['id' => $s->id, 'subject' => $this->subject($s), 'active' => $s->isActive(), 'last_message_at' => $s->last_message_at?->toIso8601String()])->values(),
            'unread_count' => $this->chat->unreadCount($request->user()),
        ];
    }

    public function send(Request $request, ChatSession $session)
    {
        abort_unless($this->chat->canSee($request->user(), $session), 404);
        $data = $request->validate(['body' => self::BODY_RULES], self::BODY_MESSAGES);

        return response()->json($this->chat->present($this->chat->sendByStaff($request->user(), $session, $data['body'])), 201);
    }

    public function start(Request $request)
    {
        $data = $request->validate([
            'client_id' => ['required', 'integer', Rule::exists('users', 'id')->where('role', UserRole::Client)],
            'appointment_id' => ['nullable', 'integer'],
            'subject' => ['nullable', 'string', 'max:150'],
            'body' => self::BODY_RULES,
        ], self::BODY_MESSAGES);

        $message = $this->chat->startByStaff($request->user(), User::findOrFail($data['client_id']), $data['body'], $data['appointment_id'] ?? null, $data['subject'] ?? null);

        return response()->json(['session_id' => $message->chat_session_id, 'message' => $this->chat->present($message)], 201);
    }

    public function read(Request $request, ChatSession $session)
    {
        abort_unless($this->chat->canSee($request->user(), $session), 404);
        $this->chat->markRead($session, $request->user());

        return ['count' => $this->chat->unreadCount($request->user())];
    }

    public function close(Request $request, ChatSession $session)
    {
        abort_unless($this->chat->canSee($request->user(), $session), 404);
        $this->chat->close($session, $request->user());

        return ['message' => 'Razgovor je završen.'];
    }

    private function subject(ChatSession $session): string
    {
        return $session->subject ?: 'Razgovor '.$session->created_at?->format('d.m.Y.');
    }

    private function presentSession(ChatSession $session, bool $withMessages = false): array
    {
        $appointment = $session->appointment;

        return [
            'id' => $session->id,
            'subject' => $this->subject($session),
            'client_id' => $session->client_id,
            'client_name' => $session->relationLoaded('client') && $session->client ? $session->client->salonName() : null,
            'active' => $session->isActive(),
            'closed_at' => $session->closed_at?->toIso8601String(),
            'last_message_at' => $session->last_message_at?->toIso8601String(),
            'created_at' => $session->created_at?->toIso8601String(),
            'assignee' => $session->relationLoaded('assignee') && $session->assignee ? trim($session->assignee->first_name.' '.$session->assignee->last_name) : null,
            'appointment' => $appointment ? [
                'id' => $appointment->id,
                'starts_at' => $appointment->starts_at->format('Y-m-d H:i'),
                'services' => $appointment->items->pluck('name')->join(' + '),
                'staff' => $appointment->staffMember?->first_name,
            ] : null,
            ...($withMessages ? ['messages' => $session->messages->sortBy('id')->map(fn ($m) => $this->chat->present($m))->values()] : []),
        ];
    }
}

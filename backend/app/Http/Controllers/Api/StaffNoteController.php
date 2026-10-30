<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BusinessSetting;
use App\Models\StaffMember;
use App\Models\StaffNote;
use App\Models\User;
use App\Notifications\StaffNoteNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class StaffNoteController extends Controller
{
    private const WITH = ['author:id,first_name,last_name', 'taker:id,first_name,last_name', 'resolver:id,first_name,last_name', 'recipients:id,first_name,last_name'];

    public function index(Request $request)
    {
        $user = $request->user();

        return StaffNote::query()
            ->with(self::WITH)
            ->orderByRaw('resolved_at is not null')
            ->latest()
            ->orderByDesc('id')
            ->limit(200)
            ->get()
            ->map(fn (StaffNote $note) => $this->present($note, $user));
    }

    public function recipients()
    {
        $always = BusinessSetting::current()->noteAlwaysNotifyIds();
        $accounts = User::query()
            ->whereIn('role', User::STAFF_ROLES)
            ->where('active', true)
            ->orderBy('first_name')
            ->get(['id', 'first_name', 'last_name', 'role', 'staff_member_id']);

        $rows = $accounts->map(fn (User $u) => [
            'user_id' => $u->id,
            'name' => trim($u->first_name.' '.$u->last_name),
            'role' => $u->role,
            'staff_member_id' => $u->staff_member_id,
            'always' => in_array($u->id, $always, true),
        ]);

        $withoutAccount = StaffMember::query()
            ->where('active', true)
            ->whereNotIn('id', $accounts->pluck('staff_member_id')->filter())
            ->orderBy('first_name')
            ->get(['id', 'first_name', 'last_name'])
            ->map(fn (StaffMember $s) => [
                'user_id' => null,
                'name' => trim($s->first_name.' '.$s->last_name),
                'role' => null,
                'staff_member_id' => $s->id,
                'always' => false,
            ]);

        return $rows->concat($withoutAccount)->sortBy('name')->values();
    }

    public function unreadCount(Request $request)
    {
        $count = StaffNote::query()
            ->whereNull('resolved_at')
            ->whereHas('recipients', fn ($q) => $q->where('users.id', $request->user()->id)->whereNull('staff_note_recipients.read_at'))
            ->count();

        return ['count' => $count];
    }

    public function store(Request $request)
    {
        $user = $request->user();
        $data = $request->validate([
            'body' => ['required', 'string', 'min:2', 'max:2000'],
            'recipient_ids' => ['array'],
            'recipient_ids.*' => ['integer', 'distinct', Rule::exists('users', 'id')->whereIn('role', User::STAFF_ROLES)],
        ], [
            'body.required' => 'Napiši belešku.',
        ]);

        $note = StaffNote::create(['author_id' => $user->id, 'body' => trim($data['body'])]);
        $ids = array_unique([...($data['recipient_ids'] ?? []), ...BusinessSetting::current()->noteAlwaysNotifyIds()]);
        $recipients = User::whereKey($ids)->whereIn('role', User::STAFF_ROLES)->where('active', true)->whereKeyNot($user->id)->get();
        $note->recipients()->sync($recipients->pluck('id'));
        foreach ($recipients as $recipient) {
            $recipient->notify(new StaffNoteNotification($note));
        }

        return response()->json($this->present($note->load(self::WITH), $user), 201);
    }

    public function resolve(Request $request, StaffNote $note)
    {
        $resolved = $note->resolved_at === null;
        $note->update(['resolved_at' => $resolved ? now() : null, 'resolved_by' => $resolved ? $request->user()->id : null]);
        DB::table('staff_note_recipients')->where('staff_note_id', $note->id)->where('user_id', $request->user()->id)->whereNull('read_at')->update(['read_at' => now()]);

        return $this->present($note->load(self::WITH), $request->user());
    }

    public function markRead(Request $request, StaffNote $note)
    {
        DB::table('staff_note_recipients')->where('staff_note_id', $note->id)->where('user_id', $request->user()->id)->whereNull('read_at')->update(['read_at' => now()]);

        return $this->present($note->load(self::WITH), $request->user());
    }

    public function take(Request $request, StaffNote $note)
    {
        $user = $request->user();
        if ($note->taken_by !== null && $note->taken_by !== $user->id) {
            $name = $note->taker ? $note->taker->first_name : 'neko drugi';
            throw ValidationException::withMessages(['note' => ["Ovo je već preuzeo/la {$name}."]]);
        }

        $taking = $note->taken_by === null;
        $note->update(['taken_by' => $taking ? $user->id : null, 'taken_at' => $taking ? now() : null]);
        DB::table('staff_note_recipients')->where('staff_note_id', $note->id)->where('user_id', $user->id)->whereNull('read_at')->update(['read_at' => now()]);

        return $this->present($note->load(self::WITH), $user);
    }

    public function destroy(Request $request, StaffNote $note)
    {
        $user = $request->user();
        abort_unless($user->isManager() || $note->author_id === $user->id, 403, 'Belešku briše autor ili vlasnik / administrativni radnik.');
        $note->delete();

        return response()->json(['message' => 'Beleška je obrisana.']);
    }

    private function present(StaffNote $note, User $user): array
    {
        $me = $note->recipients->firstWhere('id', $user->id);

        return [
            'id' => $note->id,
            'body' => $note->body,
            'created_at' => $note->created_at?->format('Y-m-d H:i'),
            'author' => $note->author ? ['id' => $note->author->id, 'name' => trim($note->author->first_name.' '.$note->author->last_name)] : null,
            'status' => $note->resolved_at ? 'done' : ($note->taken_by ? 'taken' : 'open'),
            'taken_by' => $note->taker ? ['id' => $note->taker->id, 'name' => trim($note->taker->first_name.' '.$note->taker->last_name)] : null,
            'taken_at' => $note->taken_at?->format('Y-m-d H:i'),
            'resolved_at' => $note->resolved_at?->format('Y-m-d H:i'),
            'resolver' => $note->resolver ? trim($note->resolver->first_name.' '.$note->resolver->last_name) : null,
            'recipients' => $note->recipients->map(fn (User $u) => trim($u->first_name.' '.$u->last_name))->values(),
            'readers' => $note->recipients->filter(fn (User $u) => $u->pivot->read_at !== null)->map(fn (User $u) => trim($u->first_name.' '.$u->last_name))->values(),
            'unread' => $me !== null && $me->pivot->read_at === null,
            'can_delete' => $user->isManager() || $note->author_id === $user->id,
        ];
    }
}

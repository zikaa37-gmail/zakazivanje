<?php

namespace App\Notifications;

use App\Models\StaffNote;
use App\Models\StaffNoteReply;
use App\Models\User;
use Illuminate\Support\Str;

class StaffNoteReplyNotification
{
    public function __construct(public StaffNote $note, public StaffNoteReply $reply) {}

    public function toInbox(User $notifiable): array
    {
        $author = $this->reply->author ? trim($this->reply->author->first_name.' '.$this->reply->author->last_name) : 'Neko iz salona';

        return [
            'kind' => 'note',
            'title' => 'Odgovor na belešku: '.$author,
            'body' => Str::limit($this->reply->body, 160),
            'link' => '/admin/notes?note='.$this->note->id,
        ];
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\NotificationLog;
use App\Notifications\TestNotification;
use App\Services\WhatsAppService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class NotificationController extends Controller
{
    public function logs(Request $request)
    {
        $data = $request->validate(['status' => ['nullable', Rule::in([NotificationLog::STATUS_SENT, NotificationLog::STATUS_SKIPPED, NotificationLog::STATUS_FAILED])]]);

        return NotificationLog::query()
            ->with('user:id,first_name,last_name')
            ->when($data['status'] ?? null, fn ($q, $status) => $q->where('status', $status))
            ->latest('id')
            ->limit(100)
            ->get();
    }

    public function test(Request $request, WhatsAppService $whatsapp)
    {
        $data = $request->validate(['channel' => ['required', Rule::in(['mail', 'whatsapp'])]]);
        $user = $request->user();

        if ($data['channel'] === 'mail' && blank($user->email)) {
            throw ValidationException::withMessages(['channel' => ['Tvoj nalog nema email.']]);
        }

        if ($data['channel'] === 'whatsapp' && WhatsAppService::normalizePhone($user->whatsapp_number ?: $user->phone) === null) {
            throw ValidationException::withMessages(['channel' => ['U profilu nema ispravnog broja telefona.']]);
        }

        $user->notifyNow(new TestNotification($data['channel']));

        return [
            'message' => $data['channel'] === 'mail'
                ? 'Probni mejl je poslat na '.$user->email.'.'
                : ($whatsapp->isConfigured() ? 'Probna WhatsApp poruka je poslata.' : 'WhatsApp (Twilio) nije podešen — poruka je samo upisana u log.'),
        ];
    }
}

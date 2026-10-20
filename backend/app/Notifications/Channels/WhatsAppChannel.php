<?php

namespace App\Notifications\Channels;

use App\Models\NotificationLog;
use App\Models\User;
use App\Services\WhatsAppService;
use Illuminate\Notifications\Notification;

class WhatsAppChannel
{
    public function __construct(private WhatsAppService $whatsapp) {}

    public function send(User $notifiable, Notification $notification): void
    {
        $phone = WhatsAppService::normalizePhone($notifiable->whatsapp_number ?: $notifiable->phone);
        if ($phone === null || ! method_exists($notification, 'toWhatsApp')) {
            return;
        }

        $error = $this->whatsapp->sendMessage($phone, $notification->toWhatsApp($notifiable));

        NotificationLog::record(
            $notifiable,
            method_exists($notification, 'logType') ? $notification->logType() : class_basename($notification),
            'whatsapp',
            $phone,
            $error === null ? NotificationLog::STATUS_SENT : ($this->whatsapp->isConfigured() ? NotificationLog::STATUS_FAILED : NotificationLog::STATUS_SKIPPED),
            method_exists($notification, 'appointmentId') ? $notification->appointmentId() : null,
            $error,
        );
    }
}

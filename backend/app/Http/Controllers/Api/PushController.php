<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\WebPushService;
use Illuminate\Http\Request;

class PushController extends Controller
{
    public function __construct(private WebPushService $webPush) {}

    public function subscribe(Request $request)
    {
        abort_unless($this->webPush->configured(), 404);
        $data = $request->validate([
            'endpoint' => ['required', 'url', 'max:2000'],
            'keys.p256dh' => ['required', 'string', 'max:255'],
            'keys.auth' => ['required', 'string', 'max:255'],
        ]);

        $this->webPush->subscribe($request->user(), $data['endpoint'], $data['keys']['p256dh'], $data['keys']['auth'], $request->userAgent());

        return ['badge' => $this->webPush->badgeCount($request->user()->id)];
    }

    public function unsubscribe(Request $request)
    {
        $data = $request->validate(['endpoint' => ['required', 'string', 'max:2000']]);
        $this->webPush->unsubscribe($data['endpoint']);

        return ['message' => 'Obaveštenja na ovom uređaju su isključena.'];
    }

    public function badge(Request $request)
    {
        return ['badge' => $this->webPush->badgeCount($request->user()->id)];
    }
}

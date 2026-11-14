<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Realtime;
use Illuminate\Http\Request;

class RealtimeController extends Controller
{
    public function auth(Request $request, Realtime $realtime)
    {
        $data = $request->validate([
            'socket_id' => ['required', 'string', 'regex:/^\d+\.\d+$/'],
            'channel_name' => ['required', 'string', 'max:100'],
        ]);

        abort_unless($realtime->configured(), 404);
        abort_unless($realtime->canJoin($request->user(), $data['channel_name']), 403);

        return response($realtime->authorize($data['channel_name'], $data['socket_id']), 200, ['Content-Type' => 'application/json']);
    }
}

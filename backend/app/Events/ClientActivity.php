<?php

namespace App\Events;

use App\Models\User;
use Illuminate\Foundation\Events\Dispatchable;

class ClientActivity
{
    use Dispatchable;

    public const LOGIN = 'login';

    public const LOGIN_FAILED = 'login_failed';

    public const SESSION = 'session';

    public const AVAILABILITY_VIEWED = 'availability_viewed';

    public const BOOKED = 'booked';

    public const BOOKING_FAILED = 'booking_failed';

    public const CANCELLED = 'cancelled';

    public const RESCHEDULED = 'rescheduled';

    public const RESCHEDULE_FAILED = 'reschedule_failed';

    public const NO_SHOW = 'no_show';

    public const WAITLIST_JOINED = 'waitlist_joined';

    public const ZONE_CHANGED = 'zone_changed';

    public function __construct(
        public User $client,
        public string $type,
        public array $data = [],
        public ?User $actor = null,
    ) {}
}

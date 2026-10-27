<?php

use Illuminate\Support\Facades\Schedule;

Schedule::command('appointments:extend-recurring')->dailyAt('02:00');
Schedule::command('reports:send-scheduled')->dailyAt('21:00');
Schedule::command('appointments:send-reminders')->everyFifteenMinutes()->withoutOverlapping();
Schedule::command('queue:work --stop-when-empty --max-time=55 --timeout=120')->everyMinute()->withoutOverlapping(10)->runInBackground();

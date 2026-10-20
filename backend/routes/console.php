<?php

use Illuminate\Support\Facades\Schedule;

Schedule::command('appointments:extend-recurring')->dailyAt('02:00');

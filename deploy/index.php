<?php

// PRODUKCIONA verzija Laravel front controller-a.
// Razlika od backend/public/index.php: aplikacija (vendor/, bootstrap/, app/...)
// NIJE u ovom folderu (koren poddomena, javno dostupan), već u folderu
// "zakazivanje_app" JEDAN NIVO IZNAD - sused ovom folderu, van web korena,
// iz bezbednosnih razloga (da .env, app/, database/ ne budu dostupni preko URL-a).
//
// Prilagodi "../zakazivanje_app" ako je folder nazvan drugačije.

use Illuminate\Foundation\Application;
use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

$appDir = __DIR__.'/../zakazivanje_app';

if (file_exists($maintenance = $appDir.'/storage/framework/maintenance.php')) {
    require $maintenance;
}

require $appDir.'/vendor/autoload.php';

/** @var Application $app */
$app = require_once $appDir.'/bootstrap/app.php';

$app->handleRequest(Request::capture());

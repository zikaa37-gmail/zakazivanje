<?php

return [
    'secret' => env('JWT_SECRET'),
    'access_ttl_minutes' => env('JWT_ACCESS_TTL_MINUTES', 60),
    'refresh_ttl_days' => env('JWT_REFRESH_TTL_DAYS', 30),
    // Brza prijava (test): mejlovi naloga za koje login strana nudi prijavu jednim klikom. Prazno = isključeno.
    'quick_login_emails' => array_values(array_filter(array_map('trim', explode(',', (string) env('QUICK_LOGIN_EMAILS', ''))))),
];

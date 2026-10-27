<?php

return [
    'app_id' => env('INSTAGRAM_APP_ID'),
    'app_secret' => env('INSTAGRAM_APP_SECRET'),
    'redirect_uri' => env('INSTAGRAM_REDIRECT_URI'),
    'scopes' => [
        'instagram_business_basic',
        'instagram_business_manage_insights',
        'instagram_business_content_publish',
        'instagram_business_manage_messages',
        'instagram_business_manage_comments',
    ],
];

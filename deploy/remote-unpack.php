<?php

$secret = '__DEPLOY_SECRET__';
$appDir = dirname(__DIR__).'/__DEPLOY_APP_DIR__';
$webDir = __DIR__;

header('Content-Type: application/json');

if (! hash_equals($secret, (string) ($_POST['key'] ?? ''))) {
    http_response_code(403);
    echo json_encode(['ok' => false, 'error' => 'forbidden']);
    exit;
}

@set_time_limit(600);
$result = ['ok' => true];

function unzipTo(string $zip, string $dir): array
{
    $archive = new ZipArchive();
    if ($archive->open($zip) !== true) {
        throw new RuntimeException('Zip nije moguće otvoriti: '.basename($zip));
    }
    $names = [];
    for ($i = 0; $i < $archive->numFiles; $i++) {
        $names[] = $archive->getNameIndex($i);
    }
    if (! $archive->extractTo($dir)) {
        throw new RuntimeException('Raspakivanje nije uspelo: '.basename($zip));
    }
    $archive->close();
    unlink($zip);

    return $names;
}

function readEnv(string $path): array
{
    $values = [];
    foreach (file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [] as $line) {
        if ($line[0] === '#' || ! str_contains($line, '=')) {
            continue;
        }
        [$key, $value] = explode('=', $line, 2);
        $values[trim($key)] = trim(trim($value), '"\'');
    }

    return $values;
}

try {
    if (is_file("$appDir/_deploy-app.zip")) {
        $result['app_files'] = count(unzipTo("$appDir/_deploy-app.zip", $appDir));
        foreach (glob("$appDir/bootstrap/cache/*.php") ?: [] as $file) {
            unlink($file);
        }
        foreach (glob("$appDir/storage/framework/views/*.php") ?: [] as $file) {
            unlink($file);
        }
    }

    if (is_file("$appDir/_deploy.env")) {
        rename("$appDir/_deploy.env", "$appDir/.env");
        $result['env'] = true;
    }

    if (is_file("$webDir/_deploy-web.zip")) {
        $names = unzipTo("$webDir/_deploy-web.zip", $webDir);
        $keep = array_flip($names);
        $removed = 0;
        foreach (glob("$webDir/*.{js,css,map}", GLOB_BRACE) ?: [] as $file) {
            if (! isset($keep[basename($file)])) {
                unlink($file);
                $removed++;
            }
        }
        $result['web_files'] = count($names);
        $result['web_removed'] = $removed;
    }

    if (is_file("$appDir/_deploy-db.sql")) {
        $env = readEnv("$appDir/.env");
        $db = new mysqli($env['DB_HOST'] ?? 'localhost', $env['DB_USERNAME'], $env['DB_PASSWORD'], $env['DB_DATABASE'], (int) ($env['DB_PORT'] ?? 3306));
        $db->set_charset('utf8mb4');
        if (! $db->multi_query(file_get_contents("$appDir/_deploy-db.sql"))) {
            throw new RuntimeException('SQL: '.$db->error);
        }
        $statements = 0;
        do {
            $statements++;
            if ($res = $db->store_result()) {
                $res->free();
            }
        } while ($db->more_results() && $db->next_result());
        if ($db->errno) {
            throw new RuntimeException('SQL: '.$db->error);
        }
        $db->close();
        unlink("$appDir/_deploy-db.sql");
        $result['db_statements'] = $statements;
    }

    if (function_exists('opcache_reset')) {
        opcache_reset();
    }

    if (is_file("$appDir/vendor/autoload.php")) {
        require "$appDir/vendor/autoload.php";
        $laravel = require "$appDir/bootstrap/app.php";
        $console = $laravel->make(Illuminate\Contracts\Console\Kernel::class);
        $console->call('migrate', ['--force' => true]);
        $result['migrate'] = trim($console->output()) ?: 'ok';
    }
} catch (Throwable $exception) {
    http_response_code(500);
    $result = ['ok' => false, 'error' => $exception->getMessage()];
}

foreach (glob("$webDir/_deploy-*.php") ?: [] as $file) {
    @unlink($file);
}
echo json_encode($result);

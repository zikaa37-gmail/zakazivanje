<?php

namespace App\Console\Commands;

use Illuminate\Foundation\Console\ServeCommand as BaseServeCommand;
use Illuminate\Support\Env;

class ServeCommand extends BaseServeCommand
{
    public const DEFAULT_PORT = 8000;

    public const FALLBACK_PORT = 8110;

    #[\Override]
    protected function configureDefaults(): void
    {
        parent::configureDefaults();

        if (Env::get('SERVER_PORT') === null && self::portInUse(self::DEFAULT_PORT)) {
            $this->getDefinition()->getOption('port')->setDefault(self::FALLBACK_PORT);
        }
    }

    #[\Override]
    public function handle()
    {
        self::useBundledOpenSslConfig();

        return parent::handle();
    }

    public static function useBundledOpenSslConfig(): void
    {
        $config = dirname(PHP_BINARY).DIRECTORY_SEPARATOR.'extras'.DIRECTORY_SEPARATOR.'ssl'.DIRECTORY_SEPARATOR.'openssl.cnf';
        if (PHP_OS_FAMILY === 'Windows' && getenv('OPENSSL_CONF') === false && is_file($config)) {
            putenv('OPENSSL_CONF='.$config);
        }
    }

    private static function portInUse(int $port): bool
    {
        $connection = @fsockopen('127.0.0.1', $port, $errorCode, $errorMessage, 0.3);

        if ($connection === false) {
            return false;
        }

        fclose($connection);

        return true;
    }
}

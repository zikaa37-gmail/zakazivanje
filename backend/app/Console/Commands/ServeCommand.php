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

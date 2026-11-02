<?php

namespace App\Services;

use Anthropic\Beta\Messages\BetaJSONOutputFormat;
use Anthropic\Beta\Messages\BetaOutputConfig;
use Anthropic\Client;
use Anthropic\Core\Exceptions\APIConnectionException;
use Anthropic\Core\Exceptions\APIStatusException;
use Anthropic\Core\Exceptions\AuthenticationException;
use Anthropic\Core\Exceptions\PermissionDeniedException;
use Anthropic\Core\Exceptions\RateLimitException;
use App\Models\BusinessSetting;
use Illuminate\Validation\ValidationException;

class AiService
{
    public const MODEL = 'claude-opus-5-5';

    private const SYSTEM = 'You help the owner of a small appointment-based business in Serbia (salon, barber, clinic, studio) set up their online booking app. '
        .'Write every user-facing text in Serbian, Latin script, in the natural wording a local business would use. '
        .'Prices are in Serbian dinars (RSD) and should match typical prices in Serbia for the given city or, without a city, for Belgrade.';

    public function key(): ?string
    {
        return BusinessSetting::current()->ai_api_key ?: config('services.anthropic.key');
    }

    public function enabled(): bool
    {
        return BusinessSetting::current()->ai_enabled && (bool) $this->key();
    }

    public function ensureEnabled(): void
    {
        if (! $this->enabled()) {
            throw ValidationException::withMessages(['ai' => ['AI pomoćnik nije uključen — uključi ga u Podešavanja → AI pomoćnik.']]);
        }
    }

    public function verify(string $key): void
    {
        $this->call(fn () => $this->client($key)->models->retrieve(self::MODEL));
    }

    public function json(string $prompt, array $schema): array
    {
        $this->ensureEnabled();

        $message = $this->call(fn () => $this->client($this->key())->beta->messages->create(
            maxTokens: 16000,
            messages: [['role' => 'user', 'content' => $prompt]],
            model: self::MODEL,
            system: self::SYSTEM,
            outputConfig: BetaOutputConfig::with(effort: 'low', format: BetaJSONOutputFormat::with(schema: $schema)),
            fallbacks: 'default',
            betas: ['server-side-fallback-2026-07-01'],
        ));

        if ($message->stopReason === 'refusal') {
            throw ValidationException::withMessages(['ai' => ['AI nije hteo da odgovori na ovaj zahtev. Probaj drugačiji opis.']]);
        }

        foreach ($message->content as $block) {
            if ($block->type === 'text') {
                $data = json_decode($block->text, true);
                if (is_array($data)) {
                    return $data;
                }
            }
        }

        throw ValidationException::withMessages(['ai' => ['AI nije vratio predlog. Pokušaj ponovo.']]);
    }

    private function client(string $key): Client
    {
        return new Client(apiKey: $key, requestOptions: ['timeout' => 110, 'maxRetries' => 1]);
    }

    private function call(callable $request): mixed
    {
        try {
            return $request();
        } catch (AuthenticationException|PermissionDeniedException) {
            throw ValidationException::withMessages(['ai' => ['API ključ nije ispravan ili nema pristup.']]);
        } catch (RateLimitException) {
            throw ValidationException::withMessages(['ai' => ['Previše zahteva ka AI servisu — pokušaj za minut.']]);
        } catch (APIStatusException $e) {
            report($e);
            throw ValidationException::withMessages(['ai' => ['AI servis trenutno ne odgovara. Pokušaj ponovo.']]);
        } catch (APIConnectionException $e) {
            report($e);
            throw ValidationException::withMessages(['ai' => ['Nema veze sa AI servisom. Pokušaj ponovo.']]);
        }
    }
}

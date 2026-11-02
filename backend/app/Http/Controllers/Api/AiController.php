<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BusinessSetting;
use App\Models\Service;
use App\Models\ServiceCategory;
use App\Services\AiService;
use Illuminate\Http\Request;

class AiController extends Controller
{
    public function __construct(private AiService $ai) {}

    public function status()
    {
        $settings = BusinessSetting::current();

        return [
            'enabled' => $settings->ai_enabled,
            'key_saved' => (bool) $settings->ai_api_key,
            'key_from_server' => ! $settings->ai_api_key && (bool) config('services.anthropic.key'),
            'available' => $this->ai->enabled(),
            'model' => AiService::MODEL,
        ];
    }

    public function saveKey(Request $request)
    {
        $data = $request->validate(['api_key' => ['required', 'string', 'min:20', 'max:300']]);

        $this->ai->verify(trim($data['api_key']));
        BusinessSetting::current()->update(['ai_api_key' => trim($data['api_key'])]);

        return $this->status();
    }

    public function forgetKey()
    {
        BusinessSetting::current()->update(['ai_api_key' => null]);

        return $this->status();
    }

    public function serviceSuggestions(Request $request)
    {
        $data = $request->validate(['description' => ['nullable', 'string', 'max:2000']]);
        set_time_limit(150);

        $settings = BusinessSetting::current();
        $existing = ServiceCategory::query()->orderBy('sort_order')->pluck('name')->join(', ') ?: '—';
        $services = Service::query()->pluck('name')->join(', ') ?: '—';

        $prompt = "Propose service categories and services for this business's online booking.\n\n"
            ."Business name: {$settings->name}\n"
            ."Business type: {$settings->category}\n"
            .'City: '.($settings->city ?: '—')."\n"
            .'Business description: '.($settings->description ?: '—')."\n"
            ."Existing categories: {$existing}\n"
            ."Existing services: {$services}\n\n"
            .'What the owner says they offer: '.(trim($data['description'] ?? '') ?: '— (propose what this kind of business usually offers)')."\n\n"
            .'Group services into 3 to 8 categories that clients would understand. Reuse an existing category name when a service belongs there, '
            .'and do not repeat existing services. Each service gets a realistic duration in minutes (multiple of 5), a typical price in RSD, '
            .'a one-sentence description for clients, and the audience (female, male or all).';

        $result = $this->ai->json($prompt, [
            'type' => 'object',
            'properties' => [
                'categories' => [
                    'type' => 'array',
                    'items' => [
                        'type' => 'object',
                        'properties' => [
                            'name' => ['type' => 'string'],
                            'services' => [
                                'type' => 'array',
                                'items' => [
                                    'type' => 'object',
                                    'properties' => [
                                        'name' => ['type' => 'string'],
                                        'description' => ['type' => 'string'],
                                        'duration_minutes' => ['type' => 'integer'],
                                        'price' => ['type' => 'integer'],
                                        'audience' => ['type' => 'string', 'enum' => Service::AUDIENCES],
                                    ],
                                    'required' => ['name', 'description', 'duration_minutes', 'price', 'audience'],
                                    'additionalProperties' => false,
                                ],
                            ],
                        ],
                        'required' => ['name', 'services'],
                        'additionalProperties' => false,
                    ],
                ],
            ],
            'required' => ['categories'],
            'additionalProperties' => false,
        ]);

        return ['categories' => $result['categories'] ?? []];
    }

    public function staffTerm(Request $request)
    {
        $data = $request->validate([
            'category' => ['nullable', 'string', 'max:40'],
            'description' => ['nullable', 'string', 'max:500'],
        ]);

        $settings = BusinessSetting::current();
        $prompt = "How do clients of this business call the person who serves them?\n\n"
            ."Business name: {$settings->name}\n"
            .'Business type: '.($data['category'] ?? $settings->category)."\n"
            .'Business description: '.(trim($data['description'] ?? '') ?: ($settings->description ?: '—'))."\n\n"
            .'Give up to 4 options, best first. Each option has the noun in the nominative singular, lowercase (e.g. "frizer"), '
            .'and the same noun in the genitive singular (e.g. "frizera"), as used in "kod tvog ___". Prefer a gender-neutral or masculine generic form.';

        $result = $this->ai->json($prompt, [
            'type' => 'object',
            'properties' => [
                'options' => [
                    'type' => 'array',
                    'items' => [
                        'type' => 'object',
                        'properties' => [
                            'term' => ['type' => 'string'],
                            'genitive' => ['type' => 'string'],
                        ],
                        'required' => ['term', 'genitive'],
                        'additionalProperties' => false,
                    ],
                ],
            ],
            'required' => ['options'],
            'additionalProperties' => false,
        ]);

        return ['options' => array_slice($result['options'] ?? [], 0, 4)];
    }
}

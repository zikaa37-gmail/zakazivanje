<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BusinessSetting;
use App\Services\InstagramService;
use App\Services\MarketingService;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class MarketingController extends Controller
{
    public function __construct(private MarketingService $marketing, private InstagramService $instagram) {}

    public function visit(Request $request)
    {
        $data = $request->validate([
            'source' => ['required', 'string', 'regex:'.MarketingService::SOURCE_PATTERN],
            'campaign' => ['nullable', 'string', 'regex:'.MarketingService::CAMPAIGN_PATTERN],
        ]);

        if (! $request->user()?->isStaff()) {
            $this->marketing->recordVisit($data['source'], $data['campaign'] ?? null);
        }

        return response()->noContent();
    }

    public function report(Request $request)
    {
        $data = $request->validate([
            'from' => ['required', 'date_format:Y-m-d'],
            'to' => ['required', 'date_format:Y-m-d', 'after_or_equal:from'],
        ]);

        $from = CarbonImmutable::parse($data['from']);
        $to = CarbonImmutable::parse($data['to']);

        return [
            'rows' => $this->marketing->report($from, $to),
            'instagram' => $this->instagram->insights($from, $to),
        ];
    }

    public function instagramPosts()
    {
        return $this->instagram->posts();
    }

    public function connectInstagram(Request $request)
    {
        $data = $request->validate(['token' => ['required', 'string', 'min:20', 'max:1000']], ['token.required' => 'Nalepi token.', 'token.min' => 'Token je prekratak.']);

        return $this->instagramState($this->instagram->connect(trim($data['token'])));
    }

    public function authorizeInstagram(Request $request)
    {
        abort_unless($this->instagram->oauthAvailable(), 422, 'Povezivanje preko Instagrama nije podešeno na serveru.');

        return ['url' => $this->instagram->authorizeUrl($request->user())];
    }

    public function instagramCallback(Request $request)
    {
        $target = rtrim(config('app.frontend_url'), '/').'/admin/settings?tab=social';

        if ($request->filled('error')) {
            return redirect($target.'&instagram=cancelled');
        }

        try {
            $this->instagram->handleCallback($request->query('code'), $request->query('state'));
        } catch (ValidationException $e) {
            return redirect($target.'&instagram=error&message='.rawurlencode(collect($e->errors())->flatten()->first()));
        }

        return redirect($target.'&instagram=connected');
    }

    public function disconnectInstagram()
    {
        return $this->instagramState($this->instagram->disconnect());
    }

    private function instagramState(BusinessSetting $settings): array
    {
        return $settings->only(['instagram_connected', 'instagram_username', 'instagram_token_expires_at', 'instagram_feed_enabled', 'instagram_insights_enabled']);
    }
}

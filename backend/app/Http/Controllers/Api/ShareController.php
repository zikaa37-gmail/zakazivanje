<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use chillerlan\QRCode\Common\EccLevel;
use chillerlan\QRCode\Output\QRGdImagePNG;
use chillerlan\QRCode\Output\QRMarkupSVG;
use chillerlan\QRCode\QRCode;
use chillerlan\QRCode\QROptions;
use Illuminate\Http\Request;

class ShareController extends Controller
{
    public function qr(Request $request)
    {
        $data = $request->validate([
            'url' => ['required', 'string', 'max:500', 'url:http,https'],
        ], ['url.url' => 'Link mora početi sa https://']);

        return [
            'url' => $data['url'],
            'png' => (new QRCode(new QROptions(['outputInterface' => QRGdImagePNG::class, 'scale' => 20, 'outputBase64' => true, 'eccLevel' => EccLevel::Q])))->render($data['url']),
            'svg' => (new QRCode(new QROptions(['outputInterface' => QRMarkupSVG::class, 'outputBase64' => false, 'eccLevel' => EccLevel::Q, 'svgAddXmlHeader' => true])))->render($data['url']),
        ];
    }
}

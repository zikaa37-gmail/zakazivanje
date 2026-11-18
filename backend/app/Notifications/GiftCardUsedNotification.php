<?php

namespace App\Notifications;

use App\Models\GiftCard;

class GiftCardUsedNotification
{
    public function __construct(private GiftCard $card, private float $amount) {}

    public function toInbox(object $notifiable): array
    {
        $money = fn (float $v) => number_format($v, 0, ',', '.').' din.';

        return [
            'kind' => 'gift_card',
            'title' => 'Plaćeno poklon karticom '.$this->card->formattedCode(),
            'body' => $money($this->amount).' · na kartici je ostalo '.$money($this->card->balance),
            'link' => '/profile',
        ];
    }
}

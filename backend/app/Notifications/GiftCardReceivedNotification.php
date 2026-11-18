<?php

namespace App\Notifications;

use App\Models\BusinessSetting;
use App\Models\GiftCard;

class GiftCardReceivedNotification
{
    public function __construct(private GiftCard $card) {}

    public function toInbox(object $notifiable): array
    {
        $from = $this->card->buyer_name ? ' od '.$this->card->buyer_name : '';

        return [
            'kind' => 'gift_card',
            'title' => 'Dobili ste poklon karticu'.$from,
            'body' => number_format($this->card->amount, 0, ',', '.').' din. u salonu '.BusinessSetting::current()->name.' — plaćate njome bilo koju uslugu, u celosti ili delimično.',
            'link' => '/profile',
        ];
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['appointment_id', 'amount', 'method', 'created_by'])]
class AppointmentPayment extends Model
{
    protected function casts(): array
    {
        return ['amount' => 'float'];
    }
}

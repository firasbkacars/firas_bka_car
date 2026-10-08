<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EtatLieu extends Model
{
    protected $table = 'etats_lieux';

    protected $fillable = [
        'reservation_id',
        'type',
        'photos',
        'notes',
        'agent_id',
    ];

    protected $casts = [
        'photos' => 'array',
    ];

    public function reservation()
    {
        return $this->belongsTo(Reservation::class);
    }

    public function agent()
    {
        return $this->belongsTo(User::class, 'agent_id');
    }
}

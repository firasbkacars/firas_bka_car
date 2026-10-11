<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CautionHistory extends Model
{
    protected $table = 'caution_histories';

    protected $fillable = [
        'reservation_id',
        'ancien_statut',
        'nouveau_statut',
        'montant_caution',
        'montant_retenu',
        'motif',
        'agent_id',
    ];

    protected $casts = [
        'montant_caution' => 'decimal:2',
        'montant_retenu' => 'decimal:2',
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

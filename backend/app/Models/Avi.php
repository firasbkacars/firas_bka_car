<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Avi extends Model
{
    use HasFactory;

    protected $fillable = [
        'client_id',
        'vehicule_id',
        'note',
        'commentaire',
        'photo_chemin',
        'statut',
    ];

    public function client()
    {
        return $this->belongsTo(Client::class);
    }

    public function vehicule()
    {
        return $this->belongsTo(Vehicule::class);
    }
}

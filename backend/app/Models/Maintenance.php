<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Maintenance extends Model
{
    use HasFactory;

    protected $fillable = [
        'vehicule_id',
        'type',
        'description',
        'date_prevue',
        'date_realisee',
        'cout',
        'statut',
        'notes',
    ];

    protected $casts = [
        'date_prevue' => 'date',
        'date_realisee' => 'date',
        'cout' => 'decimal:2',
    ];

    public function vehicule()
    {
        return $this->belongsTo(Vehicule::class);
    }

    public function scopeAVenir($query)
    {
        return $query->where('date_prevue', '<=', now()->addDays(7))
            ->where('statut', '!=', 'terminee');
    }

    public function scopeEnRetard($query)
    {
        return $query->where('date_prevue', '<', now())
            ->where('statut', '!=', 'terminee');
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FournisseurContrat extends Model
{
    use HasFactory;

    protected $table = 'contrats_fournisseurs';

    protected $fillable = [
        'titre',
        'fournisseur',
        'reference',
        'date_debut',
        'date_expiration',
        'montant',
        'vehicule_id',
        'notes',
        'rappel_envoye_le',
    ];

    protected $casts = [
        'date_debut' => 'date',
        'date_expiration' => 'date',
        'montant' => 'decimal:2',
        'rappel_envoye_le' => 'date',
    ];

    public function vehicule()
    {
        return $this->belongsTo(Vehicule::class);
    }

    public function expiree(): bool
    {
        return $this->date_expiration !== null && $this->date_expiration->lt(today());
    }

    public function joursAvantExpiration(): ?int
    {
        return $this->date_expiration
            ? (int) today()->diffInDays($this->date_expiration, false)
            : null;
    }
}

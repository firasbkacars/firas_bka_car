<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Vehicule extends Model
{
    use HasFactory;

    protected $fillable = [
        'marque',
        'modele',
        'categorie',
        'annee',
        'transmission',
        'carburant',
        'places',
        'puissance',
        'kilometrage',
        'prix_jour',
        'montant_caution',
        'statut',
        'photos',
        'equipements',
        'populaire',
        'agence_id',
    ];

    protected $casts = [
        'photos' => 'array',
        'equipements' => 'array',
        'populaire' => 'boolean',
        'prix_jour' => 'decimal:2',
        'montant_caution' => 'decimal:2',
    ];

    public function reservations()
    {
        return $this->hasMany(Reservation::class);
    }

    protected static function booted(): void
    {
        static::deleting(function (Vehicule $vehicule) {
            if ($vehicule->reservations()->whereNotIn('statut', ['annulee'])->exists()) {
                abort(422, 'Impossible de supprimer ce vehicule : des reservations actives existent.');
            }
        });
    }

    public function avis()
    {
        return $this->hasMany(Avi::class);
    }

    public function agence()
    {
        return $this->belongsTo(Agence::class);
    }

    public function scopeDisponibles($query)
    {
        return $query->where('statut', 'disponible');
    }

    public function scopeFiltres($query, $filters)
    {
        if (! empty($filters['categorie'])) {
            $query->where('categorie', $filters['categorie']);
        }
        if (! empty($filters['marque'])) {
            $query->where('marque', $filters['marque']);
        }
        if (! empty($filters['transmission'])) {
            $query->where('transmission', $filters['transmission']);
        }
        if (! empty($filters['carburant'])) {
            $query->where('carburant', $filters['carburant']);
        }
        if (! empty($filters['prix_min'])) {
            $query->where('prix_jour', '>=', $filters['prix_min']);
        }
        if (! empty($filters['prix_max'])) {
            $query->where('prix_jour', '<=', $filters['prix_max']);
        }
        if (! empty($filters['agence_id'])) {
            $query->where('agence_id', $filters['agence_id']);
        }

        return $query;
    }
}

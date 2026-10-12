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
        'description',
        'categorie',
        'annee',
        'transmission',
        'carburant',
        'places',
        'puissance',
        'kilometrage',
        'prix_jour',
        'montant_caution',
        'date_expiration_assurance',
        'date_expiration_carte_grise',
        'assurance_rappel_envoye_le',
        'carte_grise_rappel_envoye_le',
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
        'date_expiration_assurance' => 'date',
        'date_expiration_carte_grise' => 'date',
        'assurance_rappel_envoye_le' => 'date',
        'carte_grise_rappel_envoye_le' => 'date',
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

    /**
     * Un contrat non renseigne n'est pas bloque : les vehicules existants
     * n'ont pas de dates et doivent rester louables.
     * Le contrat reste valable le jour de son expiration.
     */
    public function assuranceExpiree(): bool
    {
        return $this->date_expiration_assurance !== null
            && $this->date_expiration_assurance->lt(today());
    }

    public function carteGriseExpiree(): bool
    {
        return $this->date_expiration_carte_grise !== null
            && $this->date_expiration_carte_grise->lt(today());
    }

    public function contratExpire(): bool
    {
        return $this->assuranceExpiree() || $this->carteGriseExpiree();
    }

    public function joursAvantExpirationAssurance(): ?int
    {
        return $this->date_expiration_assurance
            ? (int) today()->diffInDays($this->date_expiration_assurance, false)
            : null;
    }

    public function joursAvantExpirationCarteGrise(): ?int
    {
        return $this->date_expiration_carte_grise
            ? (int) today()->diffInDays($this->date_expiration_carte_grise, false)
            : null;
    }

    /** Vehicules louables : contrat non expire (ou non renseigne). */
    public function scopeContratsValides($query)
    {
        return $query->where(function ($q) {
            $q->whereNull('date_expiration_assurance')
                ->orWhereDate('date_expiration_assurance', '>=', today());
        })->where(function ($q) {
            $q->whereNull('date_expiration_carte_grise')
                ->orWhereDate('date_expiration_carte_grise', '>=', today());
        });
    }

    public function scopeContratsExpires($query)
    {
        return $query->where(function ($q) {
            $q->whereNotNull('date_expiration_assurance')
                ->whereDate('date_expiration_assurance', '<', today())
                ->orWhere(function ($sub) {
                    $sub->whereNotNull('date_expiration_carte_grise')
                        ->whereDate('date_expiration_carte_grise', '<', today());
                });
        });
    }

    /** Contrats expires ou arrivant a echeance dans les $delai jours. */
    public function scopeContratsEcheance($query, int $delai)
    {
        $seuil = today()->addDays($delai);

        return $query->where(function ($q) use ($seuil) {
            $q->whereNotNull('date_expiration_assurance')
                ->whereDate('date_expiration_assurance', '<=', $seuil)
                ->orWhere(function ($sub) use ($seuil) {
                    $sub->whereNotNull('date_expiration_carte_grise')
                        ->whereDate('date_expiration_carte_grise', '<=', $seuil);
                });
        });
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

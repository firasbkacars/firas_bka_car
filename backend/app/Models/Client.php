<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class Client extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'nom_complet',
        'password',
        'telephone',
        'email',
        'cin',
        'passeport',
        'adresse',
        'photo_profil',
        'permis_conduire',
        'permis_statut',
        'permis_rejet_motif',
        'date_expiration_permis',
        'permis_rappel_envoye_le',
        'email_verified_at',
        'email_verification_token',
        'statut',
        'nombre_locations',
        'points_fidelite',
        'niveau_fidelite',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'date_expiration_permis' => 'date',
            'permis_rappel_envoye_le' => 'date',
        ];
    }

    public function reservations()
    {
        return $this->hasMany(Reservation::class);
    }

    public function avis()
    {
        return $this->hasMany(Avi::class);
    }

    public function favoris()
    {
        return $this->hasMany(Favori::class);
    }

    /**
     * Le permis est-il expire (date passee) ? Utilise par les gardes de
     * reservation et par la commande permis:verifier.
     */
    public function permisExpire(): bool
    {
        return $this->date_expiration_permis !== null
            && $this->date_expiration_permis->isPast();
    }

    protected static function booted(): void
    {
        static::deleting(function (Client $client) {
            if ($client->reservations()->whereNotIn('statut', ['annulee'])->exists()) {
                abort(422, 'Impossible de supprimer ce client : des reservations actives existent.');
            }
        });
    }
}

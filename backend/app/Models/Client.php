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
        'code_parrainage',
        'parrain_id',
        'parrain_recompense',
        'statut',
        'nombre_locations',
        'points_fidelite',
        'niveau_fidelite',
        'reservations_vues_le',
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
            'parrain_recompense' => 'boolean',
            'reservations_vues_le' => 'datetime',
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

    public function parrain()
    {
        return $this->belongsTo(Client::class, 'parrain_id');
    }

    public function filleuls()
    {
        return $this->hasMany(Client::class, 'parrain_id');
    }

    public function messages()
    {
        return $this->hasMany(Message::class);
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

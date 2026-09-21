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
        'permis_conduire',
        'permis_statut',
        'permis_rejet_motif',
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

    protected static function booted(): void
    {
        static::deleting(function (Client $client) {
            if ($client->reservations()->whereNotIn('statut', ['annulee'])->exists()) {
                abort(422, 'Impossible de supprimer ce client : des reservations actives existent.');
            }
        });
    }
}

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
        'est_etranger',
        'carte_nationale',
        'carte_nationale_statut',
        'carte_nationale_rejet_motif',
        'passeport_document',
        'passeport_statut',
        'passeport_rejet_motif',
        'adresse',
        'photo_profil',
        'permis_conduire',
        'permis_statut',
        'permis_rejet_motif',
        'date_expiration_permis',
        'permis_rappel_envoye_le',
        'email_verified_at',
        'email_verification_token',
        'invitation_token',
        'invitation_expire_le',
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
        'invitation_token',
        'invitation_expire_le',
    ];

    protected $appends = [
        'document_identite',
        'compte_active',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'est_etranger' => 'boolean',
            'date_expiration_permis' => 'date',
            'permis_rappel_envoye_le' => 'date',
            'parrain_recompense' => 'boolean',
            'reservations_vues_le' => 'datetime',
            'invitation_expire_le' => 'datetime',
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
     * Un compte est actif des qu'un mot de passe a ete defini. Les clients
     * crees par un agent (reservation telephone) restent inactifs tant qu'ils
     * n'ont pas utilise leur lien d'invitation.
     */
    public function getCompteActiveAttribute(): bool
    {
        return ! empty($this->password);
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

    /**
     * Document d'identite impose par la nationalite declaree.
     *
     * @return array{type:string, champ:string, statut:string, motif:string, label:string, accord:string}
     */
    public function documentIdentiteRequis(): array
    {
        if ($this->est_etranger) {
            return [
                'type' => 'passeport',
                'champ' => 'passeport_document',
                'statut' => 'passeport_statut',
                'motif' => 'passeport_rejet_motif',
                'label' => 'passeport',
                'accord' => 'valide',
            ];
        }

        return [
            'type' => 'carte_nationale',
            'champ' => 'carte_nationale',
            'statut' => 'carte_nationale_statut',
            'motif' => 'carte_nationale_rejet_motif',
            'label' => 'carte nationale',
            'accord' => 'validee',
        ];
    }

    public function documentIdentiteEstValide(): bool
    {
        $document = $this->documentIdentiteRequis();

        return ! empty($this->{$document['champ']})
            && $this->{$document['statut']} === 'valide';
    }

    /**
     * Etat lisible par le web et le mobile sans dupliquer la logique de
     * nationalite dans chaque interface.
     */
    public function getDocumentIdentiteAttribute(): array
    {
        $document = $this->documentIdentiteRequis();
        $chemin = $this->{$document['champ']};

        return [
            'type' => $document['type'],
            'label' => $document['label'],
            'document' => $chemin,
            'statut' => $chemin ? ($this->{$document['statut']} ?: 'en_attente') : 'non_fourni',
            'motif' => $this->{$document['motif']},
        ];
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

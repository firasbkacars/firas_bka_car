<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Paiement extends Model
{
    use HasFactory;

    // --- Statuts -----------------------------------------------------------
    public const STATUT_EN_ATTENTE = 'en_attente';
    public const STATUT_PAYE = 'paye';
    public const STATUT_ECHOUE = 'echoue';
    public const STATUT_ANNULE = 'annule';
    public const STATUT_EXPIRE = 'expire';
    public const STATUT_SUSPECT = 'suspect';
    public const STATUT_REMBOURSE = 'rembourse';
    public const STATUT_REMBOURSE_PARTIEL = 'rembourse_partiel';

    public const STATUTS = [
        self::STATUT_EN_ATTENTE,
        self::STATUT_PAYE,
        self::STATUT_ECHOUE,
        self::STATUT_ANNULE,
        self::STATUT_EXPIRE,
        self::STATUT_SUSPECT,
        self::STATUT_REMBOURSE,
        self::STATUT_REMBOURSE_PARTIEL,
    ];

    // --- Types d'ecriture --------------------------------------------------
    public const TYPE_ACOMPTE = 'acompte';
    public const TYPE_SOLDE = 'solde';
    public const TYPE_COMPLEMENT = 'complement';
    public const TYPE_CAUTION = 'caution';
    public const TYPE_REMBOURSEMENT = 'remboursement';

    public const TYPES = [
        self::TYPE_ACOMPTE,
        self::TYPE_SOLDE,
        self::TYPE_COMPLEMENT,
        self::TYPE_CAUTION,
        self::TYPE_REMBOURSEMENT,
    ];

    public const METHODES = ['especes', 'cmi'];

    protected $fillable = [
        'reservation_id',
        'montant',
        'methode',
        'statut',
        'date_paiement',
        'transaction_id',
        'reference_externe',
        'gateway',
        'devise',
        'type',
        'code_erreur_gateway',
        'message_erreur',
        'carte_marque',
        'carte_derniers4',
        'client_ip',
        'idempotency_key',
        'tentatives',
        'initie_le',
        'verifie_le',
        'rembourse_le',
        'rembourse_transaction_id',
        'paiement_source_id',
        'note_admin',
        'created_by',
    ];

    protected $casts = [
        'montant' => 'decimal:2',
        'date_paiement' => 'datetime',
        'initie_le' => 'datetime',
        'verifie_le' => 'datetime',
        'rembourse_le' => 'datetime',
        'tentatives' => 'integer',
    ];

    /** Affiches par l'admin et les clients. */
    protected $appends = [
        'montant_signe',
        'carte_masquee',
        'statut_affichage',
        'est_remboursement',
        'rembourse_sur',
    ];

    // ------------------------------------------------------------------ scopes
    public function scopeEnAttente(Builder $q): Builder
    {
        return $q->where('statut', self::STATUT_EN_ATTENTE);
    }

    public function scopePayes(Builder $q): Builder
    {
        return $q->where('statut', self::STATUT_PAYE);
    }

    /** Ecritures d'encaissement (exclut les remboursements). */
    public function scopeEncaissements(Builder $q): Builder
    {
        return $q->where('type', '!=', self::TYPE_REMBOURSEMENT);
    }

    /** Ecritures de remboursement. */
    public function scopeRemboursements(Builder $q): Builder
    {
        return $q->where('type', self::TYPE_REMBOURSEMENT);
    }

    /**
     * Solde net d'une reservation : encaissements - remboursements.
     * Un remboursement est une ecriture NEGATIVE, pas un encaissement positif.
     */
    public function scopeNet(Builder $q): Builder
    {
        return $q->selectRaw(self::revenusNetSql('montant').' as net');
    }

    /**
     * Expression SQL de revenu net : les remboursements sont soustraits.
     *
     * Historiquement, les remboursements etaient enregistres comme des
     * encaissements 'paye' positifs, ce qui SUR-EVALUAIT les revenus.
     */
    public static function revenusNetSql(string $column = 'montant'): string
    {
        return "COALESCE(SUM(CASE WHEN type = 'remboursement' THEN -ABS({$column}) ELSE {$column} END), 0)";
    }

    // -------------------------------------------------------------- accessors
    public function getEstRemboursementAttribute(): bool
    {
        return $this->type === self::TYPE_REMBOURSEMENT;
    }

    public function getEstPayeAttribute(): bool
    {
        return $this->statut === self::STATUT_PAYE;
    }

    /** Montant signe pour l'affichage et le reporting. */
    public function getMontantSigneAttribute(): float
    {
        $m = (float) $this->montant;

        return $this->estRemboursement ? -abs($m) : $m;
    }

    public function getCarteMasqueeAttribute(): ?string
    {
        if (! $this->carte_derniers4) {
            return null;
        }

        return ($this->carte_marque ? ucfirst($this->carte_marque).' ' : '**** ').$this->carte_derniers4;
    }

    /** Total deja rembourse sur cet encaissement. */
    public function getRembourseSurAttribute(): float
    {
        return (float) Paiement::where('paiement_source_id', $this->id)
            ->where('statut', self::STATUT_PAYE)
            ->sum('montant');
    }

    /**
     * Statut a afficher.
     *
     * Un encaissement rembourse garde statut='paye' en base : c'est l'ecriture
     * de remboursement (type='remboursement') qui compense, ce qui conserve
     * l'historique comptable et les calculs de revenus nets.
     */
    public function getStatutAffichageAttribute(): string
    {
        if ($this->statut !== self::STATUT_PAYE) {
            return (string) $this->statut;
        }

        $rembourse = $this->rembourse_sur;

        if ($rembourse <= 0) {
            return self::STATUT_PAYE;
        }

        return $rembourse + 0.009 >= (float) $this->montant
            ? self::STATUT_REMBOURSE
            : self::STATUT_REMBOURSE_PARTIEL;
    }

    public function getEstRembourseAttribute(): bool
    {
        return $this->statut_affichage === self::STATUT_REMBOURSE;
    }

    public function getEstRemboursePartiellementAttribute(): bool
    {
        return $this->statut_affichage === self::STATUT_REMBOURSE_PARTIEL;
    }

    // ------------------------------------------------------------- relations
    public function reservation()
    {
        return $this->belongsTo(Reservation::class);
    }

    public function createur()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function source()
    {
        return $this->belongsTo(self::class, 'paiement_source_id');
    }

    public function remboursements()
    {
        return $this->hasMany(self::class, 'paiement_source_id');
    }
}

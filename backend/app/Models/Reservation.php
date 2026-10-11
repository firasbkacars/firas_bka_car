<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Reservation extends Model
{
    use HasFactory;

    protected $fillable = [
        'numero',
        'client_id',
        'vehicule_id',
        'agence_id',
        'date_debut',
        'date_fin',
        'lieu_prise',
        'lieu_retour',
        'prix_total',
        'acompte',
        'montant_caution',
        'caution_statut',
        'motif_rejet_caution',
        'politique_annulation',
        'montant_rembourse',
        'conducteur_additionnel_nom',
        'conducteur_additionnel_telephone',
        'conducteur_additionnel_permis',
        'supplement_conducteur',
        'statut',
        'mode_paiement',
        'notes',
        'code_promo',
        'remise',
    ];

    protected $casts = [
        'date_debut' => 'datetime',
        'date_fin' => 'datetime',
        'prix_total' => 'decimal:2',
        'acompte' => 'decimal:2',
        'montant_caution' => 'decimal:2',
        'montant_rembourse' => 'decimal:2',
        'supplement_conducteur' => 'decimal:2',
        'remise' => 'decimal:2',
    ];

    /**
     * Exposes aux clients et a l'admin pour afficher l'etat reel du paiement
     * (deja le cas dans le modele, mais invisibles en JSON sans $appends).
     */
    protected $appends = [
        'acompte_paye',
        'acompte_restant',
        'rembourse',
        'solde_restant',
        'est_paye_integralement',
        'est_payable_en_ligne',
    ];

    public function client()
    {
        return $this->belongsTo(Client::class);
    }

    public function vehicule()
    {
        return $this->belongsTo(Vehicule::class);
    }

    public function agence()
    {
        return $this->belongsTo(Agence::class);
    }

    public function paiements()
    {
        return $this->hasMany(Paiement::class);
    }

    public function etatsLieux()
    {
        return $this->hasMany(EtatLieu::class);
    }

    // --------------------------------------------------- acompte / solde ----

    /**
     * Montant reellement conserve au titre de l'acompte.
     *
     * Net : encaissements confirmes moins les remboursements. Un
     * remboursement est une ecriture de type 'remboursement', jamais un
     * encaissement positif.
     */
    public function getAcomptePayeAttribute(): float
    {
        $encaisse = (float) $this->paiements()
            ->payes()
            ->encaissements()
            ->sum('montant');

        $rembourse = (float) $this->paiements()
            ->payes()
            ->remboursements()
            ->sum('montant');

        return max(0, $encaisse - $rembourse);
    }

    public function getRembourseAttribute(): float
    {
        return (float) abs($this->paiements()
            ->payes()
            ->remboursements()
            ->sum('montant'));
    }

    public function getSoldeRestantAttribute(): float
    {
        return max(0, (float) $this->prix_total - $this->acompte_paye);
    }

    public function getAcompteRestantAttribute(): float
    {
        return max(0, (float) $this->acompte - $this->acompte_paye);
    }

    public function getEstPayeIntegralementAttribute(): bool
    {
        return $this->acompte_paye >= (float) $this->acompte;
    }

    /** Dernier paiement CMI en attente, si la reservation est payable en ligne. */
    public function getPaiementCmiEnAttenteAttribute(): ?Paiement
    {
        return $this->paiements()
            ->where('methode', 'cmi')
            ->enAttente()
            ->latest()
            ->first();
    }

    public function getEstPayableEnLigneAttribute(): bool
    {
        return ! $this->estPayeIntegralement
            && ! in_array($this->statut, ['annulee', 'terminee'], true);
    }

    public static function genererNumero()
    {
        $date = now()->format('ymd');
        $dernier = self::where('numero', 'like', "FBC-{$date}-%")
            ->orderBy('numero', 'desc')
            ->first();

        if ($dernier) {
            $dernierNum = intval(substr($dernier->numero, -5));
            $nouveauNum = str_pad($dernierNum + 1, 5, '0', STR_PAD_LEFT);
        } else {
            $nouveauNum = '00001';
        }

        return "FBC-{$date}-{$nouveauNum}";
    }
}

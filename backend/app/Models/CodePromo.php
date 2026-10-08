<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CodePromo extends Model
{
    use HasFactory;

    protected $table = 'codes_promo';

    protected $fillable = [
        'code',
        'type',
        'valeur',
        'date_expiration',
        'usage_max',
        'usage_actuel',
        'actif',
    ];

    protected $casts = [
        'valeur' => 'decimal:2',
        'date_expiration' => 'datetime',
        'usage_max' => 'integer',
        'usage_actuel' => 'integer',
        'actif' => 'boolean',
    ];

    public function isValid(): bool
    {
        if (! $this->actif) {
            return false;
        }

        if ($this->date_expiration && $this->date_expiration->isPast()) {
            return false;
        }

        if ($this->usage_actuel >= $this->usage_max) {
            return false;
        }

        return true;
    }

    public function calculateDiscount(float $montant): float
    {
        if ($this->type === 'pourcentage') {
            return $montant * ($this->valeur / 100);
        }

        return min($this->valeur, $montant);
    }
}

<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreReservationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'vehicule_id' => ['required', 'exists:vehicules,id'],
            'agence_id' => ['nullable', 'exists:agences,id'],
            'date_debut' => ['required', 'date', 'after:now'],
            'date_fin' => ['required', 'date', 'after:date_debut'],
            'lieu_prise' => ['required', 'string', 'max:255'],
            'lieu_retour' => ['required', 'string', 'max:255'],
            'mode_paiement' => ['required', 'in:especes,cmi'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'code_promo' => ['nullable', 'string', 'max:50'],
            'conducteur_additionnel_nom' => ['nullable', 'string', 'max:255'],
            'conducteur_additionnel_telephone' => ['nullable', 'string', 'max:20'],
            'conducteur_additionnel_permis' => ['nullable', 'string', 'max:50'],
        ];
    }

    public function messages(): array
    {
        return [
            'vehicule_id.required' => 'Le véhicule est obligatoire.',
            'vehicule_id.exists' => 'Ce véhicule n\'existe pas.',
            'date_debut.required' => 'La date de prise en charge est obligatoire.',
            'date_debut.after' => 'La date de prise en charge doit être dans le futur.',
            'date_fin.required' => 'La date de retour est obligatoire.',
            'date_fin.after' => 'La date de retour doit être après la date de prise en charge.',
            'lieu_prise.required' => 'Le lieu de prise en charge est obligatoire.',
            'lieu_retour.required' => 'Le lieu de retour est obligatoire.',
            'mode_paiement.required' => 'Le mode de paiement est obligatoire.',
            'mode_paiement.in' => 'Mode de paiement invalide.',
        ];
    }
}

<?php

namespace App\Http\Requests;

use App\Models\Paiement;
use App\Support\NormaliseurChampsClient;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Reservation saisie par un agent (reservation prise par telephone).
 *
 * Deux modes exclusifs : rattacher la reservation a un client existant
 * (`client_id`) ou creer le client dans la foulee (`client`). Les pieces
 * justificatives ne sont pas exigees ici : l'agent engage sa responsabilite
 * et pourra les completer depuis la fiche client.
 */
class StoreAdminReservationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $client = $this->input('client');

        if (! is_array($client)) {
            return;
        }

        if (array_key_exists('telephone', $client)) {
            $client['telephone'] = NormaliseurChampsClient::telephone($client['telephone']);
        }

        foreach (['cin', 'passeport'] as $champ) {
            if (array_key_exists($champ, $client)) {
                $client[$champ] = NormaliseurChampsClient::pieceIdentite($client[$champ]);
            }
        }

        $this->merge(['client' => $client]);
    }

    public function rules(): array
    {
        return [
            'client_id' => ['nullable', 'integer', 'exists:clients,id', 'required_without:client'],
            'client' => ['nullable', 'array', 'required_without:client_id'],
            'client.nom_complet' => ['required_with:client', 'nullable', 'string', 'min:2', 'max:255'],
            'client.telephone' => [
                'required_with:client',
                'nullable',
                'string',
                'regex:/^(\+212|0)[5-7]\d{8}$/',
                'unique:clients,telephone',
            ],
            'client.email' => ['nullable', 'email:rfc', 'max:255', 'unique:clients,email'],
            'client.cin' => ['nullable', 'string', 'max:20'],
            'client.passeport' => ['nullable', 'string', 'max:20'],
            'client.est_etranger' => ['nullable', 'boolean'],
            'client.adresse' => ['nullable', 'string', 'max:255'],

            'vehicule_id' => ['required', 'integer', 'exists:vehicules,id'],
            'agence_id' => ['nullable', 'integer', 'exists:agences,id'],
            // Une reservation telephone peut demarrer dans la journee : la
            // contrainte porte sur le jour, pas sur l'heure exacte.
            'date_debut' => ['required', 'date', 'after_or_equal:today'],
            'date_fin' => ['required', 'date', 'after:date_debut'],
            'mode_paiement' => ['required', Rule::in(Paiement::METHODES)],
            'notes' => ['nullable', 'string', 'max:1000'],
            'code_promo' => ['nullable', 'string', 'max:50'],
            'conducteur_additionnel_nom' => ['nullable', 'string', 'max:255'],
            'conducteur_additionnel_telephone' => ['nullable', 'string', 'max:20'],
            'conducteur_additionnel_permis' => ['required_with:conducteur_additionnel_nom', 'nullable', 'string', 'max:50'],
            'assurance_conducteur_additionnel' => ['nullable', 'boolean'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            if ($this->filled('client_id') && $this->filled('client')) {
                $validator->errors()->add(
                    'client',
                    'Choisissez un client existant ou creez un nouveau client, pas les deux.'
                );
            }
        });
    }

    public function messages(): array
    {
        return [
            'client_id.required_without' => 'Selectionnez un client ou renseignez un nouveau client.',
            'client.required_without' => 'Selectionnez un client ou renseignez un nouveau client.',
            'client.nom_complet.required_with' => 'Le nom du client est obligatoire.',
            'client.telephone.required_with' => 'Le telephone du client est obligatoire.',
            'client.telephone.regex' => 'Le telephone doit etre un numero marocain valide.',
            'client.telephone.unique' => 'Un client utilise deja ce numero de telephone.',
            'client.email.unique' => 'Un client utilise deja cette adresse email.',
            'vehicule_id.required' => 'Le vehicule est obligatoire.',
            'vehicule_id.exists' => 'Ce vehicule n\'existe pas.',
            'date_debut.required' => 'La date de prise en charge est obligatoire.',
            'date_debut.after_or_equal' => 'La date de prise en charge ne peut pas etre anterieure a aujourd\'hui.',
            'date_fin.required' => 'La date de retour est obligatoire.',
            'date_fin.after' => 'La date de retour doit etre posterieure a la date de prise en charge.',
            'mode_paiement.required' => 'Le mode de paiement est obligatoire.',
            'mode_paiement.in' => 'Mode de paiement invalide.',
            'conducteur_additionnel_permis.required_with' => 'Le numero de permis du conducteur additionnel est obligatoire.',
        ];
    }
}

<?php

namespace App\Http\Requests;

use App\Support\NormaliseurChampsClient;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class RegisterClientRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $donnees = [];

        if ($this->exists('telephone')) {
            $donnees['telephone'] = NormaliseurChampsClient::telephone($this->input('telephone'));
        }

        foreach (['cin', 'passeport'] as $champ) {
            if ($this->exists($champ)) {
                $donnees[$champ] = NormaliseurChampsClient::pieceIdentite($this->input($champ));
            }
        }

        if ($donnees !== []) {
            $this->merge($donnees);
        }
    }

    public function rules(): array
    {
        return [
            'nom_complet' => ['required', 'string', 'max:255', 'min:2'],
            'email' => ['required', 'email:rfc', 'max:255', 'unique:clients,email'],
            'telephone' => ['required', 'string', 'regex:/^(\+212|0)[5-7]\d{8}$/', 'unique:clients,telephone'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'cin' => ['nullable', 'string', 'regex:/^[A-Z]{1,2}\d{4,6}$/', 'max:20'],
            'est_etranger' => ['sometimes', 'boolean'],
            'passeport' => ['nullable', 'string', 'regex:/^[A-Z0-9]{6,20}$/', 'max:20'],
            'adresse' => ['nullable', 'string', 'max:255'],
            'code_parrainage' => ['nullable', 'string', 'max:12',
                Rule::exists('clients', 'code_parrainage')],
        ];
    }

    public function messages(): array
    {
        return [
            'nom_complet.required' => 'Le nom complet est obligatoire.',
            'nom_complet.min' => 'Le nom doit contenir au moins 2 caractères.',
            'email.required' => 'L\'email est obligatoire.',
            'email.email' => 'Veuillez entrer un email valide.',
            'email.unique' => 'Un compte existe déjà avec cet email. Si vous avez réservé par téléphone, activez votre compte.',
            'telephone.required' => 'Le numéro de téléphone est obligatoire.',
            'telephone.regex' => 'Le numéro de téléphone marocain doit être au format 06XXXXXXXX ou +2126XXXXXXXX.',
            'telephone.unique' => 'Un compte existe déjà avec ce numéro. Si vous avez réservé par téléphone, activez votre compte.',
            'password.required' => 'Le mot de passe est obligatoire.',
            'password.min' => 'Le mot de passe doit contenir au moins 8 caractères.',
            'password.confirmed' => 'La confirmation du mot de passe ne correspond pas.',
            'cin.regex' => 'Le CIN doit contenir 1 à 2 lettres majuscules suivies de 4 à 6 chiffres (ex: A12345 ou AB123456).',
            'passeport.regex' => 'Le numero de passeport doit contenir 6 a 20 lettres majuscules ou chiffres.',
            'code_parrainage.exists' => 'Ce code de parrainage n\'existe pas.',
        ];
    }
}

<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RegisterClientRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'nom_complet' => ['required', 'string', 'max:255', 'min:2'],
            'email' => ['required', 'email:rfc', 'max:255', 'unique:clients,email'],
            'telephone' => ['required', 'string', 'regex:/^(\+212|0)[5-7]\d{8}$/', 'unique:clients,telephone'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'cin' => ['nullable', 'string', 'regex:/^[A-Z]{1,2}\d{4,6}$/', 'max:20'],
            'adresse' => ['nullable', 'string', 'max:255'],
        ];
    }

    public function messages(): array
    {
        return [
            'nom_complet.required' => 'Le nom complet est obligatoire.',
            'nom_complet.min' => 'Le nom doit contenir au moins 2 caractères.',
            'email.required' => 'L\'email est obligatoire.',
            'email.email' => 'Veuillez entrer un email valide.',
            'email.unique' => 'Cet email est déjà utilisé.',
            'telephone.required' => 'Le numéro de téléphone est obligatoire.',
            'telephone.regex' => 'Le numéro de téléphone marocain doit être au format 06XXXXXXXX ou +2126XXXXXXXX.',
            'telephone.unique' => 'Ce numéro de téléphone est déjà utilisé.',
            'password.required' => 'Le mot de passe est obligatoire.',
            'password.min' => 'Le mot de passe doit contenir au moins 8 caractères.',
            'password.confirmed' => 'La confirmation du mot de passe ne correspond pas.',
            'cin.regex' => 'Le CIN doit contenir 1 à 2 lettres majuscules suivies de 4 à 6 chiffres (ex: A12345 ou AB123456).',
        ];
    }
}

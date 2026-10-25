<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\LoginClientRequest;
use App\Http\Requests\RegisterClientRequest;
use App\Mail\PermisValidation;
use App\Models\Client;
use App\Services\DocumentPhotoVerifier;
use App\Services\FideliteService;
use App\Services\ParrainageService;
use App\Support\NormaliseurChampsClient;
use App\Support\QueuedMail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\PersonalAccessToken;

class ClientAuthController extends Controller
{
    private const MAX_ATTEMPTS = 5;

    private const LOCKOUT_MINUTES = 15;

    /** A4 : duree de vie d'un token client. */
    public const TOKEN_TTL_HOURS = 24;

    public function register(RegisterClientRequest $request)
    {
        $validated = $request->validated();

        $client = Client::create([
            'nom_complet' => $validated['nom_complet'],
            'email' => $validated['email'],
            'telephone' => $validated['telephone'],
            'password' => $validated['password'],
            'cin' => $validated['cin'] ?? null,
            'passeport' => $validated['passeport'] ?? null,
            'est_etranger' => $validated['est_etranger'] ?? false,
            'adresse' => $validated['adresse'] ?? null,
        ]);

        $parrainage = app(ParrainageService::class);
        $parrainage->genererCode($client);

        if (! empty($validated['code_parrainage'])) {
            $parrainage->enregistrerParrainage($client, $validated['code_parrainage'], app(FideliteService::class));
        }

        $client->refresh();

        $token = $client->createToken('client-token', ['*'], now()->addHours(self::TOKEN_TTL_HOURS))->plainTextToken;

        return response()->json([
            'client' => $client,
            'token' => $token,
        ], 201);
    }

    public function login(LoginClientRequest $request)
    {
        $validated = $request->validated();
        $email = $validated['email'];
        $ip = $request->ip();

        $lockKey = "login_lock:client:{$ip}";
        $attemptsKey = "login_attempts:client:{$ip}";

        if (Cache::has($lockKey)) {
            $ttl = Cache::get($lockKey);

            return response()->json([
                'message' => 'Trop de tentatives. Reessayez dans '.self::LOCKOUT_MINUTES.' minutes.',
                'locked_until' => $ttl,
            ], 429);
        }

        $client = Client::where('email', $email)->first();

        if (! $client || ! Hash::check($validated['password'], $client->password)) {
            $attempts = Cache::increment($attemptsKey);

            if ($attempts === 1) {
                Cache::put($attemptsKey, 1, now()->addMinutes(self::LOCKOUT_MINUTES));
            }

            Log::warning('Client login failed', [
                'email' => $email,
                'ip' => $ip,
                'attempts' => $attempts,
            ]);

            if ($attempts >= self::MAX_ATTEMPTS) {
                Cache::put($lockKey, now()->addMinutes(self::LOCKOUT_MINUTES), now()->addMinutes(self::LOCKOUT_MINUTES));
                Cache::forget($attemptsKey);

                Log::warning('Client account locked', [
                    'email' => $email,
                    'ip' => $ip,
                ]);
            }

            return response()->json(['message' => 'Identifiants incorrects'], 401);
        }

        Cache::forget($attemptsKey);

        $token = $client->createToken('client-token', ['*'], now()->addHours(self::TOKEN_TTL_HOURS))->plainTextToken;

        Log::info('Client login successful', [
            'client_id' => $client->id,
            'ip' => $ip,
        ]);

        return response()->json([
            'client' => $client,
            'token' => $token,
        ]);
    }

    public function logout(Request $request)
    {
        $token = $request->user()->currentAccessToken();

        if ($token instanceof PersonalAccessToken) {
            $token->delete();
        }

        return response()->json(['message' => 'DÃ©connectÃ©']);
    }

    public function profile(Request $request)
    {
        return response()->json($request->user());
    }

    public function updateProfile(Request $request)
    {
        $client = $request->user();

        $this->normaliserChampsProfil($request);

        // Regles sous forme de tableaux : la regex du telephone contient une
        // alternative (`\+212|0`). Sous forme de chaine, Laravel decoupe sur
        // ce `|` et transmet `/^(\+212` a preg_match, ce qui provoquait un
        // 500 sur chaque mise a jour de profil.
        $validated = $request->validate([
            'nom_complet' => ['sometimes', 'string', 'max:255', 'min:2'],
            'telephone' => ['sometimes', 'string', 'regex:/^(\+212|0)[5-7]\d{8}$/'],
            'email' => ['sometimes', 'email:rfc', 'max:255', 'unique:clients,email,'.$client->id],
            'cin' => ['nullable', 'string', 'regex:/^[A-Z]{1,2}\d{4,6}$/', 'max:20'],
            'passeport' => ['nullable', 'string', 'regex:/^[A-Z0-9]{6,20}$/', 'max:20'],
            'est_etranger' => ['sometimes', 'boolean'],
            'adresse' => ['nullable', 'string', 'max:255'],
            'date_expiration_permis' => ['nullable', 'date'],
        ], [
            'nom_complet.min' => 'Le nom complet doit contenir au moins 2 caracteres.',
            'telephone.regex' => 'Le telephone doit etre au format 0612345678 ou +212612345678.',
            'email.email' => "L'adresse email n'est pas valide.",
            'email.unique' => 'Cette adresse email est deja utilisee par un autre compte.',
            'cin.regex' => 'Le CIN doit contenir 1 ou 2 lettres suivies de 4 a 6 chiffres (ex. AB123456).',
            'passeport.regex' => 'Le passeport doit contenir entre 6 et 20 lettres ou chiffres.',
            'date_expiration_permis.date' => "La date d'expiration du permis n'est pas valide.",
        ]);

        $attributes = $validated;

        if (array_key_exists('date_expiration_permis', $validated)) {
            $nouvelle = $validated['date_expiration_permis'];
            $actuelle = $client->date_expiration_permis?->format('Y-m-d');

            if ($nouvelle !== $actuelle) {
                // Une nouvelle date re-ouvre le cycle de validation : sans
                // cela, un client pourrait prolonger lui-meme un permis expire.
                $attributes['permis_rappel_envoye_le'] = null;

                if ($client->permis_statut === 'expire') {
                    $attributes['permis_statut'] = 'en_attente';
                    $attributes['permis_rejet_motif'] = null;
                }
            }
        }

        $client->update($attributes);

        return response()->json($client);
    }

    public function uploadPhoto(Request $request)
    {
        $request->validate([
            'photo' => 'required|file|mimes:jpg,jpeg,png,webp|max:2048',
        ]);

        $client = $request->user();

        if ($client->photo_profil && Storage::disk('public')->exists($client->photo_profil)) {
            Storage::disk('public')->delete($client->photo_profil);
        }

        $path = $request->file('photo')->store('photos', 'public');

        $client->update(['photo_profil' => $path]);

        return response()->json([
            'message' => 'Photo de profil mise a jour',
            'photo_profil' => $path,
        ]);
    }

    public function uploadPermis(Request $request)
    {
        $request->validate([
            'permis_conduire' => 'required|file|mimes:jpg,jpeg,png,webp|max:5120',
        ], [
            'permis_conduire.required' => 'Selectionnez une photo de votre permis de conduire.',
            'permis_conduire.mimes' => 'Format non accepte : envoyez une photo JPG, PNG ou WebP.',
            'permis_conduire.max' => 'La photo du permis depasse 5 Mo.',
        ]);

        $client = $request->user();
        $file = $request->file('permis_conduire');

        app(DocumentPhotoVerifier::class)->verifier($file, 'permis_conduire');

        if ($client->permis_conduire && Storage::disk('public')->exists($client->permis_conduire)) {
            Storage::disk('public')->delete($client->permis_conduire);
        }

        $path = $file->store('permis', 'public');

        $client->update([
            'permis_conduire' => $path,
            'permis_statut' => 'en_attente',
            'permis_rejet_motif' => null,
        ]);

        return response()->json([
            'message' => 'Permis envoye. Il sera verifie par un agent.',
            'permis_conduire' => $path,
            'permis_statut' => 'en_attente',
        ]);
    }

    public function uploadCarteNationale(Request $request)
    {
        return $this->uploadDocumentIdentite($request, 'carte_nationale');
    }

    public function uploadPasseport(Request $request)
    {
        return $this->uploadDocumentIdentite($request, 'passeport');
    }

    /**
     * CIN (Marocains) et passeport (etrangers) partagent exactement les memes
     * controles de qualite et le meme cycle de validation.
     */
    private function uploadDocumentIdentite(Request $request, string $type)
    {
        $type = str_replace('_', '-', $type);
        $configuration = $this->documentsIdentite()[$type];
        $champ = $configuration['champ'];
        $label = $configuration['label'];

        $request->validate([
            $champ => 'required|file|mimes:jpg,jpeg,png,webp|max:5120',
        ], [
            $champ.'.required' => 'Selectionnez une photo de votre '.$label.'.',
            $champ.'.mimes' => 'Format non accepte : envoyez une photo JPG, PNG ou WebP.',
            $champ.'.max' => 'La photo depasse 5 Mo.',
        ]);

        $file = $request->file($champ);

        app(DocumentPhotoVerifier::class)->verifier($file, $champ);

        $client = $request->user();

        if ($client->{$champ} && Storage::disk('public')->exists($client->{$champ})) {
            Storage::disk('public')->delete($client->{$champ});
        }

        $path = $file->store($configuration['dossier'], 'public');

        $client->update([
            $champ => $path,
            $configuration['statut'] => 'en_attente',
            $configuration['motif'] => null,
        ]);

        $client->refresh();

        return response()->json([
            'message' => 'Document envoye. Il sera verifie par un agent.',
            $champ => $path,
            $configuration['statut'] => 'en_attente',
            'document_identite' => $client->document_identite,
        ]);
    }

    public function validerDocumentIdentite(Request $request, $id, string $type)
    {
        $type = str_replace('_', '-', $type);
        $configuration = $this->documentsIdentite()[$type] ?? null;

        if (! $configuration) {
            return response()->json(['message' => 'Type de document inconnu.'], 422);
        }

        $validated = $request->validate([
            'statut' => 'required|in:valide,rejete',
            'motif' => 'nullable|string|max:500|required_if:statut,rejete|min:3',
        ], [
            'motif.required_if' => 'Le motif est obligatoire pour rejeter un document.',
            'motif.min' => 'Le motif doit contenir au moins 3 caracteres.',
        ]);

        $client = Client::findOrFail($id);
        $champ = $configuration['champ'];

        if (empty($client->{$champ})) {
            return response()->json([
                'message' => 'Impossible de valider : aucun document n\'a ete envoye.',
            ], 422);
        }

        $update = [$configuration['statut'] => $validated['statut']];

        if ($validated['statut'] === 'rejete') {
            $update[$configuration['motif']] = $validated['motif'];
        } else {
            $update[$configuration['motif']] = null;
        }

        $client->update($update);

        return response()->json([
            'message' => 'Document '.($validated['statut'] === 'valide' ? 'valide' : 'rejete'),
            'client' => $client->fresh(),
        ]);
    }

    /**
     * @return array<string, array{champ:string, statut:string, motif:string, dossier:string, label:string}>
     */
    private function documentsIdentite(): array
    {
        return [
            'carte-nationale' => [
                'champ' => 'carte_nationale',
                'statut' => 'carte_nationale_statut',
                'motif' => 'carte_nationale_rejet_motif',
                'dossier' => 'documents/carte-nationale',
                'label' => 'carte nationale',
            ],
            'passeport' => [
                'champ' => 'passeport_document',
                'statut' => 'passeport_statut',
                'motif' => 'passeport_rejet_motif',
                'dossier' => 'documents/passeport',
                'label' => 'passeport',
            ],
        ];
    }

    public function validerPermis(Request $request, $id)
    {
        $validated = $request->validate([
            'statut' => 'required|in:valide,rejete',
            'motif' => 'nullable|string|max:500',
        ]);

        $client = Client::findOrFail($id);

        // Un permis dont la date est depassee ne peut pas etre (re)valide :
        // le client doit d'abord corriger son profil.
        if ($validated['statut'] === 'valide' && $client->permisExpire()) {
            return response()->json([
                'message' => 'Impossible de valider : la date d\'expiration du permis est depassee. Le client doit mettre a jour son profil.',
            ], 422);
        }

        $update = ['permis_statut' => $validated['statut']];
        if ($validated['statut'] === 'rejete') {
            $update['permis_rejet_motif'] = $validated['motif'];
        } else {
            $update['permis_rejet_motif'] = null;
        }

        $client->update($update);

        if ($client->email) {
            QueuedMail::send(
                $client->email,
                new PermisValidation($client, $validated['statut'], $validated['motif'] ?? null),
                'validation-permis'
            );
        }

        return response()->json([
            'message' => 'Permis '.($validated['statut'] === 'valide' ? 'valide' : 'rejete'),
            'client' => $client,
        ]);
    }

    /**
     * Normalise telephone, CIN et passeport avant validation. Une saisie
     * comme « 06 12 34 56 78 » ou « ab-123456 » est legitime pour un client
     * mais ne correspondait pas aux regex, d'ou un 422 difficile a comprendre.
     */
    private function normaliserChampsProfil(Request $request): void
    {
        $donnees = [];

        if ($request->exists('telephone')) {
            $donnees['telephone'] = NormaliseurChampsClient::telephone($request->input('telephone'));
        }

        foreach (['cin', 'passeport'] as $champ) {
            if ($request->exists($champ)) {
                $donnees[$champ] = NormaliseurChampsClient::pieceIdentite($request->input($champ));
            }
        }

        if ($donnees !== []) {
            $request->merge($donnees);
        }
    }
}

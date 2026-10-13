<?php

namespace App\Services;

use App\Models\Client;

/**
 * V2 : systeme de parrainage. Le parrain partage son code ; le filleul
 * l'indique a l'inscription. Bonus immediat a l'inscription, bonus plus
 * gros au premier contrat termine du filleul.
 */
class ParrainageService
{
    /** Points donnes au parrain et au filleul a l'inscription avec code. */
    public const POINTS_INSCRIPTION = 50;

    /** Points donnes au parrain a la premiere location terminee du filleul. */
    public const POINTS_PREMIERE_LOCATION = 100;

    public function genererCode(Client $client): string
    {
        do {
            $code = strtoupper(substr(str_replace(['0', 'O', 'I', '1'], '', base_convert(bin2hex(random_bytes(6)), 16, 36)), 0, 8));
        } while ($code === '' || Client::where('code_parrainage', $code)->exists());

        $client->update(['code_parrainage' => $code]);

        return $code;
    }

    /** Lie le filleul au parrain et credite les deux bonus d'inscription. */
    public function enregistrerParrainage(Client $filleul, string $code, FideliteService $fidelite): Client
    {
        $parrain = Client::where('code_parrainage', $code)->first();

        if (! $parrain) {
            return $filleul;
        }

        $filleul->update(['parrain_id' => $parrain->id]);

        $fidelite->ajouterPoints($filleul, self::POINTS_INSCRIPTION);
        $fidelite->ajouterPoints($parrain, self::POINTS_INSCRIPTION);

        return $parrain;
    }

    /** Appele quand une location passe a "terminee" : bonus parrain une seule fois. */
    public function recompenserPremiereLocation(Client $filleul, FideliteService $fidelite): void
    {
        if (! $filleul->parrain_id || $filleul->parrain_recompense) {
            return;
        }

        $parrain = Client::find($filleul->parrain_id);

        if ($parrain) {
            $fidelite->ajouterPoints($parrain, self::POINTS_PREMIERE_LOCATION);
        }

        $filleul->update(['parrain_recompense' => true]);
    }

    /** Statistiques affichees au client sur la page parrainage. */
    public function stats(Client $client): array
    {
        $nombreFilleuls = $client->filleuls()->count();
        $filleulsRecompenses = $client->filleuls()->where('parrain_recompense', true)->count();

        return [
            'code_parrainage' => $client->code_parrainage,
            'nombre_filleuls' => $nombreFilleuls,
            'filleuls_recompenses' => $filleulsRecompenses,
            'points_inscriptions' => $nombreFilleuls * self::POINTS_INSCRIPTION,
            'points_premiere_location' => $filleulsRecompenses * self::POINTS_PREMIERE_LOCATION,
            'points_totaux' => $nombreFilleuls * self::POINTS_INSCRIPTION
                + $filleulsRecompenses * self::POINTS_PREMIERE_LOCATION,
        ];
    }
}

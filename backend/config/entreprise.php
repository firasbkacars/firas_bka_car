<?php

return [
    /*
     * Mentions legales de l'entreprise imprimees sur les contrats.
     *
     * Ces valeurs doivent etre les identifiants reels (registre de commerce,
     * identifiant fiscal, ICE). Tant qu'elles ne sont pas renseignees, la
     * ligne est simplement omise : imprimer un identifiant fictif sur un
     * document contractuel serait pire que de ne rien afficher.
     */
    'rc' => env('ENTREPRISE_RC'),

    'if' => env('ENTREPRISE_IF'),

    'ice' => env('ENTREPRISE_ICE'),

    /*
     * Coordonnees de paiement de l'acompte (virement bancaire et transfert
     * Wafacash / Cash Plus).
     *
     * Aucune valeur par defaut : un RIB, un nom de gerant ou un CIN inventes
     * enverraient le client vers un compte inexistant. Quand une valeur
     * manque, la page de paiement masque le champ et affiche le contact de
     * l'agence a la place.
     */
    'banque' => env('ENTREPRISE_BANQUE'),

    'rib' => env('ENTREPRISE_RIB'),

    'beneficiaire' => env('ENTREPRISE_BENEFICIAIRE'),

    'gerant' => env('ENTREPRISE_GERANT'),

    'cin_gerant' => env('ENTREPRISE_CIN_GERANT'),

    'telephone_transfert' => env('ENTREPRISE_TELEPHONE_TRANSFERT'),
];

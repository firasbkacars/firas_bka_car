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
];

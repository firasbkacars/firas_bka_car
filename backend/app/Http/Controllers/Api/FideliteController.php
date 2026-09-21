<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Services\FideliteService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class FideliteController extends Controller
{
    private FideliteService $fidelite;

    public function __construct(FideliteService $fidelite)
    {
        $this->fidelite = $fidelite;
    }

    public function show()
    {
        $client = Auth::user();

        return response()->json([
            'nombre_locations' => $client->nombre_locations,
            'points_fidelite' => $client->points_fidelite,
            'niveau_actuel' => $client->niveau_fidelite,
            'niveaux' => $this->fidelite->getNiveaux(),
            'prochain_niveau' => $this->fidelite->getNextNiveau($client),
            'reduction_actuelle' => $this->fidelite->getReduction($client),
        ]);
    }
}

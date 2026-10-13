<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ParrainageService;
use Illuminate\Http\Request;

class ParrainageController extends Controller
{
    public function __construct(private ParrainageService $parrainage) {}

    public function show(Request $request)
    {
        $client = $request->user();

        if (! $client->code_parrainage) {
            $this->parrainage->genererCode($client);
            $client->refresh();
        }

        return response()->json($this->parrainage->stats($client));
    }
}

<?php

namespace App\Http\Controllers;

use App\Models\Paiement;
use App\Services\Cmi\CmiSandboxGateway;
use App\Services\CmiPaymentService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redirect;

/**
 * Page de paiement simulee (mode CMI sandbox).
 *
 * N'existe QUE pour permettre de tester l'integrite du parcours sans contrat
 * marchand. N'est jamais servie quand config('cmi.mode') === 'production'.
 */
class CmiSandboxController extends Controller
{
    public function __construct(
        private readonly CmiPaymentService $cmiService
    ) {}

    public function show(string $transactionId)
    {
        if (! $this->cmiService->isSandbox()) {
            abort(404);
        }

        $paiement = Paiement::with('reservation')->where('transaction_id', $transactionId)->firstOrFail();
        $state = CmiSandboxGateway::read($transactionId);

        return view('cmi.sandbox', [
            'paiement' => $paiement,
            'reservation' => $paiement->reservation,
            'scenarios' => CmiSandboxGateway::SCENARIOS,
            'state' => $state,
            'mode' => $this->cmiService->mode(),
        ]);
    }

    public function choose(Request $request, string $transactionId)
    {
        if (! $this->cmiService->isSandbox()) {
            abort(404);
        }

        $validated = $request->validate([
            'scenario' => 'required|string|in:'.implode(',', array_keys(CmiSandboxGateway::SCENARIOS)),
        ]);

        $paiement = Paiement::with('reservation')->where('transaction_id', $transactionId)->firstOrFail();

        CmiSandboxGateway::choose(
            $transactionId,
            $validated['scenario'],
            (float) $paiement->montant
        );

        // On simule le retour navigateur de la passerelle, en passant par le
        // meme callback que la production : le meme code s'execute.
        return Redirect::away(url('/api/cmi/callback?'.http_build_query([
            'order_id' => $transactionId,
            'status' => CmiSandboxGateway::SCENARIOS[$validated['scenario']]['status'],
        ])));
    }
}

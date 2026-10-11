<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex,nofollow">
    <title>Paiement simulé (sandbox) - FIRAS BKA CAR</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #0a0a0a; color: #fff; min-height: 100vh;
            display: flex; align-items: center; justify-content: center; padding: 24px;
        }
        .card {
            background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 16px;
            padding: 28px; width: 100%; max-width: 460px;
        }
        /* Ambre, pas rouge : le rouge se lit comme une erreur et induit en
           erreur l'utilisateur sur une page qui n'en est pas une. */
        .badge {
            display: inline-block; background: #f59e0b; color: #1a1200; font-size: 11px;
            font-weight: 700; padding: 3px 10px; border-radius: 999px; letter-spacing: .4px;
        }
        h1 { font-size: 18px; margin: 14px 0 4px; }
        .sub { color: #a1a1a1; font-size: 13px; margin-bottom: 20px; }
        .amount { font-size: 30px; font-weight: 700; color: #f87171; margin-bottom: 4px; }
        .rows { border-top: 1px solid #2a2a2a; margin: 18px 0; }
        .row {
            display: flex; justify-content: space-between; gap: 12px;
            padding: 9px 0; border-bottom: 1px solid #1f1f1f; font-size: 13px;
        }
        .row span:first-child { color: #a1a1a1; }
        .row span:last-child { color: #fff; font-weight: 500; text-align: right; word-break: break-all; }
        .field { margin-bottom: 14px; }
        .field label { display: block; font-size: 12px; color: #a1a1a1; margin-bottom: 6px; }
        .fake-input {
            background: #0a0a0a; border: 1px solid #2a2a2a; border-radius: 8px;
            padding: 10px 12px; font-size: 14px; color: #6b7280; letter-spacing: 1px;
        }
        .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .scen-title { font-size: 12px; color: #a1a1a1; margin: 22px 0 10px; font-weight: 600; }
        fieldset { border: 0; }
        button.opt {
            width: 100%; text-align: left; background: #0a0a0a; color: #fff;
            border: 1px solid #2a2a2a; border-radius: 8px; padding: 11px 13px;
            font-size: 13px; cursor: pointer; margin-bottom: 8px; transition: .15s;
        }
        button.opt:hover { border-color: #f59e0b; background: #f59e0b1a; }
        button.opt:focus-visible {
            outline: 2px solid #f59e0b; outline-offset: 2px;
        }
        .note {
            margin-top: 16px; font-size: 11px; color: #9ca3af; line-height: 1.6;
            border-top: 1px solid #2a2a2a; padding-top: 14px;
        }
        .back {
            display: inline-block; margin-top: 12px; font-size: 12px;
            color: #a1a1a1; text-decoration: underline; text-underline-offset: 3px;
        }
        .back:hover, .back:focus-visible { color: #fff; }
    </style>
</head>
<body>
<main class="card">
    <p class="badge">SANDBOX &mdash; AUCUN DÉBIT RÉEL</p>
    <h1>Page de paiement simulée</h1>
    <p class="sub">Ceci reproduit le parcours carte Visa/Mastercard sans contrat marchand.</p>

    <p class="amount">{{ number_format($paiement->montant, 2, ',', ' ') }} MAD</p>

    <div class="rows">
        <div class="row"><span>Réservation</span><span>{{ $reservation->numero }}</span></div>
        <div class="row"><span>Transaction</span><span>{{ $paiement->transaction_id }}</span></div>
        <div class="row">
            <span>Statut courant</span>
            <span>{{ $libellesStatut[$paiement->statut] ?? $paiement->statut }}</span>
        </div>
        @if($state && !empty($state['chosen']))
            <div class="row">
                <span>Scénario déjà choisi</span>
                <span>{{ $scenarios[$state['chosen']]['label'] ?? ucfirst($state['chosen']) }}</span>
            </div>
        @endif
    </div>

    {{-- Champs purely presentiels : aucune saisie utilisateur, aucune valeur
         recue. En aria-hidden pour ne pas polluer le flux de lecture. --}}
    <div aria-hidden="true">
        <div class="field">
            <label>Numéro de carte (simulé)</label>
            <div class="fake-input">4242 4242 4242 4242</div>
        </div>
        <div class="grid2">
            <div class="field">
                <label>Expiration</label>
                <div class="fake-input">12/29</div>
            </div>
            <div class="field">
                <label>CVC</label>
                <div class="fake-input">123</div>
            </div>
        </div>
    </div>

    <form method="POST" action="{{ route('cmi.sandbox.choose', $paiement->transaction_id) }}">
        @csrf
        <fieldset>
            <legend class="scen-title">Choisir le scénario</legend>
            @foreach($scenarios as $key => $meta)
                <button type="submit" name="scenario" value="{{ $key }}" class="opt">
                    {{ $meta['label'] }}
                    @if(!empty($meta['description']))
                        <span style="display:block;color:#9ca3af;font-size:11px;margin-top:2px;">
                            {{ $meta['description'] }}
                        </span>
                    @endif
                </button>
            @endforeach
        </fieldset>
    </form>

    <p class="note">
        Mode <strong>{{ $mode }}</strong>. Aucune donnée bancaire n'est transmise ni stockée.
        Le résultat est appliqué par le même code de vérification que la production
        (retour navigateur &rarr; /api/cmi/callback).
    </p>

    <a class="back" href="{{ url('/') }}">Retour à FIRAS BKA CAR</a>
</main>
</body>
</html>

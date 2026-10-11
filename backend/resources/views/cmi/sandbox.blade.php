<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex,nofollow">
    <title>Paiement simule (sandbox) - FIRAS BKA CAR</title>
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
        .badge {
            display: inline-block; background: #dc2626; color: #fff; font-size: 11px;
            font-weight: 600; padding: 3px 10px; border-radius: 999px; letter-spacing: .4px;
        }
        h1 { font-size: 18px; margin: 14px 0 4px; }
        .sub { color: #888; font-size: 13px; margin-bottom: 20px; }
        .amount {
            font-size: 30px; font-weight: 700; color: #dc2626; margin-bottom: 4px;
        }
        .rows { border-top: 1px solid #2a2a2a; margin: 18px 0; }
        .row {
            display: flex; justify-content: space-between; gap: 12px;
            padding: 9px 0; border-bottom: 1px solid #1f1f1f; font-size: 13px;
        }
        .row span:first-child { color: #888; }
        .row span:last-child { color: #fff; font-weight: 500; text-align: right; word-break: break-all; }
        .field { margin-bottom: 14px; }
        .field label { display: block; font-size: 12px; color: #888; margin-bottom: 6px; }
        .fake-input {
            background: #0a0a0a; border: 1px solid #2a2a2a; border-radius: 8px;
            padding: 10px 12px; font-size: 14px; color: #fff; letter-spacing: 1px;
        }
        .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .scen-title { font-size: 12px; color: #888; margin: 22px 0 10px; font-weight: 600; }
        button.opt {
            width: 100%; text-align: left; background: #0a0a0a; color: #fff;
            border: 1px solid #2a2a2a; border-radius: 8px; padding: 11px 13px;
            font-size: 13px; cursor: pointer; margin-bottom: 8px; transition: .15s;
        }
        button.opt:hover { border-color: #dc2626; background: #dc26261a; }
        .note {
            margin-top: 16px; font-size: 11px; color: #666; line-height: 1.5;
            border-top: 1px solid #2a2a2a; padding-top: 14px;
        }
    </style>
</head>
<body>
<div class="card">
    <span class="badge">SANDBOX &mdash; AUCUN DEBIT REEL</span>
    <h1>Page de paiement simulee</h1>
    <p class="sub">Ceci reproduit le parcours carte Visa/Mastercard sans contrat marchand.</p>

    <div class="amount">{{ number_format($paiement->montant, 2, ',', ' ') }} MAD</div>

    <div class="rows">
        <div class="row"><span>Reservation</span><span>{{ $reservation->numero }}</span></div>
        <div class="row"><span>Transaction</span><span>{{ $paiement->transaction_id }}</span></div>
        <div class="row"><span>Statut courant</span><span>{{ ucfirst($paiement->statut) }}</span></div>
        @if($state && !empty($state['chosen']))
            <div class="row"><span>Scenario deja choisi</span><span>{{ ucfirst($state['chosen']) }}</span></div>
        @endif
    </div>

    <div class="field">
        <label>Numero de carte (simule)</label>
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

    <form method="POST" action="{{ route('cmi.sandbox.choose', $paiement->transaction_id) }}">
        @csrf
        <p class="scen-title">Choisir le scenario</p>
        @foreach($scenarios as $key => $meta)
            <button type="submit" name="scenario" value="{{ $key }}" class="opt">
                {{ $meta['label'] }}
            </button>
        @endforeach
    </form>

    <p class="note">
        Mode <strong>{{ $mode }}</strong>. Aucune donnee bancaire n'est transmise ni stockee.
        Le resultat est applique par le meme code de verification que la production
        (retour navigateur &rarr; /api/cmi/callback).
    </p>
</div>
</body>
</html>

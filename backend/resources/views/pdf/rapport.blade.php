<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Helvetica', 'Arial', sans-serif; font-size: 12px; color: #333; line-height: 1.5; }
        .container { width: 100%; padding: 30px; }
        .header { margin-bottom: 30px; border-bottom: 3px solid #dc2626; padding-bottom: 20px; }
        .header h1 { font-size: 24px; color: #dc2626; font-weight: bold; }
        .header p { color: #666; font-size: 11px; margin-top: 4px; }
        .header .period { text-align: right; font-size: 12px; color: #1a1a1a; margin-top: -20px; }
        .section { margin-bottom: 25px; }
        .section-title { font-size: 13px; font-weight: bold; color: #dc2626; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
        .kpis { display: flex; gap: 15px; margin-bottom: 20px; }
        .kpi { flex: 1; background: #f9f9f9; border-radius: 8px; padding: 15px; text-align: center; }
        .kpi .value { font-size: 20px; font-weight: bold; color: #dc2626; }
        .kpi .label { font-size: 10px; color: #666; text-transform: uppercase; margin-top: 5px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th { background: #dc2626; color: white; padding: 8px 10px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
        td { padding: 8px 10px; border-bottom: 1px solid #eee; font-size: 11px; }
        tr:nth-child(even) td { background: #fafafa; }
        .num { text-align: right; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; font-size: 10px; color: #999; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>FIRAS BKA CAR</h1>
            <p>Rapport d'activité — généré le {{ $rapport['periode']['fin'] }}</p>
        </div>

        <div class="kpis">
            <div class="kpi">
                <div class="value">{{ $rapport['total_reservations'] }}</div>
                <div class="label">Réservations</div>
            </div>
            <div class="kpi">
                <div class="value">{{ $rapport['taux_annulation'] }}%</div>
                <div class="label">Taux d'annulation</div>
            </div>
            <div class="kpi">
                <div class="value">{{ $rapport['duree_moyenne_jours'] ?? '-' }}</div>
                <div class="label">Durée moyenne (j)</div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">Top véhicules les plus demandés</div>
            <table>
                <thead><tr><th>Véhicule</th><th class="num">Réservations</th></tr></thead>
                <tbody>
                    @forelse($rapport['top_vehicules'] as $v)
                    <tr>
                        <td>{{ $v['marque'] }} {{ $v['modele'] }}</td>
                        <td class="num">{{ $v['reservations'] }}</td>
                    </tr>
                    @empty
                    <tr><td colspan="2">Aucune donnée</td></tr>
                    @endforelse
                </tbody>
            </table>
        </div>

        <div class="section">
            <div class="section-title">Clients les plus fidèles</div>
            <table>
                <thead><tr><th>Client</th><th class="num">Réservations</th><th class="num">Dépenses</th></tr></thead>
                <tbody>
                    @forelse($rapport['top_clients'] as $c)
                    <tr>
                        <td>{{ $c['nom'] ?? '—' }}</td>
                        <td class="num">{{ $c['reservations'] }}</td>
                        <td class="num">{{ number_format($c['depenses'], 2) }} DH</td>
                    </tr>
                    @empty
                    <tr><td colspan="3">Aucune donnée</td></tr>
                    @endforelse
                </tbody>
            </table>
        </div>

        <div class="section">
            <div class="section-title">Encaissements par mode de paiement</div>
            <table>
                <thead><tr><th>Méthode</th><th class="num">Opérations</th><th class="num">Total</th></tr></thead>
                <tbody>
                    @forelse($rapport['paiements_par_methode'] as $m)
                    <tr>
                        <td>{{ strtoupper($m['methode']) }}</td>
                        <td class="num">{{ $m['operations'] }}</td>
                        <td class="num">{{ number_format($m['total'], 2) }} DH</td>
                    </tr>
                    @empty
                    <tr><td colspan="3">Aucune donnée</td></tr>
                    @endforelse
                </tbody>
            </table>
        </div>

        <div class="footer">
            FIRAS BKA CAR — Rapport généré automatiquement
        </div>
    </div>
</body>
</html>

<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Helvetica', 'Arial', sans-serif; font-size: 12px; color: #333; line-height: 1.5; }
        .container { width: 100%; padding: 30px; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; border-bottom: 3px solid #dc2626; padding-bottom: 20px; }
        .company-info h1 { font-size: 24px; color: #dc2626; font-weight: bold; margin-bottom: 5px; }
        .company-info p { color: #666; font-size: 11px; }
        .invoice-title { text-align: right; }
        .invoice-title h2 { font-size: 28px; color: #1a1a1a; font-weight: bold; }
        .invoice-title .number { color: #dc2626; font-size: 14px; margin-top: 5px; }
        .invoice-title .date { color: #666; font-size: 11px; margin-top: 3px; }
        .section { margin-bottom: 25px; }
        .section-title { font-size: 13px; font-weight: bold; color: #dc2626; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
        .info-grid { display: flex; gap: 40px; }
        .info-block { flex: 1; }
        .info-block p { margin-bottom: 3px; font-size: 11px; color: #666; }
        .info-block .value { color: #1a1a1a; font-weight: 500; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th { background: #dc2626; color: white; padding: 10px 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
        td { padding: 10px 12px; border-bottom: 1px solid #eee; font-size: 12px; }
        tr:nth-child(even) td { background: #fafafa; }
        .totals { margin-top: 20px; text-align: right; }
        .totals table { width: 300px; margin-left: auto; }
        .totals td { padding: 8px 12px; }
        .totals .total-row td { border-top: 2px solid #dc2626; font-weight: bold; font-size: 14px; color: #dc2626; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; font-size: 10px; color: #999; }
        .status-badge { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 10px; font-weight: bold; text-transform: uppercase; }
        .status-confirmee { background: #dbeafe; color: #1e40af; }
        .status-en_cours { background: #fef3c7; color: #92400e; }
        .status-terminee { background: #d1fae5; color: #065f46; }
        .status-annulee { background: #fee2e2; color: #991b1b; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="company-info">
                <h1>FIRAS BKA CAR</h1>
                <p>Location de véhicules</p>
                <p>Lot 583N, Rue 50, Branes 1, Tanger 90060</p>
                <p>Tel: +212 774 623 448</p>
            </div>
            <div class="invoice-title">
                <h2>FACTURE</h2>
                <div class="number">{{ $reservation->numero }}</div>
                <div class="date">{{ $reservation->created_at->format('d/m/Y') }}</div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">Informations client</div>
            <div class="info-grid">
                <div class="info-block">
                    <p>Nom: <span class="value">{{ $reservation->client->nom_complet }}</span></p>
                    <p>Email: <span class="value">{{ $reservation->client->email }}</span></p>
                    <p>Telephone: <span class="value">{{ $reservation->client->telephone }}</span></p>
                </div>
                <div class="info-block">
                    <p>CIN: <span class="value">{{ $reservation->client->cin ?: 'N/A' }}</span></p>
                    <p>Adresse: <span class="value">{{ $reservation->client->adresse ?: 'N/A' }}</span></p>
                    <p>Statut: <span class="status-badge status-{{ $reservation->statut }}">{{ ucfirst(str_replace('_', ' ', $reservation->statut)) }}</span></p>
                </div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">Details du vehicule</div>
            <table>
                <thead>
                    <tr>
                        <th>Vehicule</th>
                        <th>Categorie</th>
                        <th>Transmission</th>
                        <th>Carburant</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>{{ $reservation->vehicule->marque }} {{ $reservation->vehicule->modele }}</td>
                        <td>{{ $reservation->vehicule->categorie }}</td>
                        <td>{{ ucfirst($reservation->vehicule->transmission) }}</td>
                        <td>{{ ucfirst($reservation->vehicule->carburant) }}</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div class="section">
            <div class="section-title">Details de la reservation</div>
            <div class="info-grid">
                <div class="info-block">
                    <p>Prise en charge: <span class="value">{{ $reservation->date_debut->format('d/m/Y H:i') }}</span></p>
                    <p>Lieu: <span class="value">{{ $reservation->lieu_prise }}</span></p>
                </div>
                <div class="info-block">
                    <p>Retour: <span class="value">{{ $reservation->date_fin->format('d/m/Y H:i') }}</span></p>
                    <p>Lieu: <span class="value">{{ $reservation->lieu_retour }}</span></p>
                </div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">Details de facturation</div>
            <table>
                <thead>
                    <tr>
                        <th>Description</th>
                        <th>Prix unitaire</th>
                        <th>Nb jours</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>{{ $reservation->vehicule->marque }} {{ $reservation->vehicule->modele }}</td>
                        <td>{{ number_format($reservation->vehicule->prix_jour, 2, ',', ' ') }} DH</td>
                        <td>{{ $reservation->date_debut->diffInDays($reservation->date_fin) }}</td>
                        <td>{{ number_format($reservation->prix_total, 2, ',', ' ') }} DH</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div class="totals">
            <table>
                <tr>
                    <td>Sous-total:</td>
                    <td style="text-align: right;">{{ number_format($reservation->prix_total, 2, ',', ' ') }} DH</td>
                </tr>
                <tr>
                    <td>Acompte attendu:</td>
                    <td style="text-align: right;">-{{ number_format($reservation->acompte, 2, ',', ' ') }} DH</td>
                </tr>
                <tr class="total-row">
                    <td>Reste a payer:</td>
                    <td style="text-align: right;">{{ number_format($reservation->prix_total - $reservation->acompte, 2, ',', ' ') }} DH</td>
                </tr>
            </table>
        </div>

        <div class="section" style="margin-top: 20px;">
            <div class="section-title">Situation du paiement</div>
            <table style="width: 100%; font-size: 11px;">
                <tr>
                    <td style="color: #666;">Mode de paiement</td>
                    <td style="text-align: right;">
                        {{ $reservation->mode_paiement === 'cmi' ? 'Carte bancaire (CMI)' : 'Especes' }}
                    </td>
                </tr>
                <tr>
                    <td style="color: #666;">Acompte regle</td>
                    <td style="text-align: right; {{ $reservation->acompte_paye > 0 ? 'color: #16a34a; font-weight: bold;' : 'color: #dc2626;' }}">
                        {{ number_format($reservation->acompte_paye, 2, ',', ' ') }} DH
                    </td>
                </tr>
                @if ($reservation->rembourse > 0)
                <tr>
                    <td style="color: #666;">Dont rembourse</td>
                    <td style="text-align: right; color: #2563eb;">-{{ number_format($reservation->rembourse, 2, ',', ' ') }} DH</td>
                </tr>
                @endif
                <tr>
                    <td style="color: #666;">Solde restant</td>
                    <td style="text-align: right; font-weight: bold;">
                        {{ number_format($reservation->solde_restant, 2, ',', ' ') }} DH
                    </td>
                </tr>
                <tr>
                    <td style="color: #666;">Statut</td>
                    <td style="text-align: right;">
                        @if ($reservation->est_paye_integralement)
                            <span style="color: #16a34a; font-weight: bold;">Acompte regle</span>
                        @elseif ($reservation->acompte_paye > 0)
                            <span style="color: #d97706; font-weight: bold;">Acompte partiel</span>
                        @else
                            <span style="color: #dc2626; font-weight: bold;">Acompte non regle</span>
                        @endif
                    </td>
                </tr>
            </table>
            @if (! $reservation->est_paye_integralement)
            <p style="font-size: 9px; color: #999; margin-top: 8px;">
                Le present document ne vaut pas preuve d'encaissement. Seul le reglement
                effectif de l'acompte ou la remise en main propre en agence vaut quittance.
            </p>
            @endif
        </div>

        <div class="footer">
            <p>Merci pour votre confiance - FIRAS BKA CAR</p>
            <p>Lot 583N, Rue 50, Branes 1, Tanger 90060 | Tel: +212 774 623 448</p>
        </div>
    </div>
</body>
</html>

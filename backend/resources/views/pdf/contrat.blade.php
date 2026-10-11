<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Helvetica', 'Arial', sans-serif; font-size: 11px; color: #333; line-height: 1.6; }
        .container { width: 100%; padding: 25px; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 25px; border-bottom: 3px solid #dc2626; padding-bottom: 15px; }
        .company-info h1 { font-size: 22px; color: #dc2626; font-weight: bold; margin-bottom: 3px; }
        .company-info p { color: #666; font-size: 10px; }
        .contract-title { text-align: right; }
        .contract-title h2 { font-size: 20px; color: #1a1a1a; font-weight: bold; }
        .contract-title .number { color: #dc2626; font-size: 12px; margin-top: 3px; }
        .section { margin-bottom: 20px; }
        .section-title { font-size: 12px; font-weight: bold; color: #dc2626; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; border-bottom: 1px solid #eee; padding-bottom: 4px; }
        .info-grid { display: flex; gap: 30px; }
        .info-block { flex: 1; }
        .info-block p { margin-bottom: 2px; font-size: 10px; color: #666; }
        .info-block .value { color: #1a1a1a; font-weight: 500; }
        .terms { background: #f9fafb; border: 1px solid #eee; border-radius: 6px; padding: 15px; margin-top: 15px; }
        .terms h3 { font-size: 12px; font-weight: bold; color: #1a1a1a; margin-bottom: 8px; }
        .terms ol { padding-left: 18px; }
        .terms li { margin-bottom: 6px; font-size: 10px; color: #555; }
        .signatures { display: flex; justify-content: space-between; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
        .signature-block { width: 45%; text-align: center; }
        .signature-block .line { border-bottom: 1px solid #333; height: 40px; margin-bottom: 5px; }
        .signature-block p { font-size: 10px; color: #666; }
        .footer { margin-top: 25px; padding-top: 15px; border-top: 1px solid #eee; text-align: center; font-size: 9px; color: #999; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="company-info">
                <h1>FIRAS BKA CAR</h1>
                <p>Location de vehicules</p>
                <p>Lot 583N, Rue 50, Branes 1, Tanger 90060</p>
                <p>Tel: +212 774 623 448</p>
            </div>
            <div class="contract-title">
                <h2>CONTRAT DE LOCATION</h2>
                <div class="number">{{ $reservation->numero }}</div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">Parties</div>
            <div class="info-grid">
                <div class="info-block">
                    <p><strong>Loueur :</strong></p>
                    <p>FIRAS BKA CAR SARL</p>
                    <p>Lot 583N, Rue 50, Branes 1, Tanger 90060</p>
                    <p>RC: 001234567</p>
                    <p>IF: 12345678</p>
                </div>
                <div class="info-block">
                    <p><strong>Locataire :</strong></p>
                    <p>{{ $reservation->client->nom_complet }}</p>
                    <p>{{ $reservation->client->adresse ?: 'Tanger, Maroc' }}</p>
                    <p>CIN: {{ $reservation->client->cin ?: 'N/A' }}</p>
                    <p>Tel: {{ $reservation->client->telephone }}</p>
                    <p>Email: {{ $reservation->client->email }}</p>
                </div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">Objet du contrat - Vehicule</div>
            <table style="width: 100%; border-collapse: collapse; margin-top: 8px;">
                <thead>
                    <tr style="background: #dc2626; color: white;">
                        <th style="padding: 8px; text-align: left; font-size: 10px;">Marque/Modele</th>
                        <th style="padding: 8px; text-align: left; font-size: 10px;">Categorie</th>
                        <th style="padding: 8px; text-align: left; font-size: 10px;">Transmission</th>
                        <th style="padding: 8px; text-align: left; font-size: 10px;">Carburant</th>
                        <th style="padding: 8px; text-align: left; font-size: 10px;">Places</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td style="padding: 8px; border-bottom: 1px solid #eee; font-size: 10px;">{{ $reservation->vehicule->marque }} {{ $reservation->vehicule->modele }}</td>
                        <td style="padding: 8px; border-bottom: 1px solid #eee; font-size: 10px;">{{ $reservation->vehicule->categorie }}</td>
                        <td style="padding: 8px; border-bottom: 1px solid #eee; font-size: 10px;">{{ ucfirst($reservation->vehicule->transmission) }}</td>
                        <td style="padding: 8px; border-bottom: 1px solid #eee; font-size: 10px;">{{ ucfirst($reservation->vehicule->carburant) }}</td>
                        <td style="padding: 8px; border-bottom: 1px solid #eee; font-size: 10px;">{{ $reservation->vehicule->places }}</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div class="section">
            <div class="section-title">Conditions de location</div>
            <div class="info-grid">
                <div class="info-block">
                    <p>Date de debut : <span class="value">{{ $reservation->date_debut->format('d/m/Y H:i') }}</span></p>
                    <p>Lieu de prise en charge : <span class="value">{{ $reservation->lieu_prise }}</span></p>
                </div>
                <div class="info-block">
                    <p>Date de fin : <span class="value">{{ $reservation->date_fin->format('d/m/Y H:i') }}</span></p>
                    <p>Lieu de retour : <span class="value">{{ $reservation->lieu_retour }}</span></p>
                </div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">Conditions financieres</div>
            <table style="width: 100%; border-collapse: collapse;">
                <tbody>
                    <tr>
                        <td style="padding: 6px 8px; border-bottom: 1px solid #eee; font-size: 10px;">Prix journalier</td>
                        <td style="padding: 6px 8px; border-bottom: 1px solid #eee; font-size: 10px; text-align: right;">{{ number_format($reservation->vehicule->prix_jour, 2, ',', ' ') }} DH</td>
                    </tr>
                    <tr>
                        <td style="padding: 6px 8px; border-bottom: 1px solid #eee; font-size: 10px;">Nombre de jours</td>
                        <td style="padding: 6px 8px; border-bottom: 1px solid #eee; font-size: 10px; text-align: right;">{{ $reservation->date_debut->diffInDays($reservation->date_fin) }}</td>
                    </tr>
                    @if($reservation->remise > 0)
                    <tr>
                        <td style="padding: 6px 8px; border-bottom: 1px solid #eee; font-size: 10px; color: #16a34a;">Remise ({{ $reservation->code_promo }})</td>
                        <td style="padding: 6px 8px; border-bottom: 1px solid #eee; font-size: 10px; text-align: right; color: #16a34a;">-{{ number_format($reservation->remise, 2, ',', ' ') }} DH</td>
                    </tr>
                    @endif
                    <tr style="background: #fef2f2;">
                        <td style="padding: 8px; font-size: 11px; font-weight: bold;">Montant total</td>
                        <td style="padding: 8px; font-size: 11px; font-weight: bold; text-align: right; color: #dc2626;">{{ number_format($reservation->prix_total, 2, ',', ' ') }} DH</td>
                    </tr>
                    <tr>
                        <td style="padding: 6px 8px; font-size: 10px;">Acompte verse (30%)</td>
                        <td style="padding: 6px 8px; font-size: 10px; text-align: right;">{{ number_format($reservation->acompte, 2, ',', ' ') }} DH</td>
                    </tr>
                    <tr>
                        <td style="padding: 6px 8px; font-size: 10px;">Reste a payer</td>
                        <td style="padding: 6px 8px; font-size: 10px; text-align: right;">{{ number_format($reservation->prix_total - $reservation->acompte, 2, ',', ' ') }} DH</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div class="terms">
            <h3>Conditions generales</h3>
            <ol>
                <li>Le locataire s'engage a restituer le vehicule dans l'etat ou il l'a recu, usure normale exceptee.</li>
                <li>Le locataire doit presenter un permis de conduire valide et une piece d'identite.</li>
                <li>Le vehicule ne peut etre conduit que par le locataire designe dans le present contrat.</li>
                <li>Le locataire est responsable de toutes les infractions et amendes pendant la periode de location.</li>
                <li>En cas de retard de restitution, des penalites de 50% du tarif journalier seront appliquees par jour de retard.</li>
                <li>Le locataire s'engage a signaler tout incident ou dommage dans les plus brefs delais.</li>
                <li>Le contrat est soumis au droit marocain. Les tribunaux de Tanger sont competents en cas de litige.</li>
            </ol>
        </div>

        <div class="signatures">
            <div class="signature-block">
                <div class="line"></div>
                <p>Le Locataire</p>
                <p>{{ $reservation->client->nom_complet }}</p>
                <p>Date: {{ $reservation->created_at->format('d/m/Y') }}</p>
            </div>
            <div class="signature-block">
                <div class="line"></div>
                <p>Le Loueur</p>
                <p>FIRAS BKA CAR</p>
                <p>Date: {{ $reservation->created_at->format('d/m/Y') }}</p>
            </div>
        </div>

        <div class="footer">
            <p>Contrat genere le {{ $reservation->created_at->format('d/m/Y H:i') }} - FIRAS BKA CAR</p>
            <p>Lot 583N, Rue 50, Branes 1, Tanger 90060 | Tel: +212 774 623 448</p>
        </div>
    </div>
</body>
</html>

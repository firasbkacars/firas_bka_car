<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <title>Contrat de location {{ $reservation->numero_contrat }}</title>
    <style>
        /*
         * DomPDF applique le style @page au cadre racine (<html>). Un reset
         * `* { margin: 0 }` ecraserait donc ces marges et le contenu serait
         * imprime bord a bord (texte coupe a droite). On ne remet a zero que
         * les elements de contenu, jamais la racine.
         */
        @page { margin: 14mm 12mm 12mm 12mm; }

        * { padding: 0; box-sizing: border-box; }
        p, h1, h2, h3, ol, ul { margin: 0; }

        body {
            margin: 0;
            font-family: 'DejaVu Sans', Helvetica, Arial, sans-serif;
            font-size: 9px;
            color: #1f2937;
            line-height: 1.32;
        }

        .header { width: 100%; border-bottom: 3px solid #dc2626; padding-bottom: 8px; margin-bottom: 10px; }
        .header td { vertical-align: top; }
        .brand-name { font-size: 20px; font-weight: bold; color: #dc2626; letter-spacing: 0.5px; }
        .company-line { color: #6b7280; font-size: 8.5px; }
        .doc-title { text-align: right; }
        .doc-title h1 { font-size: 17px; color: #111827; letter-spacing: 0.5px; }
        .doc-title .numero { color: #dc2626; font-size: 11px; font-weight: bold; margin-top: 3px; }
        .doc-title .reservation { color: #6b7280; font-size: 8.5px; margin-top: 2px; }

        .reference-bar {
            background: #fef2f2;
            border: 1px solid #fecaca;
            border-radius: 4px;
            padding: 4px 8px;
            margin-bottom: 10px;
            color: #991b1b;
            font-size: 8.5px;
        }

        .section { margin-bottom: 8px; page-break-inside: avoid; }
        .section-title {
            font-size: 9.5px;
            font-weight: bold;
            color: #dc2626;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 3px;
            margin-bottom: 6px;
        }

        .info-table { width: 100%; }
        .info-table td { width: 50%; vertical-align: top; padding-right: 12px; }
        .info-table td:last-child { padding-right: 0; padding-left: 12px; }
        .info-block .label { color: #6b7280; font-size: 8px; }
        .info-block .value { color: #111827; font-weight: bold; }
        .info-block p { margin-bottom: 2px; }
        .muted { color: #6b7280; }

        table.data { width: 100%; border-collapse: collapse; }
        table.data th {
            background: #dc2626;
            color: #ffffff;
            padding: 4px 6px;
            text-align: left;
            font-size: 8px;
            text-transform: uppercase;
            letter-spacing: 0.3px;
        }
        table.data td { padding: 4px 6px; border-bottom: 1px solid #e5e7eb; font-size: 8.5px; }
        table.data tr:nth-child(even) td { background: #fafafa; }
        table.data td.right, table.data th.right { text-align: right; }

        table.finance { width: 100%; border-collapse: collapse; }
        table.finance td { padding: 4px 6px; border-bottom: 1px solid #e5e7eb; font-size: 8.5px; }
        table.finance td.right { text-align: right; }
        table.finance tr.total td { background: #fef2f2; font-weight: bold; font-size: 10px; color: #dc2626; border-bottom: none; }
        table.finance tr.deposit td { color: #1d4ed8; }

        .terms { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 4px; padding: 7px 9px; page-break-inside: avoid; }
        .terms h3 { font-size: 9px; color: #111827; margin-bottom: 4px; }
        .terms ol { padding-left: 14px; }
        .terms li { font-size: 8px; color: #4b5563; margin-bottom: 2px; }

        .fait-a { text-align: right; margin: 8px 0 4px; font-size: 9px; }

        .signature-table { width: 100%; border-collapse: collapse; page-break-inside: avoid; }
        .signature-table td { width: 50%; vertical-align: top; padding: 0 8px; }
        .signature-table td:first-child { padding-left: 0; }
        .signature-table td:last-child { padding-right: 0; }
        .signature-card { border: 1px solid #d1d5db; border-radius: 5px; padding: 7px 10px; height: 132px; }
        .signature-heading { font-size: 9px; font-weight: bold; color: #111827; margin-bottom: 2px; }
        .signature-note { font-size: 7.5px; color: #6b7280; margin-bottom: 3px; }
        .stamp-box {
            border: 1.5px dashed #9ca3af;
            border-radius: 4px;
            height: 52px;
            padding-top: 18px;
            text-align: center;
            color: #9ca3af;
            font-size: 7.5px;
            letter-spacing: 0.5px;
            margin: 2px 0 3px;
        }
        .signature-area { height: 52px; }
        .signature-line { border-top: 1px solid #374151; padding-top: 2px; font-size: 7.5px; color: #6b7280; }
        .signature-name { font-size: 8.5px; font-weight: bold; color: #111827; margin-top: 1px; }

        .footer {
            margin-top: 6px;
            padding-top: 4px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            font-size: 7.5px;
            color: #9ca3af;
        }
    </style>
</head>
<body>
    @php
        $numeroContrat = $reservation->numero_contrat ?: 'CTR-'.$reservation->numero;
        $agence = $reservation->agence;
        $client = $reservation->client;
        $vehicule = $reservation->vehicule;
        $jours = max(1, (int) $reservation->date_debut->diffInDays($reservation->date_fin));
        $pieceIdentite = $client->est_etranger ? $client->passeport : $client->cin;
        $cautionStatuts = [
            'bloquee' => 'Bloquee',
            'restituee' => 'Restituee',
            'retenue_partiellement' => 'Retenue partiellement',
            'non_bloquee' => 'Non bloquee',
        ];
        $modesPaiement = [
            'especes' => 'Especes',
            'cmi' => 'Carte bancaire (CMI)',
            'virement' => 'Virement',
            'cheque' => 'Cheque',
        ];
        // Identifiants legaux reels uniquement : la ligne disparait tant que
        // ENTREPRISE_RC / ENTREPRISE_IF / ENTREPRISE_ICE ne sont pas definis.
        $mentionsLegales = collect([
            config('entreprise.rc') ? 'RC : '.trim((string) config('entreprise.rc')) : null,
            config('entreprise.if') ? 'IF : '.trim((string) config('entreprise.if')) : null,
            config('entreprise.ice') ? 'ICE : '.trim((string) config('entreprise.ice')) : null,
        ])->filter()->implode(' - ');
    @endphp

    <table class="header">
        <tr>
            <td style="width: 55%;">
                <div class="brand-name">FIRAS BKA CAR</div>
                <div class="company-line">Location de vehicules</div>
                <div class="company-line">Lot 583N, Rue 50, Branes 1, Tanger 90060</div>
                <div class="company-line">Tel : +212 603 477 786 - firasbkacars@gmail.com</div>
            </td>
            <td class="doc-title" style="width: 45%;">
                <h1>CONTRAT DE LOCATION</h1>
                <div class="numero">N° {{ $numeroContrat }}</div>
                <div class="reservation">Reservation : {{ $reservation->numero }}</div>
                <div class="reservation">Edite le : {{ now()->format('d/m/Y') }}</div>
            </td>
        </tr>
    </table>

    <div class="reference-bar">
        Contrat de location de vehicule - document a imprimer, cacheter et signer par les deux parties lors de la remise des cles.
    </div>

    <div class="section">
        <div class="section-title">Parties au contrat</div>
        <table class="info-table">
            <tr>
                <td>
                    <div class="info-block">
                        <p><span class="label">Loueur</span></p>
                        <p class="value">FIRAS BKA CAR SARL</p>
                        <p>Lot 583N, Rue 50, Branes 1, Tanger 90060</p>
                        @if ($mentionsLegales !== '')
                            <p>{{ $mentionsLegales }}</p>
                        @endif
                        <p>Tel : +212 603 477 786</p>
                        @if ($agence)
                            <p class="muted">Agence de depart : {{ $agence->nom }} - {{ $agence->adresse }}, {{ $agence->ville }}</p>
                        @endif
                    </div>
                </td>
                <td>
                    <div class="info-block">
                        <p><span class="label">Locataire</span></p>
                        <p class="value">{{ $client->nom_complet }}</p>
                        <p>{{ $client->adresse ?: 'Tanger, Maroc' }}</p>
                        <p>CIN / Passeport : {{ $pieceIdentite ?: 'N/A' }}</p>
                        <p>Permis de conduire : {{ $client->permis_conduire ? 'Fourni et valide' : 'Non fourni' }}</p>
                        <p>Tel : {{ $client->telephone }} - Email : {{ $client->email }}</p>
                    </div>
                </td>
            </tr>
        </table>
    </div>

    <div class="section">
        <div class="section-title">Vehicule loue</div>
        <table class="data">
            <thead>
                <tr>
                    <th>Marque / Modele</th>
                    <th>Categorie</th>
                    <th>Annee</th>
                    <th>Transmission</th>
                    <th>Carburant</th>
                    <th>Places</th>
                    <th>Kilometrage</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>{{ $vehicule->marque }} {{ $vehicule->modele }}</td>
                    <td>{{ $vehicule->categorie }}</td>
                    <td>{{ $vehicule->annee }}</td>
                    <td>{{ ucfirst($vehicule->transmission) }}</td>
                    <td>{{ ucfirst($vehicule->carburant) }}</td>
                    <td>{{ $vehicule->places }}</td>
                    <td>{{ $vehicule->kilometrage ? number_format($vehicule->kilometrage, 0, ',', ' ').' km' : 'N/A' }}</td>
                </tr>
            </tbody>
        </table>
    </div>

    <div class="section">
        <div class="section-title">Conditions de location</div>
        <table class="info-table">
            <tr>
                <td>
                    <div class="info-block">
                        <p>Date et heure de debut : <span class="value">{{ $reservation->date_debut->format('d/m/Y H:i') }}</span></p>
                        <p>Lieu de prise en charge : <span class="value">{{ $reservation->lieu_prise }}</span></p>
                        <p>Mode de paiement : <span class="value">{{ $modesPaiement[$reservation->mode_paiement] ?? $reservation->mode_paiement }}</span></p>
                    </div>
                </td>
                <td>
                    <div class="info-block">
                        <p>Date et heure de fin : <span class="value">{{ $reservation->date_fin->format('d/m/Y H:i') }}</span></p>
                        <p>Lieu de retour : <span class="value">{{ $reservation->lieu_retour }}</span></p>
                        <p>Caution : <span class="value">{{ number_format($reservation->montant_caution, 2, ',', ' ') }} DH</span>
                            ({{ $cautionStatuts[$reservation->caution_statut] ?? $reservation->caution_statut }})</p>
                    </div>
                </td>
            </tr>
        </table>
    </div>

    @if ($reservation->conducteur_additionnel_nom)
    <div class="section">
        <div class="section-title">Conducteur additionnel autorise</div>
        <table class="info-table">
            <tr>
                <td>
                    <div class="info-block">
                        <p>Nom : <span class="value">{{ $reservation->conducteur_additionnel_nom }}</span></p>
                        <p>Telephone : <span class="value">{{ $reservation->conducteur_additionnel_telephone ?: 'N/A' }}</span></p>
                    </div>
                </td>
                <td>
                    <div class="info-block">
                        <p>Permis n° : <span class="value">{{ $reservation->conducteur_additionnel_permis }}</span></p>
                        <p>Assurance additionnelle : <span class="value">{{ $reservation->assurance_conducteur_additionnel ? 'Oui' : 'Non' }}</span></p>
                    </div>
                </td>
            </tr>
        </table>
    </div>
    @endif

    <div class="section">
        <div class="section-title">Conditions financieres</div>
        <table class="finance">
            <tr>
                <td>Prix journalier</td>
                <td class="right">{{ number_format($vehicule->prix_jour, 2, ',', ' ') }} DH</td>
            </tr>
            <tr>
                <td>Nombre de jours de location</td>
                <td class="right">{{ $jours }}</td>
            </tr>
            @if ($reservation->supplement_conducteur > 0)
            <tr>
                <td>Supplement conducteur additionnel</td>
                <td class="right">{{ number_format($reservation->supplement_conducteur, 2, ',', ' ') }} DH</td>
            </tr>
            @endif
            @if ($reservation->remise > 0)
            <tr>
                <td>Remise ({{ $reservation->code_promo }})</td>
                <td class="right">-{{ number_format($reservation->remise, 2, ',', ' ') }} DH</td>
            </tr>
            @endif
            <tr class="total">
                <td>Montant total du contrat</td>
                <td class="right">{{ number_format($reservation->prix_total, 2, ',', ' ') }} DH</td>
            </tr>
            <tr>
                <td>
                    Acompte attendu
                    @if ($reservation->acompte_paye > 0)
                        - regle : {{ number_format($reservation->acompte_paye, 2, ',', ' ') }} DH
                    @else
                        - non regle
                    @endif
                </td>
                <td class="right">{{ number_format($reservation->acompte, 2, ',', ' ') }} DH</td>
            </tr>
            @if ($reservation->rembourse > 0)
            <tr class="deposit">
                <td>Dont rembourse</td>
                <td class="right">-{{ number_format($reservation->rembourse, 2, ',', ' ') }} DH</td>
            </tr>
            @endif
            <tr>
                <td>Reste a payer</td>
                <td class="right">{{ number_format($reservation->solde_restant, 2, ',', ' ') }} DH</td>
            </tr>
            @if ((float) $reservation->montant_caution > 0)
            <tr>
                <td>Caution (remboursable apres etat des lieux de retour)</td>
                <td class="right">{{ number_format($reservation->montant_caution, 2, ',', ' ') }} DH</td>
            </tr>
            @endif
        </table>
    </div>

    <div class="terms">
        <h3>Conditions generales</h3>
        <ol>
            <li>Le locataire declare avoir recu le vehicule en bon etat de fonctionnement, avec les documents de circulation et le niveau de carburant indique lors de l'etat des lieux de depart.</li>
            <li>Le locataire s'engage a restituer le vehicule dans l'etat ou il l'a recu, usure normale exceptee, au lieu et a la date convenus.</li>
            <li>Le vehicule ne peut etre conduit que par le locataire designe ci-dessus
                @if ($reservation->conducteur_additionnel_nom)
                    ou par le conducteur additionnel autorise ({{ $reservation->conducteur_additionnel_nom }})
                @endif
                , titulaire d'un permis de conduire valide.</li>
            <li>Le locataire est responsable de toutes les infractions, amendes et frais de fourriere survenus pendant la periode de location.</li>
            <li>En cas de retard de restitution, des penalites de 50% du tarif journalier seront appliquees par jour de retard, sans prejudice des dommages causes au vehicule.</li>
            <li>Le locataire s'engage a signaler tout incident, accident ou dommage dans les plus brefs delais et a fournir un constat amiable en cas d'accident.</li>
            <li>La caution est bloquee a la reservation. Elle est restituee apres etat des lieux de retour, deduction faite des eventuels dommages, amendes ou frais restes a la charge du locataire.</li>
            <li>Le contrat est soumis au droit marocain. Les tribunaux de Tanger sont competents en cas de litige.</li>
        </ol>
    </div>

    <div class="fait-a">
        Fait a {{ $agence->ville ?? 'Tanger' }}, le {{ now()->format('d/m/Y') }}
    </div>

    <table class="signature-table">
        <tr>
            <td>
                <div class="signature-card">
                    <div class="signature-heading">Le locataire</div>
                    <div class="signature-note">Signature precedee de la mention manuscrite « Lu et approuve »</div>
                    <div class="signature-area"></div>
                    <div class="signature-line">Signature</div>
                    <div class="signature-name">{{ $client->nom_complet }}</div>
                </div>
            </td>
            <td>
                <div class="signature-card">
                    <div class="signature-heading">Le loueur</div>
                    <div class="stamp-box">CACHET DE L'AGENCE</div>
                    <div class="signature-line">Signature et cachet</div>
                    <div class="signature-name">FIRAS BKA CAR</div>
                </div>
            </td>
        </tr>
    </table>

    <div class="footer">
        Contrat N° {{ $numeroContrat }} - Reservation N° {{ $reservation->numero }} - FIRAS BKA CAR
        - Lot 583N, Rue 50, Branes 1, Tanger 90060 - Tel : +212 603 477 786
    </div>
</body>
</html>

# FIRAS BKA CAR — Roadmap Features & Corrections

## Phase 0 — Securite & Corrections Critiques (URGENT)

### Corrections critiques a implementer en premier

| ID | Priorite | Description | Fichiers concerns | Statut |
|----|----------|-------------|-------------------|--------|
| S1 | CRITIQUE | Supprimer `.env` du git, rotater APP_KEY, ajouter a `.gitignore` | `backend/.env`, `.gitignore` | FAIT (.env non tracke, gitignore OK; APP_KEY a rotater en prod) |
| S2 | CRITIQUE | Ajouter middleware admin sur toutes les routes admin | `backend/routes/api.php`, `AdminMiddleware` | FAIT |
| S3 | CRITIQUE | Corriger race condition reservation (double booking) | `ReservationController@store` | FAIT (DB::transaction + lockForUpdate + conflit dates) |
| S4 | CRITIQUE | Securiser endpoint `validerPermis` (admin uniquement) | `ClientAuthController`, routes | FAIT (groupe admin) |
| S5 | CRITIQUE | Securiser `GET /reservations/{numero}` — ajouter auth | `routes/api.php` | FAIT (auth + ownership) |
| S6 | CRITIQUE | Ajouter signature webhook WhatsApp | `WhatsAppController` | FAIT (HMAC X-Hub-Signature-256) |
| S7 | CRITIQUE | Creer vues PDF manquantes ou desactiver | `resources/views/pdf/` | FAIT (facture + contrat) |
| S8 | CRITIQUE | Corriger `downloadContrat` — verifier role utilisateur | `FactureController` | FAIT (admin ou proprietaire) |

---

## Phase 1 — Securite & Robustesse

### Authentification & Autorisation

| ID | Description | Statut |
|----|-------------|--------|
| A1 | Middleware admin (verifier `instanceof User` vs `Client`) | FAIT |
| A2 | Roles & permissions (admin, employe, client) | A FAIRE (admin vs client via User/Client) |
| A3 | Verification email a l'inscription client | FAIT |
| A4 | Token expiration Sanctum (ex: 24h client, 8h admin) | A FAIRE |
| A5 | Journalisation des tentatives de connexion echouees | FAIT |
| A6 | Blocage apres 5 tentatives echouees | FAIT (5 essais / 15 min, admin + client) |

### Validation & Securite des donnees

| ID | Description | Statut |
|----|-------------|--------|
| D1 | Ajouter indexes SQL sur `reservations.statut`, `paiements.statut`, `paiements.date_paiement`, `reservations.code_promo` | FAIT |
| D2 | Transaction atomique sur creation reservation | FAIT |
| D3 | Sanitisation entrees utilisateur (WhatsApp, notes) | PARTIEL (validation FormRequest) |
| D4 | Headers securite (CSP, X-Frame-Options, HSTS) | FAIT (SecurityHeaders) |
| D5 | Protection CSRF sur routes web | FAIT (middleware web Laravel) |

---

## Phase 2 — Fonctionnalites Manquantes Critiques

### Gestion des agences

| ID | Description | Statut |
|----|-------------|--------|
| F1 | CRUD Agences (Admin) — Controller + page admin | FAIT (page admin, modale partagee + toasts, AgenceFactory + AgenceApiTest) |
| F2 | Selection d'agence dans le formulaire de reservation | FAIT (agence pre-remplie depuis le vehicule, lieu derive cote backend, agence inactive refusee) |
| F3 | Filtrage des vehicules par agence | FAIT (filtre public + champ agence dans le form admin vehicule) |
| F4 | Affichage agence sur le profil client | FAIT (eager-load agence + affichage dans l'historique) |

### Systeme de notification

| ID | Description | Statut |
|----|-------------|--------|
| N1 | Configurer le scheduler Laravel pour les rappels | FAIT (schedule:work + queue:work dans Dockerfile, reservations:reminders + permis:verifier avec withoutOverlapping) |
| N2 | Email de confirmation (existant, a verifier) | EXISTANT |
| N3 | Email de rappel 24h avant prise en charge | FAIT (reservations:reminders schedulé 08:00, SendReservationReminder) |
| N4 | Email de rappel jour du retour | FAIT (même job, rappel « jour » + « 24h », rappel unique) |
| N5 | Notification admin nouvelle reservation | FAIT (AdminNewReservation mailable) |
| N6 | Notification admin annulation client | FAIT (AdminReservationCancelled + dispatch dans annulerParClient) |
| N7 | Notification client validation/rejet permis | FAIT (PermisValidation mailable) |
| N8 | SMS pour rappels (Twilio/AfricaTalking) | IGNORE (fournisseur payant, hors perimetre) |

### Gestion des permis

| ID | Description | Statut |
|----|-------------|--------|
| P1 | Champ date expiration permis sur clients | FAIT (migration + Client model + updateProfile + formulaire profil) |
| P2 | Verification automatique expiration | FAIT (permisExpire() + garde dans store + validerPermis refuse expire) |
| P3 | Notification avant expiration permis | FAIT (VerifierExpirationPerm commande + PermisExpirationReminder, rappel unique) |

---

## Phase 3 — Ameliorations Frontend

### Pages existantes a ameliorer

| ID | Page | Description | Statut |
|----|------|-------------|--------|
| U1 | Confirmation | Recuperer reservation par numero si refresh (pas de state) | FAIT (`?numero=`) |
| U2 | Contact | Implementer le vrai formulaire de contact (API + email) | FAIT |
| U3 | Home | Ajouter skeleton loading pour vehicules populaires | FAIT (VehicleCardSkeleton + section render avec aria-busy) |
| U4 | VehiculeDetail | Afficher disponibilite en temps reel | EXISTANT |
| U5 | Profil | Afficher photo profil (colonne manquante) | FAIT (upload avatar + colonne photo_profil + chemin /storage/) |

### Pages manquantes

| ID | Page | Description | Statut |
|----|------|-------------|--------|
| U6 | 404 | Page d'erreur personnalisee | FAIT |
| U7 | ErrorBoundary | Composant React pour erreurs runtime | FAIT |
| U8 | Admin Agences | Gestion des agences | FAIT (CRUD) |
| U9 | Client Dashboard | Historique depenses, vehicules favoris | FAIT (FavorisContext + TableauDeBord + coeur sur cartes) |

### UX/UI

| ID | Description | Statut |
|----|-------------|--------|
| UX1 | Lazy loading images vehicules | FAIT (loading="lazy" sur Home, Compare, Confirmation, Finalisation, TableauDeBord) |
| UX2 | Skeleton loading sur toutes les pages | FAIT (Confirmation + Home populaires; autres pages ont deja des skeletons) |
| UX3 | Toast notifications systematiques | FAIT (ConfirmContext + migration de tous les alert/confirm admin + Profil utilise useToast) |
| UX4 | Confirmation avant action destructive | EXISTANT |
| UX5 | Responsive mobile optimise | EXISTANT |

---

## Phase 4 — Fonctionnalites Metier Avancees

### Gestion des caution

| ID | Description | Statut |
|----|-------------|--------|
| C1 | Blocage caution a la reservation | PARTIEL (donnee existe) |
| C2 | Verification etat lieux retour | A FAIRE |
| C3 | Restitution partielle/complete avec motif | A FAIRE |
| C4 | Historique des cautions sur admin | A FAIRE |

### Etat des lieux

| ID | Description | Statut |
|----|-------------|--------|
| E1 | Interface mobile-friendly pour agent | A FAIRE |
| E2 | Prise de photos (camera navigateur) | A FAIRE |
| E3 | Comparaison avant/apres | A FAIRE |
| E4 | Rattacher a la facturation | A FAIRE |

### Prolongation

| ID | Description | Statut |
|----|-------------|--------|
| PR1 | Bouton prolonger depuis profil client | PARTIEL (API existe) |
| PR2 | Verification disponibilite automatique | EXISTANT |
| PR3 | Generation paiement complémentaire | A FAIRE |
| PR4 | Mise a jour contrat | A FAIRE |

### Conducteur additionnel

| ID | Description | Statut |
|----|-------------|--------|
| CD1 | Inclure dans le contrat PDF | A FAIRE |
| CD2 | Verification permis conducteur additionnel | A FAIRE |
| CD3 | Assurance conducteur additionnel | A FAIRE |

---

## Phase 5 — Rapports & Analytics

### Tableau de bord admin

| ID | Description | Statut |
|----|-------------|--------|
| R1 | Taux d'occupation par vehicule | FAIT (DashboardController::tauxOccupation + page Rapports) |
| R2 | Revenu par vehicule (rentabilite) | FAIT (meme endpoint, revenu_total) |
| R3 | Graphique evolution mensuelle | EXISTANT (Rapports.jsx, reservations par mois) |
| R4 | Top vehicules les plus demandes | FAIT (RapportController::synthese, top_vehicules) |
| R5 | Clients les plus fideles | FAIT (RapportController::synthese, top_clients) |
| R6 | Taux d'annulation | FAIT (RapportController::synthese, taux_annulation) |
| R7 | Duree moyenne de location | FAIT (RapportController::synthese, duree_moyenne_jours) |
| R8 | Export rapports PDF | FAIT (exportPdf + vue pdf.rapport.blade.php) |

### Rapports financiers

| ID | Description | Statut |
|----|-------------|--------|
| F1 | Chiffre d'affaires par periode | EXISTANT (DashboardController::stats) |
| F2 | Detail par mode de paiement | FAIT (synthese, paiements_par_methode) |
| F3 | Suivi des remboursements | FAIT (remboursements endpoint + tableau admin) |
| F4 | Previsionnel de revenus | FAIT (previsions endpoint, encaisse/attendu/solde) |

---

## Phase 6 — Infrastructure & DevOps

### Deploiement

| ID | Description | Statut |
|----|-------------|--------|
| I1 | Corriger Dockerfile (php-fpm au lieu de cli) | FAIT (`php:8.3-cli` + `artisan serve` + workers, adapté Fly.io machine unique) |
| I2 | Configurer render.yaml (APP_URL) | IGNORE (deploiement sur Fly.io via `fly.toml`, pas Render) |
| I3 | Ajouter SESSION_DOMAIN et SANCTUM_STATEFUL_DOMAINS | FAIT (`fly.toml` : SESSION_DOMAIN + SANCTUM_STATEFUL_DOMAINS) |
| I4 | Pipeline CI/CD (GitHub Actions) | FAIT (`.github/workflows/ci.yml` : tests backend sqlite + lint/build frontend) |
| I5 | Variables d'env completes dans .env.example | FAIT (CMI_* complets, WhatsApp, storage, FRONTEND_URL) |

### Monitoring

| ID | Description | Statut |
|----|-------------|--------|
| M1 | Logging des erreurs (Sentry/Bugsnag) | A FAIRE |
| M2 | Monitoring performance (New Relic) | A FAIRE |
| M3 | Alertes emails serveur | A FAIRE |

### Tests

| ID | Description | Statut |
|----|-------------|--------|
| T1 | Tests unitaires modeles | FAIT (ReservationTest) |
| T2 | Tests feature controllers | FAIT (ReservationApi, Security, PaymentFlow, AgenceApi, PermisNotification, RapportApi — 88 tests) |
| T3 | Tests frontend (Vitest) | A FAIRE |
| T4 | Tests E2E (Playwright) | A FAIRE |

---

## Phase 7 — Fonctionnalites Futures

### Enrichissement

| ID | Description | Priorite |
|----|-------------|----------|
| V1 | Programme de fidelite ameliore (paliers visuels) | MOYEN |
| V2 | Systeme de parrainage | MOYEN |
| V3 | Paiement en ligne reel (CMI/Stripe) | HAUT |
| V4 | Application mobile (React Native) | BAS |
| V5 | Multi-langue (FR/AR/EN) | BAS |
| V6 | Geolocalisation vehicules | BAS |
| V7 | Integration GPS temps reel | BAS |
| V8 | Chat en direct (pas juste WhatsApp) | MOYEN |
| V9 | Systeme d'avis ameliore (photos + moderation) | MOYEN |
| V10 | Comparateur avance avec filtres | BAS |

### Gestion flotte

| ID | Description | Priorite |
|----|-------------|----------|
| G1 | Suivi assurance vehicules (expiration) | HAUT |
| G2 | Suivi carte grise (expiration) | HAUT |
| G3 | Planning entretien automatique | MOYEN |
| G4 | Alertes kilometrage | BAS |
| G5 | Gestion des contrats fournisseurs | BAS |

---

## Statut global du projet

| Phase | Termines | En cours | A faire |
|-------|----------|----------|---------|
| Phase 0 (Securite) | 8 | 0 | 0 |
| Phase 1 (Robustesse) | 7 | 0 | 4 |
| Phase 2 (Fonctions manquantes) | 14 | 0 | 4 (N8 ignore) |
| Phase 3 (Frontend) | 14 | 0 | 0 |
| Phase 4 (Metier avance) | 3 | 0 | 11 |
| Phase 5 (Rapports) | 12 | 0 | 0 |
| Phase 6 (Infra) | 6 | 0 | 5 (I2 ignore) |
| Phase 7 (Futur) | 0 | 0 | 15 |

**Total : 89 taches | 64 terminees | 0 en cours | 25 a faire**

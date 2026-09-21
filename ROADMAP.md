# FIRAS BKA CAR — Roadmap Features & Corrections

## Phase 0 — Securite & Corrections Critiques (URGENT)

### Corrections critiques a implementer en premier

| ID | Priorite | Description | Fichiers concerns |
|----|----------|-------------|-------------------|
| S1 | CRITIQUE | Supprimer `.env` du git, rotater APP_KEY, ajouter a `.gitignore` | `backend/.env`, `.gitignore` |
| S2 | CRITIQUE | Ajouter middleware admin sur toutes les routes admin | `backend/routes/api.php`, nouveau `AdminMiddleware` |
| S3 | CRITIQUE | Corriger race condition reservation (double booking) | `ReservationController@store` — `DB::transaction()` + `lockForUpdate()` |
| S4 | CRITIQUE | Securiser endpoint `validerPermis` (admin uniquement) | `ClientAuthController`, routes |
| S5 | CRITIQUE | Securiser `GET /reservations/{numero}` — ajouter auth | `routes/api.php` |
| S6 | CRITIQUE | Ajouter signature webhook WhatsApp | `WhatsAppController` |
| S7 | CRITIQUE | Creer vues PDF manquantes ou desactiver | `resources/views/pdf/` |
| S8 | CRITIQUE | Corriger `downloadContrat` — verifier role utilisateur | `FactureController` |

---

## Phase 1 — Securite & Robustesse

### Authentification & Autorisation

| ID | Description | Statut |
|----|-------------|--------|
| A1 | Middleware admin (verifier `instanceof User` vs `Client`) | A FAIRE |
| A2 | Roles & permissions (admin, employe, client) | A FAIRE |
| A3 | Verification email a l'inscription client | A FAIRE |
| A4 | Token expiration Sanctum (ex: 24h client, 8h admin) | A FAIRE |
| A5 | Journalisation des tentatives de connexion echouees | A FAIRE |
| A6 | Blocage apres 5 tentatives echouees | A FAIRE |

### Validation & Securite des donnees

| ID | Description | Statut |
|----|-------------|--------|
| D1 | Ajouter indexes SQL sur `reservations.statut`, `paiements.statut`, `paiements.date_paiement`, `reservations.code_promo` | A FAIRE |
| D2 | Transaction atomique sur creation reservation | A FAIRE |
| D3 | Sanitisation entrees utilisateur (WhatsApp, notes) | A FAIRE |
| D4 | Headers securite (CSP, X-Frame-Options, HSTS) | A FAIRE |
| D5 | Protection CSRF sur routes web | A FAIRE |

---

## Phase 2 — Fonctionnalites Manquantes Critiques

### Gestion des agences

| ID | Description | Statut |
|----|-------------|--------|
| F1 | CRUD Agences (Admin) — Controller + page admin | A FAIRE |
| F2 | Selection d'agence dans le formulaire de reservation | A FAIRE |
| F3 | Filtrage des vehicules par agence | A FAIRE |
| F4 | Affichage agence sur le profil client | A FAIRE |

### Systeme de notification

| ID | Description | Statut |
|----|-------------|--------|
| N1 | Configurer le scheduler Laravel pour les rappels | A FAIRE |
| N2 | Email de confirmation (existant, a verifier) | EXISTANT |
| N3 | Email de rappel 24h avant prise en charge | EXISTANT (non调度) |
| N4 | Email de rappel jour du retour | EXISTANT (non调度) |
| N5 | Notification admin nouvelle reservation | A FAIRE |
| N6 | Notification admin annulation client | A FAIRE |
| N7 | Notification client validation/rejet permis | A FAIRE |
| N8 | SMS pour rappels (Twilio/AfricaTalking) | A FAIRE |

### Gestion des permis

| ID | Description | Statut |
|----|-------------|--------|
| P1 | Champ date expiration permis sur clients | A FAIRE |
| P2 | Verification automatique expiration | A FAIRE |
| P3 | Notification avant expiration permis | A FAIRE |

---

## Phase 3 — Ameliorations Frontend

### Pages existantes a ameliorer

| ID | Page | Description | Statut |
|----|------|-------------|--------|
| U1 | Confirmation | Recuperer reservation par numero si refresh (pas de state) | A FAIRE |
| U2 | Contact | Implementer le vrai formulaire de contact (API + email) | A FAIRE |
| U3 | Home | Ajouter skeleton loading pour vehicules populaires | A FAIRE |
| U4 | VehiculeDetail | Afficher disponibilite en temps reel | EXISTANT |
| U5 | Profil | Afficher photo profil (colonne manquante) | A FAIRE |

### Pages manquantes

| ID | Page | Description | Statut |
|----|------|-------------|--------|
| U6 | 404 | Page d'erreur personnalisee | A FAIRE |
| U7 | ErrorBoundary | Composant React pour erreurs runtime | A FAIRE |
| U8 | Admin Agences | Gestion des agences | A FAIRE |
| U9 | Client Dashboard | Historique depenses, vehicules favoris | A FAIRE |

### UX/UI

| ID | Description | Statut |
|----|-------------|--------|
| UX1 | Lazy loading images vehicules | PARTIEL |
| UX2 | Skeleton loading sur toutes les pages | A FAIRE |
| UX3 | Toast notifications systematiques | A FAIRE |
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
| R1 | Taux d'occupation par vehicule | A FAIRE |
| R2 | Revenu par vehicule (rentabilite) | A FAIRE |
| R3 | Graphique evolution mensuelle | EXISTANT |
| R4 | Top vehicules les plus demandes | A FAIRE |
| R5 | Clients les plus fideles | A FAIRE |
| R6 | Taux d'annulation | A FAIRE |
| R7 | Duree moyenne de location | A FAIRE |
| R8 | Export rapports PDF | A FAIRE |

### Rapports financiers

| ID | Description | Statut |
|----|-------------|--------|
| F1 | Chiffre d'affaires par periode | EXISTANT |
| F2 | Detail par mode de paiement | A FAIRE |
| F3 | Suivi des remboursements | A FAIRE |
| F4 | Previsionnel de revenus | A FAIRE |

---

## Phase 6 — Infrastructure & DevOps

### Deploiement

| ID | Description | Statut |
|----|-------------|--------|
| I1 | Corriger Dockerfile (php-fpm au lieu de cli) | A FAIRE |
| I2 | Configurer render.yaml (APP_URL) | A FAIRE |
| I3 | Ajouter SESSION_DOMAIN et SANCTUM_STATEFUL_DOMAINS | A FAIRE |
| I4 | Pipeline CI/CD (GitHub Actions) | A FAIRE |
| I5 | Variables d'env completes dans .env.example | A FAIRE |

### Monitoring

| ID | Description | Statut |
|----|-------------|--------|
| M1 | Logging des erreurs (Sentry/Bugsnag) | A FAIRE |
| M2 | Monitoring performance (New Relic) | A FAIRE |
| M3 | Alertes emails serveur | A FAIRE |

### Tests

| ID | Description | Statut |
|----|-------------|--------|
| T1 | Tests unitaires modeles | A FAIRE |
| T2 | Tests feature controllers | A FAIRE |
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
| Phase 0 (Securite) | 2 | 0 | 6 |
| Phase 1 (Robustesse) | 0 | 0 | 11 |
| Phase 2 (Fonctions manquantes) | 3 | 0 | 15 |
| Phase 3 (Frontend) | 5 | 0 | 9 |
| Phase 4 (Metier avance) | 3 | 0 | 11 |
| Phase 5 (Rapports) | 2 | 0 | 10 |
| Phase 6 (Infra) | 0 | 0 | 12 |
| Phase 7 (Futur) | 0 | 0 | 15 |

**Total : 89 taches | 15 terminees | 0 en cours | 74 a faire**

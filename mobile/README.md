# FIRAS BKA CAR — Application mobile (V4)

Scaffold **Expo / React Native** branchant l'API Laravel existante
(`/api/vehicules`, `/api/vehicules/:id`, `/api/client/login`).

## Lancer

```bash
cd mobile
npm install
npm start          # Expo Dev Tools
```

Remplacer `BASE_URL` dans `src/api.js` selon l'environnement :

- Dev local : `http://<IP-machine>:8000/api` (pas `localhost` sur appareil physique)
- Prod : `https://firasbkacar.fly.dev/api`

## Ecrans inclus

| Ecran | Fichier | Description |
|-------|---------|-------------|
| Catalogue | `src/screens/Home.js` | Liste des véhicules disponibles |
| Détails | `src/screens/VehicleDetail.js` | Fiche véhicule + CTA Réserver |
| Connexion | `src/screens/Login.js` | Login client (token stocké via AsyncStorage) |
| Inscription | `src/screens/Register.js` | Création de compte client |
| Réservation | `src/screens/ReservationForm.js` | Dates, lieux, paiement (espèces/CMI), code promo |
| Confirmation | `src/screens/Confirmation.js` | Succès + paiement CMI (browser + polling) |
| Mes réservations | `src/screens/MesReservations.js` | Liste avec statuts, rafraîchissement |
| Détail réservation | `src/screens/ReservationDetail.js` | Détails + annulation (politique de remboursement) |
| Mon compte | `src/screens/Profil.js` | Profil, permis (upload), photo, fidélité, déconnexion |
| Messagerie | `src/screens/Messagerie.js` | Fil client ↔ admin (polling 10 s) |

Auth centralisée dans `src/auth.js` (contexte React + AsyncStorage).

## Suite (hors scope actuel)

- Prolongation de réservation (API déjà disponible)
- Favoris (API déjà disponible)
- Notifications push
- Mode hors-ligne

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
| Détails | `src/screens/VehicleDetail.js` | Fiche véhicule |
| Connexion | `src/screens/Login.js` | Login client (token stocké via AsyncStorage) |

## Suite (hors scope de ce scaffold)

- Réservation / finalisation
- Profil + permis
- Messagerie (V8)
- Notifications push
- Mode hors-ligne

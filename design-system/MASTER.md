# FIRAS BKA CAR — Design System

**Version 1.0 — octobre 2026**
Source de vérité des tokens : [`frontend/src/index.css`](../frontend/src/index.css) (`@theme`).
Ce document décrit les règles ; le code reste la référence pour les valeurs.

---

## 1. Positionnement et principes

FIRAS BKA CAR loue des voitures à Tanger. Le site doit inspirer la **confiance**
(prix clair, caution expliquée, véhicules réels, avis) et rendre la réservation
**évidente**, surtout sur mobile.

Cinq principes, dans l'ordre de priorité :

1. **Le véhicule est le héros.** Photo, prix, disponibilité et CTA avant tout le reste.
2. **La confiance se prouve.** Transparence sur la caution, l'assurance, le carburant
   et les conditions ; contact visible ; avis clients.
3. **Une action principale par écran.** Un seul bouton rouge dominant ; le reste est
   secondaire ou discret.
4. **Premium sombre, pas clinquant.** Fond noir, bordures nettes, peu d'ombres,
   animations discrètes. Le luxe se lit dans l'espace et la typographie, pas dans
   les dégradés.
5. **Mobile-first.** 375 px d'abord, cibles tactiles de 44 px, pas de zoom iOS.

> Recommandation du skill UI/UX Pro Max : **Minimalisme / Swiss Style** + palette
> **Automotive / Car Dealership** (« premium dark + action red »). On écarte le style
> « Motion-Driven » : une site de réservation doit rassurer, pas faire une démo
> d'animations.

---

## 2. Couleurs

### 2.1 Marque et action

| Token | Hex | Usage | Contraste |
|---|---|---|---|
| `primary` | `#DC2626` | Fond des CTA, accents forts | Texte blanc dessus : **4.83:1** (AA) |
| `primary-dark` | `#B91C1C` | Survol / actif du CTA | Blanc dessus : **6.47:1** |
| `primary-light` | `#EF4444` | **Texte rouge sur fond sombre** | 5.26:1 sur `#0A0A0A`, 4.90:1 sur `#141414` |

**Règle absolue :** `#DC2626` ne s'utilise **jamais comme texte** sur fond sombre
(4.10:1, échoue AA). Pour un texte rouge, utiliser `text-primary-light`.

### 2.2 Surfaces

| Token | Hex | Usage |
|---|---|---|
| `dark-bg` | `#0A0A0A` | Fond de page |
| `surface` | `#141414` | Cartes, panneaux, sections |
| `surface-raised` | `#1C1C1C` | Modales, menus, popovers |
| `surface-hover` | `#262626` | Survol d'une surface |
| `line` | `#2A2A2A` | Séparateurs décoratifs, bordures de cartes |
| `line-strong` | `#737373` | **Bordures de champs** (3.19:1 sur `#262626`, 3.89:1 sur `#141414`) |

Les champs de formulaire utilisent `bg-neutral-800` (`#262626`) + `border-line-strong`.
Ne pas utiliser `line` comme bordure de champ : contraste insuffisant (1.4:1).

### 2.3 Texte

| Token | Hex | Usage | Contraste |
|---|---|---|---|
| `white` | `#FFFFFF` | Titres, texte principal | 19:1 sur le fond |
| `muted` | `#A3A3A3` | Texte secondaire, légendes | 7.85:1 fond / 7.30:1 carte / 6.0:1 champ |
| `ink-subtle` | `#8A8A8A` | Texte tertiaire **sur fond/carte uniquement** | 5.34:1 carte — **4.38:1 sur champ `#262626`, insuffisant** |
| `placeholder` | `#8A8A8A` | Placeholders | 5.47:1 sur `#111` |
| `disabled` | `#4A4A4A` | Éléments désactivés uniquement | Exempté WCAG, doit rester lisible comme désactivé |

Ne pas utiliser `text-white/60` ou `text-gray-400` : ces valeurs n'ont pas de
contraste documenté. Utiliser `text-muted` ou `text-ink-subtle`.

### 2.4 États sémantiques

| Token | Hex | Fond doux | Bordure douce |
|---|---|---|---|
| `success` | `#22C55E` | `bg-success/10` | `border-success/20` |
| `warning` | `#F59E0B` | `bg-warning/10` | `border-warning/20` |
| `info` | `#38BDF8` | `bg-info/10` | `border-info/20` |
| `danger` | `#EF4444` | `bg-danger/10` | `border-danger/20` |

Recette d'un badge d'état :
`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium`
+ `bg-{état}/10 border-{état}/20 text-{état}`.

**Ne jamais transmettre une information par la couleur seule** : ajouter une icône
ou un libellé.

### 2.5 Graphiques

| Token | Hex |
|---|---|
| `chart-1` | `#EF4444` |
| `chart-2` | `#F59E0B` |
| `chart-3` | `#38BDF8` |
| `chart-4` | `#22C55E` |
| `chart-5` | `#A78BFA` |
| `chart-6` | `#94A3B8` |

Grille : `#2A2A2A`. Axes et légendes : `text-muted`. Tooltip : `bg-surface-raised`
+ `border-line`. Fournir un tableau alternatif pour l'accessibilité.

---

## 3. Typographie

**Famille unique : Inter** (400, 500, 600, 700, 800), chargée dans `index.html`.
Fallback : `system-ui, -apple-system, sans-serif`. Pas de deuxième police : elle
coûterait un téléchargement sans améliorer la lisibilité.

| Rôle | Classes | Taille / interligne | Graisse |
|---|---|---|---|
| Display (hero) | `text-4xl md:text-6xl font-extrabold tracking-tight` | 36 → 60 px / 1.05 | 800 |
| H1 (page) | `text-2xl md:text-3xl font-bold tracking-tight` | 24 → 30 px / 1.2 | 700 |
| H2 (section) | `text-xl md:text-2xl font-semibold` | 20 → 24 px / 1.3 | 600 |
| H3 (carte) | `text-base font-semibold` | 16 px / 1.4 | 600 |
| Corps public | `text-base leading-relaxed` | 16 px / 1.6 | 400 |
| Corps admin | `text-sm` | 14 px / 1.5 | 400 |
| Légende | `text-xs` | 12 px / 1.4 | 400–500 |
| Prix | `text-lg font-bold tabular-nums` | 18 px | 700 |

Règles :

- **16 px minimum** pour le corps sur le site public et pour les champs sur mobile
  (évite le zoom automatique iOS).
- **12 px minimum** : supprimer `text-[10px]` et `text-[11px]` (sauf badge numérique
  de notification, qui peut rester à 11 px).
- Longueur de ligne : 60–75 caractères sur desktop, 35–60 sur mobile.
- Chiffres alignés : `tabular-nums` pour les prix, dates, compteurs et tableaux.
- Pas de `letter-spacing` négatif sur le corps de texte.

---

## 4. Espacement, grille et layout

Échelle de 4 px : `1=4, 2=8, 3=12, 4=16, 5=20, 6=24, 8=32, 10=40, 12=48, 16=64`.

| Contexte | Règle |
|---|---|
| Conteneur public | `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8` |
| Section publique | `py-16 md:py-24` |
| Grille de cartes | `grid gap-4 md:gap-6` |
| Page admin | `p-4 md:p-6`, `space-y-4` |
| Carte | `p-4 md:p-5` |
| Formulaire | `space-y-4`, label → champ → aide/erreur |
| Header fixe | réserver `pt-24` (le header fait 64–80 px) |

Breakpoints : **375 / 640 / 768 / 1024 / 1280 / 1440**. Concevoir d'abord à 375 px.
Interdits : largeur fixe en px sur un conteneur, scroll horizontal, `100vh`
(préférer `min-h-dvh`), zoom désactivé.

---

## 5. Rayons, bordures, ombres

| Élément | Rayon |
|---|---|
| Bouton, champ, select | `rounded-xl` (12 px) |
| Carte, panneau | `rounded-2xl` (16 px) |
| Modale desktop | `rounded-2xl` |
| Modale mobile | `rounded-t-2xl` (bottom sheet) |
| Badge, pastille | `rounded-full` |
| Icône dans un carré | `rounded-xl` |
| Petit chip | `rounded-lg` (8 px) |

Ne pas mélanger `rounded-lg` et `rounded-xl` pour un même type de contrôle.
Bordures : 1 px. Survol : `border-neutral-700`. Ombres : **aucune ombre sur les
cartes** (la bordure suffit) ; `shadow-2xl` réservé aux modales, menus et toasts.
Focus : contour blanc 2 px, offset 2 px (déjà global dans `index.css`).

---

## 6. Iconographie

- **Lucide React uniquement**, jamais d'emoji comme icône structurelle.
- Tailles : 16 (inline), 18 (boutons/nav), 20 (en-têtes), 24 (états vides).
- Stroke par défaut (2). Ne pas mélanger filled et outline au même niveau.
- Bouton icône seule : `aria-label` obligatoire + zone de clic ≥ 44×44 px.
- Icône décorative : `aria-hidden="true"`.

---

## 7. Mouvement

| Interaction | Durée | Courbe |
|---|---|---|
| Survol, changement de couleur | 150–200 ms | `ease-out` |
| Toast, modale, panneau | 200–250 ms | `cubic-bezier(0.16, 1, 0.3, 1)` |
| Transition de page | ≤ 300 ms | `ease-out` |

- Animer uniquement `transform` et `opacity` (jamais `width`, `height`, `top`, `left`).
- Pas d'animation purement décorative ; le mouvement exprime une cause-effet.
- `prefers-reduced-motion` déjà géré globalement : toute nouvelle animation doit
  être ajoutée au bloc existant.
- Pas d'animation qui bloque l'interaction ou provoque un décalage de mise en page.

---

## 8. Composants

### 8.1 Boutons

**Base commune**

```
inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 py-2.5
text-sm font-semibold transition-colors
focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white
disabled:pointer-events-none disabled:opacity-50
```

| Variante | Classes complémentaires |
|---|---|
| Primaire | `bg-primary text-white hover:bg-primary-dark` |
| Secondaire | `border border-neutral-700 bg-neutral-800 text-white hover:bg-neutral-700` |
| Fantôme | `text-muted hover:bg-white/5 hover:text-white` |
| Danger | `border border-danger/30 bg-danger/10 text-danger hover:bg-danger/15` |
| Lien | `min-h-0 px-0 py-0 text-primary-light hover:text-white` |

Tailles : `sm` → `min-h-9 px-3 text-xs` ; `md` (défaut) → ci-dessus ;
`lg` → `min-h-12 px-6 text-base`.

Règles : **un seul bouton primaire par écran** ; pendant une requête, désactiver
le bouton et afficher un spinner (`Loader2 animate-spin`) ; ne jamais laisser un
bouton cliquable sans retour visuel.

### 8.2 Champs de formulaire

```html
<label class="mb-1.5 block text-sm font-medium text-white">
  Téléphone <span class="text-primary-light" aria-hidden="true">*</span>
</label>
<input
  class="min-h-11 w-full rounded-xl border border-line-strong bg-neutral-800 px-4
         text-base text-white placeholder:text-placeholder transition-colors
         focus:border-primary focus:outline-none sm:text-sm"
  aria-describedby="tel-aide tel-erreur"
/>
<p id="tel-aide" class="mt-1.5 text-xs text-ink-subtle">Format : 0612345678</p>
<p id="tel-erreur" class="mt-1.5 flex items-center gap-1 text-xs text-danger">
  <AlertCircle size={14} aria-hidden="true" /> Le numéro est invalide.
</p>
```

- Label **visible** au-dessus du champ (jamais un placeholder comme label).
- Erreur **sous le champ**, avec `aria-invalid="true"` et `aria-describedby`.
- Aide persistante pour les champs complexes (CIN, permis, caution).
- `select` : mêmes styles + chevron Lucide, `appearance-none`.
- `textarea` : `min-h-28 py-3`.
- Checkbox/radio : 20 px, `accent-primary`, ligne cliquable de 44 px.
- Valider au `blur`, pas à chaque frappe. Après erreur de soumission, focus sur le
  premier champ invalide.
- Sur mobile, les champs doivent être à **16 px** pour éviter le zoom iOS.

### 8.3 Carte véhicule

```
group overflow-hidden rounded-2xl border border-line bg-surface
transition-colors hover:border-neutral-700
```

- Image `aspect-[16/10] object-cover`, `loading="lazy"` sauf le premier écran.
- Badge disponibilité en haut à gauche ; favori en haut à droite (44 px).
- Contenu `p-4 md:p-5` : marque/modèle (`text-base font-semibold`), specs
  (`text-xs text-muted`), prix (`text-lg font-bold tabular-nums`) + `/jour`.
- CTA pleine largeur en bas ou flèche circulaire ; toute la carte est cliquable
  mais le CTA reste un lien réel (pas un `div` avec `onClick`).
- Pas d'ombre lourde ; le survol change la bordure, pas la taille.

### 8.4 Badges de statut

| Statut | Classes |
|---|---|
| Confirmée | `border-sky-500/20 bg-sky-500/10 text-sky-400` |
| En cours | `border-amber-500/20 bg-amber-500/10 text-amber-400` |
| Terminée | `border-emerald-500/20 bg-emerald-500/10 text-emerald-400` |
| Annulée | `border-red-500/20 bg-red-500/10 text-red-400` |
| En attente | `border-white/10 bg-white/5 text-muted` |

Base : `inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium`.
Toujours accompagner d'un libellé ; la couleur ne suffit pas.

### 8.5 Tableaux admin

```
overflow-x-auto rounded-2xl border border-line bg-surface
```

- `table w-full text-sm` ; en-tête `bg-white/[0.03] text-xs uppercase tracking-wide text-muted`.
- `th px-4 py-3 text-left font-medium` ; `td px-4 py-3 border-t border-line`.
- Survol de ligne : `hover:bg-white/[0.02]`.
- Colonnes numériques : `text-right tabular-nums`.
- Sur mobile : soit scroll horizontal avec première colonne sticky, soit cartes.
  Jamais 6 colonnes compressées.
- Actions de ligne : icônes 18 px avec `aria-label`, ou menu `…` si > 3 actions.

### 8.6 Modales

Utiliser le composant `Modal` existant (focus trap, Échap, restauration du focus).
Panneau : `rounded-t-2xl sm:rounded-2xl border border-line bg-surface-raised p-6 shadow-2xl`.
Backdrop : `bg-black/70 backdrop-blur-sm`. Titre `text-base font-semibold`.
Pied : `mt-6 flex justify-end gap-2`. Sur mobile : bottom sheet.
Action destructive : bouton danger + nom explicite de l'objet concerné.

### 8.7 Toasts

`rounded-xl border px-4 py-3 text-sm shadow-2xl` + variante sémantique
(`border-success/30 bg-success/10 text-success`, etc.). Desktop en haut à droite,
mobile en bas. Disparition automatique après 4 s, pause au survol.
`aria-live="polite"` ; ne jamais voler le focus.

### 8.8 Navigation

- Header fixe, hauteur 64–80 px, `border-b border-white/10`, fond
  `bg-dark-bg/90 backdrop-blur`.
- Lien actif : `text-white` + soulignement ou point rouge ; inactif : `text-muted`.
- Menu mobile : plein écran, focus trap, Échap, verrouillage du scroll.
- Sidebar admin : 240 px, item actif `bg-primary/10 text-primary-light` sur `surface`
  (#141414, 4.59:1). Sur `surface-raised` (#1C1C1C), le même fond fait tomber le
  contraste à 4.25:1 : utiliser `bg-primary/10 font-semibold text-white`.
- Maximum 5 entrées dans une barre de navigation mobile.
- Séparer visuellement les actions dangereuses (déconnexion, suppression).

### 8.9 États vides et squelettes

- État vide : icône 40 px `text-muted`, titre, une phrase, un CTA.
- Squelette : `animate-pulse rounded-lg bg-white/[0.06]`, avec la **hauteur exacte**
  du contenu final (évite le CLS).
- Spinner bloquant interdit au-delà de 1 s : préférer un squelette.

---

## 9. Accessibilité — checklist avant livraison

- [ ] Contraste texte ≥ 4.5:1 (grand texte ≥ 3:1) ; vérifié sur le fond réel.
- [ ] `#DC2626` jamais utilisé comme texte sur fond sombre.
- [ ] Focus visible sur tous les éléments interactifs (déjà global, ne pas l'enlever).
- [ ] Navigation clavier complète ; ordre de tabulation = ordre visuel.
- [ ] `aria-label` sur chaque bouton icône seule.
- [ ] Chaque champ a un label visible, une aide et une erreur reliées par
  `aria-describedby`.
- [ ] Cibles tactiles ≥ 44×44 px, espacement ≥ 8 px.
- [ ] Information jamais portée par la couleur seule.
- [ ] `prefers-reduced-motion` respecté.
- [ ] Images : `alt` descriptif, dimensions ou `aspect-ratio` déclarés.
- [ ] Hiérarchie de titres séquentielle (h1 → h2 → h3).
- [ ] Lien d'évitement (`skip-link`) présent et fonctionnel.
- [ ] Testé à 375 px, 768 px, 1024 px, 1440 px, en portrait et paysage.
- [ ] Testé en arabe (RTL) : utiliser les utilitaires logiques
  (`ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`), pas `ml-`/`mr-`.

---

## 10. Responsive et RTL

- Mobile-first : les classes de base ciblent 375 px, puis `sm:` `md:` `lg:`.
- Pas de scroll horizontal ; tester avec un contenu long (nom de véhicule, email).
- Images : `aspect-ratio` + `object-cover` pour éviter le CLS.
- Barres fixes : réserver le padding bas/haut correspondant.
- RTL : `dir="rtl"` est déjà appliqué pour l'arabe dans `i18n.js`. Les marges
  gauche/droite codées en dur (`ml-`, `mr-`, `left-`, `right-`) doivent migrer
  vers les équivalents logiques.

---

## 11. À faire / à éviter

| À faire | À éviter |
|---|---|
| Utiliser les tokens (`bg-surface`, `text-muted`, `border-line`) | Hex en dur (`bg-[#111]`, `border-[#2a2a2a]`) |
| Un CTA primaire par écran | Trois boutons rouges concurrents |
| Bordure + espace pour séparer | Ombres lourdes et dégradés décoratifs |
| `text-sm` minimum pour le corps admin | `text-[10px]` / `text-[11px]` |
| `rounded-xl` pour les contrôles | Mélanger `rounded-lg`, `rounded-xl`, `rounded-full` |
| Icônes Lucide 16/18/20 | Emoji comme icône |
| Erreur sous le champ | Erreur uniquement en haut de page |
| Squelette avec hauteur réservée | Spinner plein écran |
| `min-h-11` sur les boutons | Hauteur < 40 px |

---

## 12. Migration de l'existant

Le code actuel contient plusieurs façons d'exprimer la même chose. Migration
progressive, sans big-bang :

| Ancien | Remplacer par |
|---|---|
| `bg-[#0a0a0a]` | `bg-dark-bg` |
| `bg-[#111]`, `bg-neutral-900` | `bg-surface` ou `bg-surface-raised` |
| `bg-[#1a1a1a]` | `bg-surface` |
| `bg-neutral-800` (champ) | conserver `bg-neutral-800` |
| `border-[#2a2a2a]`, `border-neutral-800` | `border-line` |
| `border-neutral-700` (champ) | `border-line-strong` |
| `text-neutral-400`, `text-gray-400`, `text-white/70` | `text-muted` |
| `text-white/60` | `text-ink-subtle` (fond/carte uniquement) |
| `bg-[#dc2626]`, `bg-red-600` | `bg-primary` |
| `hover:bg-[#b91c1c]`, `hover:bg-red-700` | `hover:bg-primary-dark` |
| `text-red-500` (marque) | `text-primary-light` |
| `text-red-500` (erreur) | `text-danger` |
| `rounded-lg` sur bouton/champ | `rounded-xl` |
| `text-[10px]`, `text-[11px]` | `text-xs` |

Ordre de migration recommandé :

1. Composants partagés : `Header`, `Footer`, `Modal`, `PageHeader`, `DocumentUpload`.
2. Pages publiques : `Home`, `Vehicules`, `VehiculeDetail`, `Finalisation`.
3. Espace client : `TableauDeBord`, `Profil`, `Messagerie`.
4. Admin : tableaux, filtres, dashboard, formulaires.

Statut (octobre 2026) : le lot 1 est migré (`Header`, `Footer`, `Modal`,
`PageHeader`, `DocumentUpload`).

Après chaque lot : `npm run build`, `npm test`, vérification visuelle à 375 px et
1440 px, et contrôle du contraste des nouveaux états.

---

## 13. Gouvernance

- **Un seul source de vérité pour les couleurs** : le bloc `@theme` de `index.css`.
  Aucun hex dans les composants, sauf cas justifié (couleur de marque tierce).
- Tout nouveau composant doit être ajouté à la section 8 avec sa recette exacte.
- Toute nouvelle couleur doit être mesurée (contraste) et documentée ici.
- Toute page livrée passe la checklist §9.
- Les captures et maquettes de référence vivent dans `design-system/` (ce dossier).

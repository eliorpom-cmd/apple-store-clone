# Store clone — Design

> Page gris très clair `#f5f5f7`, texte presque noir `#1d1d1f`, cartes blanches arrondies à 18 px
> qui défilent à l'horizontale, un seul bleu `#0071e3` pour l'action, titres en deux tons
> (noir puis gris `#6e6e73`), nav translucide de 44 px collée en haut.

- **Surface** : site statique HTML + CSS + JS vanilla, sans build
- **Registre** : apple-like (ajouté au corpus adn-design : `apple.com/store`)
- **Gestes** : titre en deux tons · rangées de cartes défilantes coupées par le bord droit
- **Origine** : rétro-ingénierie du rendu de apple.com/store et de 52 pages secondaires, mesurée le 2026-10-13
  (styles calculés, feuilles CSS, captures 1440 / 390 px, interactions filmées). Valeurs seulement :
  aucun code, texte, image, police ni logo d'Apple n'est repris.
- **Mis à jour** : 2026-10-13
- **Fichiers de tokens** : `assets/css/tokens.css`
- **Specs détaillées par gabarit** : `docs/gabarits/` (structure, composants, interactions)

## Principes

1. Deux fonds seulement : `--page` (#f5f5f7) pour les pages et `--surface` (#fff) pour les cartes et
   les zones de choix. Le noir `#000` / `#1d1d1f` sert de fond aux cartes sombres, jamais à la page.
2. Le bleu `--action` (#0071e3) est réservé à l'action (bouton principal, sélection, focus). Les liens
   sont `--link` (#0066cc). Aucune autre couleur vive hors badges (`--badge-new` orange, `--promo` rouge).
3. Les titres de section sont en deux tons dans la même ligne : la première proposition en `--text`,
   la suite en `--text-2`. Graisse 600 pour les deux.
4. Le contenu tient dans un conteneur de 980 px (pages de texte) ou suit le bord gauche du
   conteneur de 1440 px avec un débord à droite (rangées défilantes). Les cartes ne se centrent pas.
5. Tout ce qui bouge le fait en 240–400 ms ; les survols de cartes en 300 ms
   `cubic-bezier(0, 0, .5, 1)` avec une échelle de 1.01, jamais plus.

## Couleurs

| Nom | Valeur | Token | Rôle |
|---|---|---|---|
| Page | `#f5f5f7` | `--page` | fond des pages, pied de page |
| Surface | `#ffffff` | `--surface` | cartes, options, panneaux |
| Surface atténuée | `#fafafc` | `--surface-2` | fond de nav (à 80 %), zones secondaires |
| Ligne | `#d2d2d7` | `--line` | séparateurs, bordure des options au repos |
| Ligne douce | `#e8e8ed` | `--line-2` | fonds de puces, encadré financement |
| Texte | `#1d1d1f` | `--text` | titres, corps |
| Texte 2 | `#6e6e73` | `--text-2` | 2e ton des titres, descriptions |
| Texte 3 | `#86868b` | `--text-3` | mentions, notes |
| Action | `#0071e3` · survol `#0076df` · pressé `#006edb` | `--action` | bouton principal, option sélectionnée, focus |
| Lien | `#0066cc` (sur sombre `#2997ff`) | `--link` | liens texte « En savoir plus › » |
| Nouveau | `#b64400` | `--badge-new` | badge « Nouveau » au-dessus d'un nom |
| Promo | `#e30000` | `--promo` | prix barré, offre |
| Succès | `#008009` | `--success` | disponibilité, livraison |
| Sombre | `#1d1d1f` / `#000` | `--dark` / `--black` | cartes sombres, bouton neutre |

Pas de mode sombre : le site source n'en a pas.

## Typographie

- **Familles** : pile système `-apple-system, BlinkMacSystemFont, "Inter", "Helvetica Neue", Helvetica, Arial, sans-serif`.
  Sur Mac et iOS elle rend la police système (rendu identique au site source) sans redistribuer de
  fichier ; ailleurs, Inter (OFL) en fallback, chargée depuis Google Fonts.
- **Base** : `html { font-size: 106.25% }` → 1 rem = 17 px.

| Rôle | Desktop | Mobile | Graisse | Interlignage | Tracking | Token |
|---|---|---|---|---|---|---|
| Hero de page | 48 px | 32 px | 600 | 1.0835 | −0.003 em | `--t-hero` |
| Hero configurateur | 48 px | 32 px | 600 | 1.0835 | −0.003 em | `--t-hero` |
| Grand titre (rare) | 64–80 px | 48 px | 600 | 1.0625 / 1.05 | −0.009 / −0.015 em | `--t-display` |
| Titre de section | 28 px | 24 px | 600 | 1.1429 | 0.007 em | `--t-section` |
| Titre de carte (grande) | 28 px | 24 px | 600 | 1.1429 | 0.007 em | `--t-section` |
| Titre de carte | 21 px | 19 px | 600 | 1.1905 | 0.011 em | `--t-card` |
| Titre d'étape | 24 px | 21 px | 600 | 1.1667 | 0.009 em | `--t-step` |
| Intro | 21 px | 19 px | 400 | 1.381 | 0.011 em | `--t-intro` |
| Corps | 17 px | 17 px | 400 | 1.4706 | −0.022 em | `--t-body` |
| Corps serré (prix, options) | 17 px | 17 px | 400/600 | 1.2353 | −0.022 em | `--t-body-tight` |
| Petit | 14 px | 14 px | 400 | 1.4286 | −0.016 em | `--t-small` |
| Note, nav, pied | 12 px | 12 px | 400 | 1.3334 | −0.01 em | `--t-note` |
| Eyebrow / badge | 12 px | 12 px | 600 | 1.3334 | −0.01 em | `--t-note` |

Mesure des paragraphes : 60–75 ch. Tracking positif au-dessus de 19 px, négatif en dessous (optique SF).

## Espace et mise en page

- **Unité** : 4 px (valeurs observées 8 · 12 · 16 · 20 · 24 · 32 · 40 · 52 · 64 · 80 · 96)
- **Conteneur** : 980 px pour le texte, pages larges jusqu'à 1440 px avec marge latérale
  `max(22px, (100vw − 1440px) / 2 + 140px)` sur les rangées défilantes
- **Gouttière** : 22 px (desktop), 16 px sous 734 px
- **Points de rupture** : 1441 · 1068 · 1023 · 833 · 734 px (source : feuilles CSS)
- **Cartes défilantes** : rangée en `scroll-snap-type: x mandatory`, gouttière 20 px, haut 16 px, bas 40 px

## Formes et profondeur

| Élément | Arrondi | Bordure | Ombre |
|---|---|---|---|
| Carte | 18 px | aucune | `--shadow-card` repos · `--shadow-card-hover` survol |
| Option à choisir | 12 px | 1 px `--line` · 2 px `--action` sélectionnée | aucune |
| Petite carte, vignette | 15 px | | |
| Modale | 28 px (haut seulement en mobile) | | voile `rgba(0,0,0,.48)` |
| Bouton | capsule `980px` · bouton bloc 12 px | | |
| Pastille de couleur | 50 % | anneau 2 px `--action` à 3 px d'écart | |
| Focus | | | `0 0 0 4px rgba(0,125,250,.6)` |

## Mouvement

- **Standard** : `cubic-bezier(.4, 0, .6, 1)` 240 ms (nav, menus) — `--ease-std` `--dur-2`
- **Carte au survol** : 300 ms `cubic-bezier(0, 0, .5, 1)`, `scale(1.01)` + ombre `--shadow-card-hover`
- **Menu déroulant de la nav** : hauteur animée 320 ms ; entrées en cascade, chacune `opacity` +
  `translateY(-8px → 0)`, durée `min(160ms + 20ms × rang inverse, 240ms)`
- **Modale** : fondu + montée 30 px (`slide-up`) 400 ms ease
- **Accordéon** : hauteur 400 ms ease, chevron tourne de 180°
- **Défilement des rangées** : flèches → `scroll-behavior: smooth` d'une page de cartes
- **Réduit** : sous `prefers-reduced-motion: reduce`, durées à 0 sauf les fondus (120 ms)

## Composants

Détail complet, gabarit par gabarit : `docs/gabarits/`. Résumé des communs :

### Bouton
Capsule `980px`, fond `--action`, texte blanc 17 px (14 px petit), padding 11 × 21 px (8 × 15 px
petit). Survol `#0076df`, pressé `#006edb`, désactivé opacité 0.42. Variantes : secondaire (contour
1 px `--link`, texte `--link`, survol plein), neutre (`#1d1d1f`, survol `#272729`), bloc (largeur 100 %,
arrondi 12 px, padding 18 × 31 px pour « Ajouter au sac »).
Code : `assets/css/components/button.css`

### Carte de rangée
`--surface`, arrondi 18 px, `--shadow-card`, 480 × 500 px (grande) ou 313 × 500 px, padding 30 px,
eyebrow 12 px 600, titre `--t-section`, image collée en bas. Survol : échelle 1.01 + ombre.
Code : `assets/css/components/card.css`

## Médias et icônes

- **Visuels produit** : SVG dessinés pour le projet (appareils stylisés, dégradés), aux proportions
  des visuels d'origine. Aucune photo d'Apple.
- **Icônes** : SVG maison, trait 1.5 px, 16–24 px (recherche, sac, chevron, fermer, plus).
- **Pas de logo** : un monogramme générique occupe la place du logo dans la nav.

## À faire

- Titres de section en deux tons (`<strong>` noir + reste en `--text-2`) sur toutes les rangées.
- Rangées défilantes alignées sur le bord gauche du contenu et coupées par le bord droit de l'écran.
- Une seule couleur d'action par écran : `--action`.
- Prix et options dans des cartes blanches à bordure 1 px, sélection = bordure 2 px bleue.

## À éviter

- Ombres portées marquées : rien au-delà de `--shadow-card-hover`.
- Arrondis hors échelle : 5 · 8 · 12 · 15 · 18 · 28 px et capsule seulement.
- Couleurs vives hors `--action`, `--link`, `--badge-new`, `--promo`, `--success`.
- Échelles au survol supérieures à 1.01.
- Tout texte, image, police ou logo copié d'Apple (projet open source).

## Tokens

```css
:root {
  /* Colors */
  --page: #f5f5f7;
  --surface: #ffffff;
  --surface-2: #fafafc;
  --line: #d2d2d7;
  --line-2: #e8e8ed;
  --text: #1d1d1f;
  --text-2: #6e6e73;
  --text-3: #86868b;
  --action: #0071e3;
  --action-hover: #0076df;
  --action-active: #006edb;
  --link: #0066cc;
  --link-on-dark: #2997ff;
  --badge-new: #b64400;
  --promo: #e30000;
  --success: #008009;
  --dark: #1d1d1f;
  --black: #000000;
  --nav-bg: rgba(250, 250, 252, .8);
  --scrim: rgba(0, 0, 0, .48);

  /* Type */
  --font: -apple-system, BlinkMacSystemFont, "Inter", "Helvetica Neue", Helvetica, Arial, sans-serif;
  --t-display: 600 80px/1.05 var(--font);      --tr-display: -.015em;
  --t-hero: 600 48px/1.0835 var(--font);       --tr-hero: -.003em;
  --t-section: 600 28px/1.1429 var(--font);    --tr-section: .007em;
  --t-step: 600 24px/1.1667 var(--font);       --tr-step: .009em;
  --t-card: 600 21px/1.1905 var(--font);       --tr-card: .011em;
  --t-intro: 400 21px/1.381 var(--font);       --tr-intro: .011em;
  --t-body: 400 17px/1.4706 var(--font);       --tr-body: -.022em;
  --t-body-tight: 400 17px/1.2353 var(--font);
  --t-small: 400 14px/1.4286 var(--font);      --tr-small: -.016em;
  --t-note: 400 12px/1.3334 var(--font);       --tr-note: -.01em;

  /* Space */
  --gutter: 22px;
  --container: 980px;
  --container-wide: 1440px;
  --edge: max(22px, calc((100vw - 1440px) / 2 + 140px));

  /* Shape */
  --r-xs: 5px; --r-sm: 8px; --r-md: 12px; --r-lg: 15px; --r-card: 18px; --r-modal: 28px; --r-pill: 980px;
  --shadow-card: 2px 4px 12px rgba(0, 0, 0, .08);
  --shadow-card-hover: 2px 4px 16px rgba(0, 0, 0, .16);
  --focus-ring: 0 0 0 4px rgba(0, 125, 250, .6);

  /* Motion */
  --ease-std: cubic-bezier(.4, 0, .6, 1);
  --ease-card: cubic-bezier(0, 0, .5, 1);
  --ease-flyout: cubic-bezier(.25, .1, .3, 1);
  --dur-1: 160ms; --dur-2: 240ms; --dur-3: 320ms; --dur-4: 400ms;
}
@media (max-width: 734px) {
  :root { --gutter: 16px; }
}
```

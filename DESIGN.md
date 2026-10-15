# Store clone — Design

> Very light grey page `#f5f5f7`, near-black text `#1d1d1f`, white cards rounded at 18 px that scroll
> horizontally, a single blue `#0071e3` for actions, two-tone headings (black then grey `#6e6e73`),
> a 44 px translucent nav stuck to the top.

- **Surface**: static site, vanilla HTML + CSS + JS, no build
- **Register**: apple-like
- **Signature moves**: two-tone heading · card shelves that scroll and get cut by the right edge
- **Origin**: reverse-engineered from the rendering of apple.com/store and 52 secondary pages, measured on
  2026-10-13 (computed styles, stylesheets, screenshots at 1440 / 390 px, recorded interactions). Values only:
  no Apple code, text, image, font or logo is reused.
- **Updated**: 2026-10-13
- **Token file**: `assets/css/tokens.css`

## Principles

1. Two backgrounds only: `--page` (#f5f5f7) for pages and `--surface` (#fff) for cards and choice areas.
   Black `#000` / `#1d1d1f` is a background for dark cards, never for the page.
2. Blue `--action` (#0071e3) is reserved for actions (primary button, selection, focus). Links are
   `--link` (#0066cc). No other bright colour outside badges (`--badge-new` orange, `--promo` red).
3. Section headings are two-tone on one line: the first clause in `--text`, the rest in `--text-2`.
   Weight 600 for both.
4. Content sits in a 980 px container (text pages) or follows the left edge of the 1440 px container and
   overflows on the right (scrolling shelves). Cards are never centred.
5. Everything that moves does so in 240–400 ms; card hovers in 300 ms `cubic-bezier(0, 0, .5, 1)` with a
   scale of 1.01, never more.

## Colours

| Name | Value | Token | Role |
|---|---|---|---|
| Page | `#f5f5f7` | `--page` | page background, footer |
| Surface | `#ffffff` | `--surface` | cards, options, panels |
| Dimmed surface | `#fafafc` | `--surface-2` | nav background (at 80 %), secondary areas |
| Line | `#d2d2d7` | `--line` | separators, option border at rest |
| Soft line | `#e8e8ed` | `--line-2` | chip backgrounds, financing box |
| Text | `#1d1d1f` | `--text` | headings, body |
| Text 2 | `#6e6e73` | `--text-2` | second tone of headings, descriptions |
| Text 3 | `#86868b` | `--text-3` | fine print, notes |
| Action | `#0071e3` · hover `#0076df` · pressed `#006edb` | `--action` | primary button, selected option, focus |
| Link | `#0066cc` (on dark `#2997ff`) | `--link` | text links "Learn more ›" |
| New | `#b64400` | `--badge-new` | "New" badge above a name |
| Promo | `#e30000` | `--promo` | struck-through price, offer |
| Success | `#008009` | `--success` | availability, delivery |
| Dark | `#1d1d1f` / `#000` | `--dark` / `--black` | dark cards, neutral button |

No dark mode: the source site has none.

## Typography

- **Families**: system stack `-apple-system, BlinkMacSystemFont, "Inter", "Helvetica Neue", Helvetica, Arial, sans-serif`.
  On Mac and iOS it renders the system font (same rendering as the source site) without redistributing any
  font file; elsewhere, Inter (OFL) as fallback, loaded from Google Fonts.
- **Base**: `html { font-size: 106.25% }` → 1 rem = 17 px.

| Role | Desktop | Mobile | Weight | Line height | Tracking | Token |
|---|---|---|---|---|---|---|
| Store / category page title | 80 px | 48 px | 600 | 1.05 | −0.015 em | `--t-display` |
| Configurator title, modal | 48 px | 32 px | 600 | 1.0835 | −0.003 em | `--t-hero` |
| Section heading | 28 px | 24 px | 600 | 1.1429 | 0.007 em | `--t-section` |
| Card title (large) | 28 px | 24 px | 600 | 1.1429 | 0.007 em | `--t-section` |
| Card title | 21 px | 19 px | 600 | 1.1905 | 0.011 em | `--t-card` |
| Step title | 24 px | 21 px | 600 | 1.1667 | 0.009 em | `--t-step` |
| Intro | 21 px | 19 px | 400 | 1.381 | 0.011 em | `--t-intro` |
| Body | 17 px | 17 px | 400 | 1.4706 | −0.022 em | `--t-body` |
| Tight body (prices, options) | 17 px | 17 px | 400/600 | 1.2353 | −0.022 em | `--t-body-tight` |
| Small | 14 px | 14 px | 400 | 1.4286 | −0.016 em | `--t-small` |
| Note, nav, footer | 12 px | 12 px | 400 | 1.3334 | −0.01 em | `--t-note` |
| Eyebrow / badge | 12 px | 12 px | 600 | 1.3334 | −0.01 em | `--t-note` |

Allowed relative sizes: superscripts 0.6 em (prices) and 0.75 em (notes), external-link arrow 0.85 em.

Paragraph measure: 60–75 ch. Positive tracking above 19 px, negative below (SF optical sizing).

## Space and layout

- **Unit**: 4 px (observed values 8 · 12 · 16 · 20 · 24 · 32 · 40 · 52 · 64 · 80 · 96)
- **Container**: 980 px for text; Store pages: side margin `--shelf-edge` = 22 px below 1024,
  `calc(-268.46px + 28.365vw)` from 1024 to 1440, 140 px above. Configurators: 1260 px (gallery 872 + 60 + rail 328).
- **Gutter**: 22 px (desktop), 16 px below 734 px
- **Breakpoints**: 1440 (140 px margin) · 1069 (progress indicator) · 1023 (Store pages mobile) · 833 (48 px mobile nav) · 734 (content pages) px
- **Scrolling cards**: `scroll-snap-type: x mandatory`, 20 px gutter, 16 px top, 40 px bottom; 46 px between shelves (28 on mobile)

## Shapes and depth

| Element | Radius | Border | Shadow |
|---|---|---|---|
| Card | 18 px | none | `--shadow-card` at rest · `--shadow-card-hover` on hover |
| Choice option | 12 px | 1 px `--text-3` · hover `#8f8f94` · 2 px `--action` when selected | none |
| Small card, thumbnail | 15 px | | |
| Modal | 18 px (top only on mobile, sheet) | | scrim `rgba(0,0,0,.48)` |
| Button | pill `980px` · block button 12 px | | |
| Gallery, help card | 18 px · 12 px | | `--page` background |
| Colour swatch | 50 % | 2 px `--action` ring with a 3 px gap | |
| Focus | | | `0 0 0 4px rgba(0,125,250,.6)` |

## Motion

- **Standard**: `cubic-bezier(.4, 0, .6, 1)` 240 ms (nav, menus) — `--ease-std` `--dur-2`
- **Card hover**: 300 ms `cubic-bezier(0, 0, .5, 1)`, `scale(1.01)` + `--shadow-card-hover`
- **Nav flyout**: height animated over 320 ms; items cascade in, each `opacity` +
  `translateY(-8px → 0)`, duration `min(160ms + 20ms × reverse index, 240ms)`
- **Modal**: fade only, 100 ms `ease-in-out`, no movement
- **Accordion**: height 300 ms `ease-in-out`, chevron rotates 180°
- **Shelf arrows**: appear on hover with `scale(.8 → 1)` 500 ms ease-in + opacity 700 ms `cubic-bezier(.15,0,.2,1)`
- **Configurator steps**: locked at opacity .32 until the previous step has a choice
- **Shelf scrolling**: arrows → `scroll-behavior: smooth` by one page of cards
- **Reduced**: under `prefers-reduced-motion: reduce`, durations drop to 0 except fades (120 ms)

## Components

Reference code: `assets/css/components/components.css` + `assets/js/components.js`. Summary:

### Button
Pill `980px`, `--action` background, white 14 px text, 8 × 15 px padding (36 px tall); large: 17 px.
Hover `#0076df`, pressed `#006edb`, disabled opacity 0.42, 100 ms linear transitions. Variants:
secondary (1 px `--link` outline, filled on hover), neutral (`#1d1d1f`, hover `#272729`), neutral outline
(quick-link pills), "Add to Bag" block (100 % wide, 44 px tall, 12 px radius).
Code: `assets/css/components/button.css`

### Shelf card
`--surface`, 18 px radius, `--shadow-card`, 500 px tall; widths 313 · 400 · 480 · 646 px
(309 × 450 on mobile); short cards 240 px. 28 px padding, 12 px 600 eyebrow, `--t-section` title, image
pinned to the bottom. Hover: scale 1.01 + shadow, 300 ms `cubic-bezier(0, 0, .5, 1)`.
Code: `assets/css/components/card.css`

## Media and icons

- **Product visuals (demo mode)**: transparent background (the original visuals are cut out) and a single centred
  `#e8e8ed` pill: "<Product> image" in `--text`, detail below in `--text-2` ("(ink sport strap)", "(front)",
  the image's alt text). Under 130 px wide, a short pill with the name only. No device drawing, no Apple photo.
  Generated by `node tools/demo-placeholders.mjs` (files in `assets/img/products/` and inline SVG in
  configurators, accessories, bands): re-run it after changing an alt text or a title.
- **Icons**: custom SVG, 1.5 px stroke, 16–24 px (search, bag, chevron, close, plus).
- **No logo**: a generic monogram (a pear) takes the logo's place in the nav.

## Do

- Two-tone section headings (`<strong>` in black + the rest in `--text-2`) on every shelf.
- Scrolling shelves aligned to the content's left edge and cut by the right edge of the screen.
- One action colour per screen: `--action`.
- Prices and options in white cards with a 1 px border; selection = 2 px blue border.

## Don't

- Heavy drop shadows: nothing beyond `--shadow-card-hover`.
- Radii outside the scale: 5 · 8 · 12 · 15 · 18 · 28 px, circle and pill only.
- Bright colours outside `--action`, `--link`, `--badge-new`, `--promo`, `--success`.
- Hover scales above 1.01.
- Any text, image, font or logo copied from Apple (open-source project).

## Appendix — colours outside tokens

Values the tokens do not cover, listed so that a design-drift check (every hex in the code must appear in this
file) reports nothing. A new hard-coded colour must be added here, or replaced by a token.

### Measured colours without a token (CSS)

Each value carries a comment in its file: a measurement of the source, or a demo-mode illustration (`service.css`, `product.css`).

- `catalog-2.css` : `#7230c1` `#762fbc` `#a4257d` `#f10000` `#ff0300`
- `catalog.css` : `#eeeeee` `#f0f4fd` `#fdfaf1`
- `category.css` : `#01ddff` `#3f313b` `#635b61` `#d8d6d8` `#e9f5fc`
- `components.css` : `#c9c9ce`
- `product.css` : `#c7c7cc`
- `service.css` : `#33415c` `#a34a3c` `#d8cfc0`

### Demo content tints

Colours of the fictional products (colour swatches, `--product-color`, image-slot halos). They are demo data, not
design: they have no token. A colour already listed above is not repeated.

- `index.html` : `#2c3e5a` `#7d8b6a` `#c25a3a` `#ececec`
- `pages/accessories.html` : `#0b0b0d` `#0b0b0e` `#2b3140` `#2c2c2e` `#3a3a3c` `#3b3f46` `#5a68d4` `#6b6b3a` `#7a2e4d` `#7fa6d6` `#9ec3ff` `#b6663e` `#b8b5ac` `#b9a6ff` `#d8cfb8`
- `pages/buy-computer.html` : `#5c6785` `#dbe6f2` `#f1c6d0` `#f1e2c6` `#f2e26a` `#f2f2f2`
- `pages/buy-earbuds.html` : `#c9826b`
- `pages/buy-phone.html` : `#5b6b4a` `#6b2a35` `#7a2f3f` `#9fc3a7` `#c9c2b5` `#d9d4e8`
- `pages/buy-watch.html` : `#2b2a26` `#c9b9a0` `#d6c7ae` `#d8d8dc`
- `pages/components.html` : `#d5e3d8` `#dcd8ea` `#dfe5ee` `#e2e2e4` `#e8dccf` `#e9f0ea` `#eceaf4` `#eef1f6` `#f1f1f1` `#f4ede6`
- `pages/config-computer.html` : `#e3e4e8`
- `pages/config-phone-duo.html` : `#050508` `#1a1a22` `#2f3a4a` `#5b5b66` `#f1efe9` `#f6efd9`
- `pages/config-phone.html` : `#2b2c2f` `#a7b8a4` `#d8c3a5` `#d9dadf`
- `pages/product-case.html` : `#2b3440` `#3c3c40` `#5b1f2e` `#6b6a4a` `#a8336e` `#cddbea`
- `pages/upgrade.html` : `#4a2c35` `#8e44ad` `#8fa3c8` `#9aa7b4` `#9bd3ae` `#a8c7e0` `#c5cde0` `#c8dcf0` `#c9b48a` `#c9ccd3` `#c9d8c5` `#c9e2d4` `#d6c7e8` `#d8d4cc` `#e8d9c4` `#e8e4dc` `#e9e9ee` `#f0c8b8` `#f2c94c` `#f2d6c9`
- `pages/watch-bands.html` : `#2e4d3c` `#2f6f8f` `#3e6b4f` `#4a4f57` `#5b4a7a` `#5f6b78` `#6c7a89` `#9aa3ad` `#bfe3d2` `#c8ccd2` `#c9d96b` `#d4b26a` `#d9a3a0` `#d9b45a` `#e0572f` `#f08a6c` `#f2c4d4`
- visuels SVG (`assets/img/products/`) : `#050506` `#2a2e27` `#2c2c31` `#3a4a6b` `#3b3f38` `#48484a` `#5b6253` `#6070d8` `#6e7fa0` `#8c9cbc` `#a5c8ff` `#c2aaff` `#c9ced8` `#dfe3ea` `#e8d9c2`

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
  --on-dark: #ffffff;                 /* text and icons on dark or blue surfaces */
  --control-bg: rgba(210, 210, 215, .64);   /* round arrows, dot pills (galleries, carousels) */
  --control-bg-hover: hsla(240, 7%, 88%, .7);
  --control-icon: rgba(0, 0, 0, .56);
  /* Inks and glass (measured on the source; translucent black text and frosted grounds) */
  --ink-88: rgba(0, 0, 0, .88); --ink-80: rgba(0, 0, 0, .8); --ink-72: rgba(0, 0, 0, .72); --ink-64: rgba(0, 0, 0, .64);
  --ink-54: rgba(0, 0, 0, .54); --ink-48: rgba(0, 0, 0, .48); --ink-42: rgba(0, 0, 0, .42); --ink-24: rgba(0, 0, 0, .24);
  --ink-20: rgba(0, 0, 0, .2); --ink-16: rgba(0, 0, 0, .16); --ink-12: rgba(0, 0, 0, .12); --ink-10: rgba(0, 0, 0, .1); --ink-08: rgba(0, 0, 0, .08);
  --white-92: rgba(255, 255, 255, .92); --white-80: rgba(255, 255, 255, .8); --white-48: rgba(255, 255, 255, .48);
  --glass: rgba(232, 232, 237, .72); --glass-hover: rgba(220, 220, 226, .8); --curtain: rgba(232, 232, 237, .4);
  --dark-hover: #272729; --dark-active: #18181a; --light-active: #ededf2;
  --eyebrow: #424245; --badge-new-on-dark: #ff791b; --nav-ink-2: #333336;
  --line-hover: #8f8f94; --field-line: rgba(134, 134, 139, .42);
  --close-bg: #e8e8ed; --close-bg-hover: #ececf0; --close-bg-active: #dfdfe4;

  /* Type */
  --font: -apple-system, BlinkMacSystemFont, "Inter", "Helvetica Neue", Helvetica, Arial, sans-serif;
  --font-display: var(--font);                  /* 20 px and up; live mode swaps in the reference's display face */
  --t-display: 600 80px/1.05 var(--font-display);      --tr-display: -.015em;
  --t-hero: 600 48px/1.0835 var(--font-display);       --tr-hero: -.003em;
  --t-section: 600 28px/1.1429 var(--font-display);    --tr-section: .007em;
  --t-step: 600 24px/1.1667 var(--font-display);       --tr-step: .009em;
  --t-card: 600 21px/1.1905 var(--font-display);       --tr-card: .011em;
  --t-intro: 400 21px/1.381 var(--font-display);       --tr-intro: .011em;
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

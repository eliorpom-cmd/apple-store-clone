# Maintenance

Procedures to keep the clone in step with the reference store over time. All commands run from the
project root, with Node 20+ and Playwright available (`npm i -D playwright && npx playwright install chromium`,
or the shared cache in `~/.cache/adn-design`).

## Start

```bash
node tools/live-server.mjs &          # one server only, port 4321
open "http://localhost:4321/?content=live"
```

Restart: `kill -9 $(lsof -ti tcp:4321 -sTCP:LISTEN)`, wait until the port is free, start again.

## Routine check (monthly, or when the reference site changes)

1. `node tools/refresh-live.mjs` — re-extract every cached page (≈ 15 min for 60 pages).
   An `ERR` line or a page that renders empty means the source markup changed: see « Extractor broke ».
2. `node tools/scoreboard.mjs` — re-score every page (≈ 25 min). Read `_analysis/visual/SCORES.md`.
3. For each page that dropped: open `_analysis/visual/<key>/worst-1.png` (source left, clone right),
   fix the renderer or CSS, then re-run `node tools/scoreboard.mjs <path-filter>`.
4. `node tools/check-pages.mjs` and `node tools/check-pages.mjs --live` — must print `all pages ok`.
5. Commit.

## Extractor broke

Symptom: a page renders with missing sections, or `/__live` returns 500.

1. Find the template: `content/live/routes.json` → `template` of the path.
2. Open the source page in Playwright and list the classes around the missing part
   (the extractors read classes such as `rf-ccard`, `rf-bfe-*`, `rc-*`, `dd-*`).
3. Update `tools/extractors/<template>.mjs` (the server reloads it on the next request), then
   `curl "localhost:4321/__live?src=<path>&fresh=1"` and compare again.
4. A new kind of page: add a rule to `tools/extractors/detect.mjs` (reloaded live too) and, if no
   template fits, a new pair `tools/extractors/<name>.mjs` + `assets/js/live/<name>.js` and a page in `pages/`.

## New component seen on the reference site

1. Film it: Playwright screenshots at 0 / 60 / 120 / 200 / 320 / 480 / 800 ms, plus computed styles and
   the matching CSS rules (keyframes, transitions) from the source stylesheets.
2. Build it once in `assets/css/components/components.css` + `assets/js/components.js` (data attribute),
   add a demo to `pages/components.html`, then use it from the renderers.

## Demo mode (public content)

Demo pages carry fictional content only. After any change, open each page without `?content=live` and run
`node tools/check-pages.mjs`. Never put source text, images or class names into tracked files.

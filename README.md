# Sunset Cover Studio

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![rank](https://make.fun/badge/vjmunggahari-ui/gta6-cover-art-01-ono10/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard)
[![reward](https://make.fun/badge/vjmunggahari-ui/gta6-cover-art-01-ono10/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

Sunset Cover Studio turns your own photo and a caption into a multi-panel
poster cover in the style of GTA 6's posters — bold caption lettering over a
Vice City sunset or neon colour grade — and exports it as a PNG you can post.
It was built for make.fun's
[Make GTA 6 Cover Art](https://make.fun/bounty/gta6-cover-art-01) bounty
(`gta6-cover-art-01`, $250 prize pool).

Everything in the app is original: the panel layouts, the lettering, the
colour grades and the three built-in sample photos are drawn by this app's
own code. No Rockstar Games logo, wordmark, official artwork, character or
font is used anywhere in the repo.

## What it does

Four steps from a photo to a shareable cover:

1. **Load photos** — pick a file from your machine, drag a photo onto the
   cover, or paste one (Ctrl+V). Three built-in samples (Boulevard, Pier,
   Palms) are procedurally drawn PNGs in `app/samples/` if you just want to
   try it. Every photo you add lands in your photo library and goes straight
   into the selected panel.
2. **Pick a layout and size** — three poster layouts, three export sizes:
   - *Sunset Trio*: one wide hero panel over two detail crops.
   - *Four-Up*: one big panel beside a column of three details.
   - *Vice Strips*: a bold title band over three tall strips.
   - Sizes: 1080 × 1080 (square), 1080 × 1350 (portrait), 1920 × 1080 (wide).
3. **Adjust each panel** — click a panel on the cover (or pick it from the
   panel buttons) to select it, choose which photo fills it, then crop with
   zoom and pan sliders or by dragging the photo inside the panel, flip it
   sideways, and grade it with brightness, contrast and saturation sliders.
   Each panel keeps its own photo, crop and grade.
4. **Write the caption and export** — caption plus an optional tagline
   second line, five system fonts, four colours, caption size 48–150, three
   positions (bottom strip, over the hero panel, top band), with a dark
   outline and neon glow you can switch off. The preview repaints live with
   every change. One click exports the cover as a PNG at the exact size you
   picked — export needs at least one photo loaded, and the app says so on
   screen if there is nothing to export yet.

Pick a colour grade too: Vice sunset, Neon nights, or Golden dusk. The grade
tints the whole cover and each panel, stronger towards the foot of a panel.

## Run it (offline)

The app is plain static files under `app/` — no build step and no network.
Your photos are read on your own machine and never leave it; the app makes
zero network requests at runtime.

```sh
node serve.ts
```

Then open <http://localhost:8080> in a desktop browser. `serve.ts` is a
tiny Node 22 standard-library static server (use `--port 9000` for another
port). Any static file server works too — `app/index.html` is the entry
point, and every script, style, image and font it loads is a file under
`app/` (caption fonts are system fonts, so nothing is downloaded).

## Screenshots

Four screenshots live under `screenshots/` (scenes in `shots.json`, taken
with `node tools/shoot.mjs` at 1280 × 720):

1. `1-cover.jpg` — the exported Trio cover, square, on its own.
2. `2-editor-trio.jpg` — the editor with a sample photo in the Trio layout.
3. `3-editor-quad.jpg` — the editor in the Four-Up layout, portrait size,
   with two samples and a tagline.
4. `4-export-wide.jpg` — the exported Vice Strips cover, wide, on its own.

## Files

- `app/index.html` — the editor page.
- `app/style.css` — the editor's styling.
- `app/src/main.js` — editor state, controls and photo handling.
- `app/src/cover.js` — the cover renderer (layouts, grades, caption).
- `app/src/shots.js` — screenshot scenes (`?shot=...` URL scenes).
- `app/samples/` — three procedurally drawn sample photos (PNG).
- `main.ts` — the entry program (Node 22): copies `app/` and `screenshots/`
  to `/output` (or `$MAKEFUN_OUTPUT_DIR`) and writes `dossier.json` with
  the kit's `vendor/makefun-app.ts`. Try it locally with
  `mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts`.
- `serve.ts` — local static server for trying the app.
- `tools/gen-samples.mjs` — draws the sample photos.
- `tools/shoot.mjs` — takes the screenshots.
- `vendor/makefun-app.ts` — the kit's dossier library, byte-identical to
  the kit copy.
- `LICENSE` — MIT.

## Entry

Built for make.fun's `gta6-cover-art-01` competition by an AI agent session
recorded with the kit's `record` command, for owner `vjmunggahari-ui`
(account `@ono10`). Final repo after transfer:
`vjmunggahari-ui/gta6-cover-art-01-ono10`.

---

<sub>Entered on [make.fun](https://make.fun/) · AI agents build software for cash rewards</sub>

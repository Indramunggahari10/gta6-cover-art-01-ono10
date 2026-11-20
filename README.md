# gta6-cover-art-01-ono10

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/vjmunggahari-ui/gta6-cover-art-01-ono10/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/vjmunggahari-ui/gta6-cover-art-01-ono10/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

**Sunset Cover Studio** turns your photos and a caption into GTA-poster-style
cover art — the multi-panel poster look with bold display lettering and a Vice
City sunset or neon colour grade — and exports it as a PNG to share. Built for
the make.fun competition
[Make GTA 6 Cover Art](https://make.fun/bounty/gta6-cover-art-01).

## What it does

- **Any photos**: choose files, drag them in, or paste them (Ctrl+V) — up to
  3 photos at once. Three sample photos ship in `app/samples/`, all painted
  procedurally in this repo (`tools/make-samples.mjs`): no photographs of real
  people, no Rockstar art.
- **Per-photo crop & grade**: every loaded photo keeps its own zoom, pan,
  brightness, contrast and saturation, so each photo stays framed the way you
  set it wherever it is placed.
- **Four layouts** (all data in `app/src/cover.js`, `LAYOUTS`, drawn by one
  renderer, so the poster keeps the same title, grade and credit strip in
  every arrangement):
  - **Classic** — tall hero panel left, two stacked panels right.
  - **Triptych** — three equal vertical panels, one story in three beats.
  - **Billboard** — one full-bleed photo with the title overlaid at the
    bottom and a small inset panel.
  - **Grid** — four equal panels, a contact sheet of the same day.
- **Per-panel assignment**: choose which photo fills each panel — one photo
  across all panels, or a different photo per panel.
- **Caption editor**: edit the title (default `VICE CITY NIGHTS`), its font
  (Display, Impact, Serif, Mono — system fonts only), size (48–140px) and
  height, colour (sunset gradient, white, gold, cyan, magenta), dark outline
  and drop shadow, plus a subline (default `SUNSET BOULEVARD`) and an
  optional tagline line. Everything previews live on the canvas.
- **Colour grades**: Sunset (warm pink/orange), Neon (cyan/magenta) and Dusk
  (violet/orange) washes over the panels.
- **Export**: one click downloads a real PNG at the chosen size —
  **1080 × 1080** (square), **1080 × 1350** (portrait), or **1920 × 1080**
  (wide) — as `sunset-cover-<W>x<H>.png`. Export stays disabled, with a clear
  message, until at least one photo is loaded.

## Run it offline

The app is plain static files under `app/` — no build step, no network
request, no upload. Photos are read on your own machine and never leave it.

```sh
node serve.ts
# open http://localhost:8080 in desktop Chrome
```

Or serve `app/` with any static file server. Deep links pick the starting
state, handy for screenshots:

```text
?sample=sunset-beach&sample2=neon-street   load samples into slots
?layout=triptych&size=wide&grade=neon      pick layout / size / grade
?caption=NEON%20NIGHTS&tagline=A%20VICE%20CITY%20STORY
```

## Fast path: photo to PNG

1. Pick a sample (or drop your own photo).
2. Pick a layout.
3. Edit the caption.
4. Pick an export size and hit **Export PNG**.

Three clicks from a sample photo to a finished PNG.

## Privacy

Nothing is uploaded, tracked, or sent anywhere. The app makes zero network
requests at runtime: every script, style sheet, image and font it loads is a
file under `app/` or a `data:` URI, and photos are read with the browser's
local file APIs on your own machine. Close the tab and your photos are gone —
nothing is stored.

## How the cover is composed

Composition follows the baoyu cover-image principles: one visual anchor per
layout (hero panel offset left, full-bleed billboard, or a strict triptych /
grid), breathing room around the title band, a single bold display title plus
one subline, and a warm sunset / vivid neon / cool dusk palette with a bold
mood. The rendering lives in `app/src/cover.js` (`drawCover`,
`drawPhotoCover`, `drawGradeOverlay`, `drawDisplayTitle`, `exportCoverPNG`);
the editor wiring in `app/src/main.js` (photo slots, layout picker, panel
assignment, caption editor, export). Layouts scale to any export size
because every rect is a fraction of the canvas.

All art, lettering and fonts are original — system display fonts only. No
Rockstar Games logo, official artwork or font is used anywhere.

## Hand in (make.fun entry program)

`main.ts` (Node 22, standard library only) copies `app/` and `screenshots/`
to the output directory and writes `dossier.json` with the kit's vendored
library (`vendor/makefun-app.ts`, copied from the kit unchanged):

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Screenshots

Four screenshots under `screenshots/`, each under 256 KiB:

1. `1-cover.jpg` — the exported cover itself (the 1080 × 1080 PNG, scaled).
2. `2-editor-classic.jpg` — the app in the browser, Classic layout, sample photo loaded.
3. `3-editor-triptych.jpg` — the same app in the Triptych layout with two samples.
4. `4-export-wide.jpg` — the exported 1920 × 1080 cover, scaled to 1280 × 720.

## License

MIT — see [LICENSE](LICENSE).

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards</sub>

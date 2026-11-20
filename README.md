# Sunset Cover Studio

[![bounty](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![rank](https://make.fun/badge/vjmunggahari-ui/gta6-cover-art-01-ono10/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![reward](https://make.fun/badge/vjmunggahari-ui/gta6-cover-art-01-ono10/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

Turn photos and a caption into GTA-poster-style cover art — a multi-panel
layout with bold display lettering and a Vice City sunset / neon colour grade —
and export it as a PNG to share. Built for the make.fun competition
[Make GTA 6 Cover Art](https://make.fun/bounty/gta6-cover-art-01).

## What it does

- **Any photos**: choose files, drag them in, or paste them (Ctrl+V) — up to
  3 photos at once. Three sample photos ship in `app/samples/`, all painted
  procedurally in this repo (`tools/make-samples.mjs`): no photographs of real
  people, no Rockstar art.
- **Per-photo crop & grade**: every loaded photo keeps its own zoom, pan,
  brightness, contrast and saturation sliders, so each photo stays framed
  the way you set it wherever it is placed.
- **Four layouts**: Classic (tall hero left, two stacked panels right),
  Triptych (three equal vertical panels), Billboard (one full-bleed photo
  with the title overlaid and an inset panel), and Grid (four equal panels).
  Each layout is data in `app/src/cover.js` (`LAYOUTS`), drawn by one
  renderer, so the poster keeps the same title, grade and credit strip in
  every arrangement.
- **Per-panel assignment**: choose which photo fills each panel — one photo
  across all panels, or a different photo per panel.
- **Caption editor**: edit the title, its font (Display, Impact, Serif,
  Mono — system fonts only), size, height, colour (sunset gradient, white,
  gold, cyan, magenta), dark outline and drop shadow, plus the subline and
  an optional tagline line. Everything previews live.
- **Colour grades**: Sunset, Neon and Dusk washes over the panels.
- **Export**: one click downloads a real PNG at the chosen size —
  **1080 × 1080**, **1080 × 1350**, or **1920 × 1080**
  (`sunset-cover-<W>x<H>.png`). Export stays disabled, with a clear message,
  until at least one photo is loaded.

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

Four screenshots under `screenshots/` (1280 × 720, each under 256 KiB):

1. `1-cover.jpg` — the exported cover itself (the 1080 × 1080 PNG, scaled).
2. `2-editor-classic.jpg` — the app in the browser, Classic layout, sample photo loaded.
3. `3-editor-triptych.jpg` — the same app in the Triptych layout with two samples.
4. `4-export-wide.jpg` — the exported 1920 × 1080 cover, scaled to 1280 × 720.

## License

MIT — see [LICENSE](LICENSE).

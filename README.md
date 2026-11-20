# Sunset Cover Studio

[![bounty](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![rank](https://make.fun/badge/vjmunggahari-ui/gta6-cover-art-01-ono10/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![reward](https://make.fun/badge/vjmunggahari-ui/gta6-cover-art-01-ono10/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

Turn a photo and a caption into GTA-poster-style cover art — a multi-panel
layout with bold display lettering and a Vice City sunset / neon colour grade —
and export it as a PNG to share. Built for the make.fun competition
[Make GTA 6 Cover Art](https://make.fun/bounty/gta6-cover-art-01).

## What it does

- **Any photo**: choose a file, drag it in, or paste it (Ctrl+V). Three sample
  photos ship in `app/samples/` — all painted procedurally in this repo
  (`tools/make-samples.mjs`), no photographs of real people, no Rockstar art.
- **Crop & position**: zoom and pan sliders frame the photo in the hero panel;
  the two side panels reuse the same photo at different crops.
- **Caption**: edit the title, its size and height, and the subline. Titles are
  drawn in a bold display face with a sunset gradient and a dark outline.
- **Colour grades**: Sunset, Neon and Dusk washes over the panels.
- **Export**: one click downloads a **1080 × 1080 PNG** (`sunset-cover-1080.png`).

## Run it offline

The app is plain static files under `app/` — no build step, no network request,
no upload. Photos are read on your own machine and never leave it.

```sh
node serve.ts
# open http://localhost:8080 in desktop Chrome
```

Or serve `app/` with any static file server. `?sample=sunset-beach` (or
`neon-street`, `palm-drive`) opens the app with a sample photo already loaded.

## How the cover is composed

A 1080 × 1080 square: a tilted display title across the top, one tall hero
panel on the left, two stacked panels on the right, a gold rule and a subline
along the bottom. The rendering lives in `app/src/cover.js` (`drawCover`,
`drawPhotoCover`, `drawGradeOverlay`, `drawDisplayTitle`); the editor wiring
in `app/src/main.js` (`loadPhotoFile`, `renderPreview`, `exportCoverPNG`).

All art, lettering and fonts are original — system display fonts only. No
Rockstar Games logo, official artwork or font is used anywhere.

## Hand in (make.fun entry program)

`main.ts` (Node 22, standard library only) copies `app/` and `screenshots/`
to the output directory and writes `dossier.json` with the kit's vendored
library (`vendor/makefun-app.ts`, copied from the kit unchanged):

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## License

MIT — see [LICENSE](LICENSE).

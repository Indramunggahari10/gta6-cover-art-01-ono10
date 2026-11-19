# Sunset Cover Studio

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![rank](https://make.fun/badge/vjmunggahari-ui/gta6-cover-art-01-ono10/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard)
[![reward](https://make.fun/badge/vjmunggahari-ui/gta6-cover-art-01-ono10/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

Turn your photo and a caption into a multi-panel poster cover — a hero panel
plus two detail crops, bold lettering and a Vice City sunset or neon colour
grade — and export it as a PNG to share. Built for make.fun's
[Make GTA 6 Cover Art](https://make.fun/bounty/gta6-cover-art-01) bounty.

Everything is original: the panels, lettering, colour grades and the three
sample photos are drawn by this app's own code. No Rockstar Games logo,
artwork or font is used anywhere.

## Run it (offline)

The app is plain static files under `app/` — no build step, no network, and
your photos never leave your machine.

```sh
node serve.ts
```

Then open <http://localhost:8080> in a desktop browser.

## How it works

1. Load a photo — file picker, drag it onto the cover, paste it, or try one
   of the three built-in samples (procedurally drawn, in `app/samples/`).
2. Pick a panel (Hero, Left detail, Right detail) and crop it: zoom and pan
   sliders, or click a panel and drag the photo inside it.
3. Write the caption, set its size and position (bottom strip, or across the
   hero panel), and pick a colour grade (Vice sunset or Neon nights).
4. Export PNG · 1080 × 1080. More post sizes (1080 × 1350, 1920 × 1080) are
   planned next.

## Screenshots

Screenshots live under `screenshots/` (see `shots.json` for the scenes).
Session A ships one smoke-test shot of the editor with a sample photo loaded;
the cover shot and the other export sizes follow in the next session.

## Entry

- `main.ts` (Node 22) hands the app in: it copies `app/` and `screenshots/`
  to `/output` and writes `dossier.json` with the kit's `vendor/makefun-app.ts`.
- `LICENSE` is MIT. The entry was built for make.fun's `gta6-cover-art-01`
  competition by an AI agent session recorded with the kit's `record` command.

---

<sub>Entered on [make.fun](https://make.fun/) · AI agents build software for cash rewards</sub>

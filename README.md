# Sunset Cover Studio

[![bounty](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/vjmunggahari-ui/gta6-cover-art-01-ono10/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/vjmunggahari-ui/gta6-cover-art-01-ono10/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

Turn a photo and a caption into GTA-style multi-panel cover art — the
poster look with bold lettering and a Vice City sunset / neon colour grade —
and export it as a PNG to share. Built for the
[make.fun gta6-cover-art-01 bounty](https://make.fun/bounty/gta6-cover-art-01).

## What it does

- **Three poster layouts.** Each one is a different composition, not a
  recolour — pick the one that fits the photo:
  - **Vice City Nights** — title band, big main panel, detail crop, tagline block.
  - **Neon Strip** — left-aligned title, two stacked panels, tall right panel, tagline strip.
  - **Sunset Boulevard** — full-width hero photo, two small panels, tagline block.
  Every layout adapts to every export size, because all geometry is
  proportional.
- **Two photos, per-panel control.** Load a photo into slot A and another
  into slot B (file picker, drag-and-drop, paste, or the Sample button,
  which cycles the three built-in samples). Each panel takes either photo,
  with its own zoom (100–220%) and position; each photo has its own grade
  (brightness and contrast 60–140%, saturation 0–200%). A warm sunset grade
  and vignette tie the panels into one poster.
- **Bold lettering, your words.** The caption (up to 28 characters) takes
  one of five system fonts — Poster Black, Impact, Bold Serif, Typewriter,
  Rounded Bold — with size (48–132 px at 1080 wide), height in the title
  band, and one of five colours (white, gold, neon cyan, hot pink, sunset
  cream), plus a dark-outline and neon-shadow toggle. The tagline (up to 40
  characters) can be edited or switched off. The title auto-fits its band
  in width and height, so long words never overflow it.
- **Three export sizes, exact pixels.** Export PNG at **1080 × 1080**,
  **1080 × 1350**, or **1920 × 1080** — the common post sizes. The file
  downloads as `sunset-cover-1080x1080.png` (or `1080x1350` / `1920x1080`).
- **Fast.** Sample photo → pick a layout → caption → export: a finished
  cover in a handful of clicks. The live preview updates on every change.
- **Offline, private.** The app is plain static files under `app/`. It makes
  no network request at all, and photos are read on your machine and never
  uploaded anywhere.

## How to run it

```sh
node serve.ts
# open http://localhost:8080 in desktop Chrome
```

1. Load a photo (or press **Sample** to try one of the three built-in
   procedural samples: sunset beach, neon street, palm drive). Load a second
   photo into slot B for multi-photo covers.
2. Pick a layout, assign photos to panels, adjust zoom / position / grade.
3. Edit the caption and tagline — font, size, colour, outline, shadow.
4. Pick an export size and press **Export PNG**.

Hand-in check (what the grader runs):

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
# writes out/app/, out/screenshots/ and out/dossier.json
```

## How the cover is made

`app/src/cover.js` draws the cover on canvas: a layout geometry (panel
rects, title band, tagline block, keylines — all proportional, so every
layout adapts to every export size), a warm sunset grade and vignette over
each photo panel, and bold system-font lettering with outline and neon
shadow. `app/src/main.js` wires the editor: two photo slots, per-panel
crop, caption editing, layout and size pickers, export, and a self-test
(`?selftest=1`) that runs the real export pipeline for all 3 layouts ×
all 3 sizes and reports the result in the page title. The three sample
photos under `app/samples/` are drawn procedurally by
`tools/gen-samples.mjs` (pure Node, no external images): gradient skies, a
sun with glow, sea and street reflections, building silhouettes with lit
windows, and palm silhouettes.

Layouts (Baoyu direction: scene type, warm + vivid palette, digital
rendering, title-only bold text, bold mood):

| Layout | Composition | Lettering |
| --- | --- | --- |
| Vice City Nights | Title band, big main panel, detail crop, tagline block | Centred, slight tilt, sunset stripe |
| Neon Strip | Left-aligned title, two stacked panels, tall right panel, tagline strip | Left-aligned, hot-pink underline bar |
| Sunset Boulevard | Full-width hero photo, two small panels, tagline block | Centred, gold rule under the title |

Empty states: with no photo loaded the preview says so plainly and export
refuses with a message; a bad file type is rejected with a message; a panel
whose photo slot is empty shows a dashed "NO PHOTO" panel instead of a hole.

## Privacy

Your photos never leave your machine. The app is static files served from
your own computer, it makes zero network requests (verified: the self-test
reports `NET0`), and nothing is uploaded, stored, or sent anywhere.

## Originality

Everything here is original work. No Rockstar Games logo, wordmark, official
artwork, character, or font is used anywhere in the app, the samples, or the
screenshots. Lettering uses system display fonts; the sample photos are
procedurally generated by the included script.

## Files

| Path | What it is |
| --- | --- |
| `main.ts` | Hand-in program: copies `app/` + `screenshots/` to the output dir and writes `dossier.json` |
| `serve.ts` | Tiny static server for trying the app locally |
| `vendor/makefun-app.ts` | The kit's dossier library, unchanged |
| `app/index.html` | The editor page |
| `app/style.css` | Editor styles |
| `app/src/cover.js` | The cover renderer: 3 layouts, grades, lettering |
| `app/src/main.js` | Editor wiring, photo slots, export sizes, self-test |
| `app/samples/*.png` | Three procedural sample photos |
| `tools/gen-samples.mjs` | The sample-photo generator (pure Node PNG encoder) |
| `screenshots/` | Screenshots of the app at work |
| `shots.json` | The screenshot plan |

## License

MIT — see [LICENSE](LICENSE).

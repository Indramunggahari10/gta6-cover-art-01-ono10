// main.ts — Sunset Cover Studio's hand-in program (Node 22, stdlib only).
// Copies app/ and screenshots/ from beside this file into the output
// directory (/output in the grader, or $MAKEFUN_OUTPUT_DIR locally) and
// writes /output/dossier.json with the vendored make.fun library, so the
// sealed scorer can check the entry and the judge can read it.
//
// Runs twice in grading; both runs must write the same bytes. Everything
// here is deterministic: fixed copy order (cpSync walks in directory order),
// no timestamps in the output, and buildDossier is a pure function of the
// files it reads.
//
// Local check:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function countFiles(dir) {
  let n = 0;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    n += statSync(p).isDirectory() ? countFiles(p) : 1;
  }
  return n;
}

// Refuse early, with a clear message, rather than handing in an entry the
// gate would refuse: at most 4 screenshots, each at most 256 KiB.
const shotsDir = join(here, 'screenshots');
const shots = existsSync(shotsDir) ? readdirSync(shotsDir).filter((n) => !n.startsWith('.')) : [];
if (shots.length > 4) throw new Error(`too many screenshots: ${shots.length} (max 4)`);
for (const name of shots) {
  const size = statSync(join(shotsDir, name)).size;
  if (size > 262144) throw new Error(`screenshot too large: ${name} is ${size} bytes (max 262144)`);
}

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(shotsDir)) cpSync(shotsDir, join(out, 'screenshots'), { recursive: true });

writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);

console.log(
  `Sunset Cover Studio handed in: ${countFiles(join(out, 'app'))} app files, ` +
  `${shots.length} screenshot(s), dossier written to ${join(out, 'dossier.json')}`,
);

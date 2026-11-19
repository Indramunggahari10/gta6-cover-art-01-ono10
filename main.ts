// Sunset Cover Studio — make.fun gta6-cover-art-01 entry (program/v1).
//
// main.ts is the entrypoint the grader runs (Node 22, standard library only).
// It hands the app in: it copies this repository's app/ and screenshots/ into
// /output (or $MAKEFUN_OUTPUT_DIR outside the grader) and writes
// /output/dossier.json with buildDossier from vendor/makefun-app.ts, the
// kit's library copied unchanged. It writes nothing else, reads no network,
// and runs the same way twice, so both grader runs produce identical bytes.
//
// Try it locally with:  mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The app: plain static files under app/, served offline from app/index.html.
mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });

// The screenshots: 3 or 4 captures of the app at work, the first by name the
// exported cover. Session A ships one smoke-test shot; Session B adds the rest.
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
} else {
  mkdirSync(join(out, 'screenshots'), { recursive: true });
}

// The dossier: the judge's view of the app, written by the kit's library from
// the files just copied. The caps are the scorer's own (see RULES.txt): the
// text cap shapes the bytes; the rest refuse an entry the scorer would refuse.
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

// A short human-readable summary on stdout (it never lands in /output).
function countFiles(dir) {
  let files = 0;
  let bytes = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      const sub = countFiles(path);
      files += sub.files;
      bytes += sub.bytes;
    } else if (entry.isFile()) {
      files += 1;
      bytes += statSync(path).size;
    }
  }
  return { files, bytes };
}
const app = countFiles(join(out, 'app'));
const shots = countFiles(join(out, 'screenshots'));
console.log(
  `Sunset Cover Studio handed in: app/ ${app.files} files, ${app.bytes} bytes; ` +
    `screenshots/ ${shots.files} files, ${shots.bytes} bytes; dossier.json written.`,
);

// Sunset Cover Studio — make.fun entry program (Node 22, standard library only).
//
// What it does: hands the app in. It copies this repository's app/ and
// screenshots/ into the grader's output directory and writes dossier.json,
// the summary the judge reads, using the kit's vendored library
// (vendor/makefun-app.ts, copied from the kit unchanged).
//
// How to run it locally (the grader runs the same file with /output):
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// The program must write identical bytes on both of the grader's runs, so it
// copies files as they are and lets buildDossier do the summarising.
import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The dossier caps are the scorer's own (see the kit's RULES.txt, "The gate"):
// at most 4 screenshots of 256 KiB each, app/ at most 993 files / 48 MiB,
// paths at most 1000 bytes, dossier text at most 160 KiB.
const DOSSIER_LIMITS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
};

mkdirSync(outputDir, { recursive: true });

// Fail loudly, before copying anything, if the app entry point is missing —
// a silent partial hand-in would be worse than a loud failure.
if (!existsSync(join(repoRoot, 'app', 'index.html'))) {
  throw new Error('Sunset Cover Studio: app/index.html is missing, refusing to hand in');
}

cpSync(join(repoRoot, 'app'), join(outputDir, 'app'), { recursive: true });

mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
}

writeFileSync(join(outputDir, 'dossier.json'), buildDossier(outputDir, DOSSIER_LIMITS));
console.log(`Sunset Cover Studio handed in to ${outputDir}`);

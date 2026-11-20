// make-samples.mjs — build-time generator for the sample photos shipped in
// app/samples/. Every pixel is painted here in plain Node (no libraries, no
// network, no photographs): three invented Vice City scenes — a beach sunset,
// a neon street at night, and a palm-lined boulevard at dusk — so the app can
// demo and screenshot itself offline. Run once: `node tools/make-samples.mjs`.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { deflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const W = 1080;
const H = 720;
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'app', 'samples');

// --- tiny raster canvas -------------------------------------------------
function makeCanvas(w, h) {
  return { w, h, px: new Uint8Array(w * h * 3) };
}
function clamp255(v) { return v < 0 ? 0 : v > 255 ? 255 : v | 0; }
function setPixel(c, x, y, r, g, b, a = 1) {
  if (x < 0 || y < 0 || x >= c.w || y >= c.h) return;
  const i = (y * c.w + x) * 3;
  c.px[i] = clamp255(c.px[i] * (1 - a) + r * a);
  c.px[i + 1] = clamp255(c.px[i + 1] * (1 - a) + g * a);
  c.px[i + 2] = clamp255(c.px[i + 2] * (1 - a) + b * a);
}
function fillRect(c, x0, y0, x1, y1, col, a = 1) {
  for (let y = Math.max(0, y0 | 0); y < Math.min(c.h, y1 | 0); y++)
    for (let x = Math.max(0, x0 | 0); x < Math.min(c.w, x1 | 0); x++)
      setPixel(c, x, y, col[0], col[1], col[2], a);
}
// Vertical gradient between two colours, top -> bottom.
function vGradient(c, y0, y1, top, bottom) {
  for (let y = Math.max(0, y0 | 0); y < Math.min(c.h, y1 | 0); y++) {
    const t = (y - y0) / Math.max(1, y1 - y0);
    const col = [
      top[0] + (bottom[0] - top[0]) * t,
      top[1] + (bottom[1] - top[1]) * t,
      top[2] + (bottom[2] - top[2]) * t,
    ];
    for (let x = 0; x < c.w; x++) setPixel(c, x, y, col[0], col[1], col[2]);
  }
}
// Soft-edged filled disc (glow): alpha falls off toward the rim.
function softDisc(c, cx, cy, r, col, peak = 1) {
  for (let y = Math.max(0, cy - r | 0); y < Math.min(c.h, cy + r | 0); y++) {
    for (let x = Math.max(0, cx - r | 0); x < Math.min(c.w, cx + r | 0); x++) {
      const d = Math.hypot(x - cx, y - cy) / r;
      if (d >= 1) continue;
      setPixel(c, x, y, col[0], col[1], col[2], peak * (1 - d * d));
    }
  }
}
function hardDisc(c, cx, cy, r, col, a = 1) {
  for (let y = Math.max(0, cy - r | 0); y < Math.min(c.h, cy + r | 0); y++)
    for (let x = Math.max(0, cx - r | 0); x < Math.min(c.w, cx + r | 0); x++)
      if (Math.hypot(x - cx, y - cy) <= r) setPixel(c, x, y, col[0], col[1], col[2], a);
}
// Thick line drawn as a chain of small discs.
function thickLine(c, x0, y0, x1, y1, w, col, a = 1) {
  const steps = Math.max(2, Math.hypot(x1 - x0, y1 - y0) | 0);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    hardDisc(c, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, w / 2, col, a);
  }
}
// A palm silhouette: curved trunk + seven drooping fronds.
function palm(c, bx, by, hgt, lean, col) {
  const topX = bx + lean;
  const topY = by - hgt;
  // Trunk as a gentle curve of segments.
  let px = bx, py = by;
  for (let i = 1; i <= 8; i++) {
    const t = i / 8;
    const nx = bx + lean * t * t;
    const ny = by - hgt * t;
    thickLine(c, px, py, nx, ny, 10 - t * 4, col);
    px = nx; py = ny;
  }
  // Fronds: arcs drooping from the crown.
  for (let k = 0; k < 7; k++) {
    const ang = Math.PI * (0.08 + 0.84 * (k / 6));
    const len = hgt * (0.42 + (k % 3) * 0.06);
    let fx = topX, fy = topY;
    for (let s = 1; s <= 6; s++) {
      const t = s / 6;
      const nx = topX + Math.cos(ang) * len * t + lean * 0.15 * t * t;
      const ny = topY + Math.sin(ang) * len * t * 0.55 + len * 0.45 * t * t;
      thickLine(c, fx, fy, nx, ny, 5 - t * 3, col);
      fx = nx; fy = ny;
    }
  }
  hardDisc(c, topX, topY, 7, col); // crown coconuts
}
// Sun with a warm halo, sliced by a horizon line at y = horizon.
function sun(c, cx, cy, r, horizon) {
  softDisc(c, cx, cy, r * 2.6, [255, 122, 24], 0.55);
  softDisc(c, cx, cy, r * 1.5, [255, 170, 60], 0.8);
  for (let y = Math.max(0, cy - r | 0); y < Math.min(c.h, cy + r | 0, horizon | 0); y++)
    for (let x = Math.max(0, cx - r | 0); x < Math.min(c.w, cx + r | 0); x++)
      if (Math.hypot(x - cx, y - cy) <= r) setPixel(c, x, y, 255, 214, 130);
}

// --- PNG encoder (8-bit RGB, filter 0, zlib) ----------------------------
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let v = n;
    for (let k = 0; k < 8; k++) v = v & 1 ? 0xedb88320 ^ (v >>> 1) : v >>> 1;
    t[n] = v;
  }
  return t;
})();
function crc32(buf) {
  let v = 0xffffffff;
  for (let i = 0; i < buf.length; i++) v = CRC_TABLE[(v ^ buf[i]) & 0xff] ^ (v >>> 8);
  return (v ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}
function writePng(c, path) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(c.w, 0); ihdr.writeUInt32BE(c.h, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const raw = Buffer.alloc(c.h * (1 + c.w * 3));
  for (let y = 0; y < c.h; y++) {
    raw[y * (1 + c.w * 3)] = 0;
    raw.set(c.px.subarray(y * c.w * 3, (y + 1) * c.w * 3), y * (1 + c.w * 3) + 1);
  }
  writeFileSync(path, Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]));
}

// --- scenes --------------------------------------------------------------
function sceneSunsetBeach() {
  const c = makeCanvas(W, H);
  vGradient(c, 0, 470, [43, 16, 85], [255, 46, 136]);       // dusk violet -> magenta
  vGradient(c, 470, 560, [255, 122, 24], [255, 201, 60]);   // horizon fire
  sun(c, 540, 430, 110, 470);
  vGradient(c, 470, 560, [255, 122, 24], [120, 40, 90]);    // sea (overwrites band)
  // Sun glitter on the water: short bright dashes under the sun.
  for (let i = 0; i < 90; i++) {
    const y = 475 + ((i * 37) % 80);
    const x = 540 + (((i * 53) % 260) - 130) * (1 + (y - 470) / 60);
    fillRect(c, x, y, x + 26 - ((i * 11) % 14), y + 2, [255, 214, 130], 0.75);
  }
  vGradient(c, 560, 720, [232, 178, 120], [214, 144, 92]);  // sand
  // Distant skyline on the left.
  const sky = [30, 12, 60];
  fillRect(c, 40, 400, 90, 470, sky); fillRect(c, 100, 360, 150, 470, sky);
  fillRect(c, 160, 415, 200, 470, sky); fillRect(c, 900, 390, 960, 470, sky);
  fillRect(c, 970, 420, 1040, 470, sky);
  // Palms framing the beach.
  palm(c, 90, 700, 260, 40, [24, 8, 40]);
  palm(c, 1010, 710, 300, -50, [24, 8, 40]);
  palm(c, 880, 705, 190, 26, [24, 8, 40]);
  return c;
}
function sceneNeonStreet() {
  const c = makeCanvas(W, H);
  vGradient(c, 0, 720, [10, 8, 34], [38, 10, 66]);          // night indigo
  // Stars.
  for (let i = 0; i < 160; i++) {
    const x = (i * 173) % W, y = (i * 97) % 300;
    setPixel(c, x, y, 255, 255, 255, 0.35 + ((i * 13) % 10) / 18);
  }
  softDisc(c, 830, 130, 60, [255, 240, 200], 0.9);          // moon glow
  hardDisc(c, 830, 130, 34, [255, 246, 220]);
  // Building slabs with lit windows.
  const slabs = [[0, 180, 150, 560], [170, 120, 300, 560], [330, 210, 430, 560],
    [700, 150, 830, 560], [850, 230, 960, 560], [980, 170, 1080, 560]];
  for (const [x0, y0, x1, y1] of slabs) fillRect(c, x0, y0, x1, y1, [16, 12, 44]);
  for (let i = 0; i < 260; i++) {
    const sx = (i * 211) % 1060, sy = 130 + ((i * 131) % 400);
    const lit = (i % 5) < 3;
    fillRect(c, sx, sy, sx + 12, sy + 16, lit ? [255, 201, 60] : [0, 229, 199], lit ? 0.95 : 0.5);
  }
  // Neon signs: glowing bars in cyan, magenta, gold.
  const signs = [
    [185, 250, 285, 286, [0, 229, 199]], [345, 300, 415, 330, [255, 46, 136]],
    [720, 260, 815, 292, [255, 46, 136]], [870, 330, 950, 356, [0, 229, 199]],
    [45, 300, 135, 326, [255, 201, 60]],
  ];
  for (const [x0, y0, x1, y1, col] of signs) {
    fillRect(c, x0 - 8, y0 - 8, x1 + 8, y1 + 8, col, 0.22);
    fillRect(c, x0 - 4, y0 - 4, x1 + 4, y1 + 4, col, 0.45);
    fillRect(c, x0, y0, x1, y1, col);
  }
  // Wet street with neon reflections.
  vGradient(c, 560, 720, [22, 14, 52], [10, 8, 30]);
  for (const [x0, , , , col] of signs) {
    fillRect(c, x0, 566, x0 + 60, 700, col, 0.16);
  }
  // Road centre dashes.
  for (let x = 20; x < W; x += 90) fillRect(c, x, 648, x + 44, 656, [255, 201, 60], 0.85);
  palm(c, 640, 560, 200, 24, [8, 6, 26]);
  return c;
}
function scenePalmDrive() {
  const c = makeCanvas(W, H);
  vGradient(c, 0, 480, [0, 80, 110], [255, 122, 24]);       // teal -> orange dusk
  vGradient(c, 480, 520, [255, 170, 60], [255, 201, 60]);
  sun(c, 540, 440, 95, 480);
  // Boulevard: dark asphalt wedge narrowing to the horizon.
  fillRect(c, 0, 520, W, 720, [34, 22, 52]);
  for (let x = 0; x < W; x += 2) {
    const t = x / W;
    const cx = 540 + (x - 540) * 0.12;
    setPixel(c, cx | 0, 640, 255, 201, 60, 0.0); // (kept: road edges below)
  }
  // Road edges converging on the sun.
  thickLine(c, 60, 720, 480, 520, 5, [255, 201, 60], 0.9);
  thickLine(c, 1020, 720, 600, 520, 5, [255, 201, 60], 0.9);
  // Centre dashes shrinking toward the horizon.
  for (let i = 0; i < 7; i++) {
    const y = 690 - i * 26;
    const wdt = 46 - i * 5;
    fillRect(c, 540 - wdt / 2, y, 540 + wdt / 2, y + 8, [255, 240, 200], 0.9);
  }
  // Palm rows on both verges, shrinking with distance.
  const row = (x0, x1, base, dir) => {
    for (let i = 0; i < 5; i++) {
      const t = i / 4;
      const x = x0 + (x1 - x0) * t;
      const hgt = 260 - t * 150;
      palm(c, x, base - t * 130, hgt, dir * (14 + t * 10), [16, 8, 44]);
    }
  };
  row(40, 420, 720, 1);
  row(1040, 660, 720, -1);
  return c;
}

// --- run ------------------------------------------------------------------
mkdirSync(OUT, { recursive: true });
const scenes = [
  ['sunset-beach.png', sceneSunsetBeach],
  ['neon-street.png', sceneNeonStreet],
  ['palm-drive.png', scenePalmDrive],
];
for (const [name, fn] of scenes) {
  writePng(fn(), join(OUT, name));
  console.log('wrote', name);
}
console.log('samples done:', scenes.length);

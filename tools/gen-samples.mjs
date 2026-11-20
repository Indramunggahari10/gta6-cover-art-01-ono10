// gen-samples.mjs — procedural sample photos for Sunset Cover Studio.
// Pure Node 22 standard library: a minimal PNG encoder (zlib deflate) plus
// three hand-drawn scenes (sunset beach, neon street, palm drive), each
// 960x640. No external images, no network, no Rockstar artwork — every pixel
// is computed here from gradients, discs, rectangles and silhouettes.
// Run once at build time: node tools/gen-samples.mjs  (writes app/samples/*.png)
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const W = 960;
const H = 640;
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'app', 'samples');

// ---- seeded random (deterministic output) ----
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---- colour helpers ----
function rgb(r, g, b) { return [r | 0, g | 0, b | 0]; }
function lerpColor(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}
function blend(dst, src, alpha) {
  dst[0] = src[0] * alpha + dst[0] * (1 - alpha);
  dst[1] = src[1] * alpha + dst[1] * (1 - alpha);
  dst[2] = src[2] * alpha + dst[2] * (1 - alpha);
}

// ---- pixel buffer ----
function makeBuffer() { return new Float32Array(W * H * 3); }
function setPx(buf, x, y, c) {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  buf[i] = c[0]; buf[i + 1] = c[1]; buf[i + 2] = c[2];
}
function fillVertical(buf, stops) {
  // stops: [[yFraction, [r,g,b]], ...] sorted by y
  for (let y = 0; y < H; y++) {
    const f = y / (H - 1);
    let a = stops[0], b = stops[stops.length - 1];
    for (let s = 0; s < stops.length - 1; s++) {
      if (f >= stops[s][0] && f <= stops[s + 1][0]) { a = stops[s]; b = stops[s + 1]; break; }
    }
    const t = b[0] === a[0] ? 0 : (f - a[0]) / (b[0] - a[0]);
    const c = lerpColor(a[1], b[1], t);
    for (let x = 0; x < W; x++) setPx(buf, x, y, c);
  }
}
function fillBand(buf, y0, y1, stops) {
  // Vertical gradient confined to rows [y0, y1): like fillVertical, but it
  // never touches rows outside the band (fillVertical repaints everything).
  for (let y = y0; y < y1; y++) {
    const f = (y - y0) / Math.max(1, y1 - 1 - y0);
    let a = stops[0], b = stops[stops.length - 1];
    for (let s = 0; s < stops.length - 1; s++) {
      if (f >= stops[s][0] && f <= stops[s + 1][0]) { a = stops[s]; b = stops[s + 1]; break; }
    }
    const t = b[0] === a[0] ? 0 : (f - a[0]) / (b[0] - a[0]);
    const c = lerpColor(a[1], b[1], t);
    for (let x = 0; x < W; x++) setPx(buf, x, y, c);
  }
}
function disc(buf, cx, cy, r, color, alpha = 1) {
  const r2 = r * r;
  const y0 = Math.max(0, Math.floor(cy - r)), y1 = Math.min(H, Math.ceil(cy + r));
  const x0 = Math.max(0, Math.floor(cx - r)), x1 = Math.min(W, Math.ceil(cx + r));
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const dx = x - cx, dy = y - cy;
      const d2 = dx * dx + dy * dy;
      if (d2 > r2) continue;
      const edge = 1 - Math.sqrt(d2) / r;
      const i = (y * W + x) * 3;
      const a = alpha * (0.35 + 0.65 * edge);
      buf[i] = color[0] * a + buf[i] * (1 - a);
      buf[i + 1] = color[1] * a + buf[i + 1] * (1 - a);
      buf[i + 2] = color[2] * a + buf[i + 2] * (1 - a);
    }
  }
}
function glow(buf, cx, cy, r, color, strength) {
  // soft radial falloff, additive
  const y0 = Math.max(0, Math.floor(cy - r)), y1 = Math.min(H, Math.ceil(cy + r));
  const x0 = Math.max(0, Math.floor(cx - r)), x1 = Math.min(W, Math.ceil(cx + r));
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const dx = x - cx, dy = y - cy;
      const d = Math.sqrt(dx * dx + dy * dy) / r;
      if (d >= 1) continue;
      const a = strength * (1 - d) * (1 - d);
      const i = (y * W + x) * 3;
      buf[i] = Math.min(255, buf[i] + color[0] * a);
      buf[i + 1] = Math.min(255, buf[i + 1] + color[1] * a);
      buf[i + 2] = Math.min(255, buf[i + 2] + color[2] * a);
    }
  }
}
function rect(buf, x0, y0, x1, y1, color, alpha = 1) {
  // Integer bounds only: a Float32Array silently drops writes at fractional
  // indices, so a rect drawn with float coordinates vanishes entirely.
  const ix0 = Math.max(0, Math.floor(x0)), iy0 = Math.max(0, Math.floor(y0));
  const ix1 = Math.min(W, Math.ceil(x1)), iy1 = Math.min(H, Math.ceil(y1));
  for (let y = iy0; y < iy1; y++) {
    for (let x = ix0; x < ix1; x++) {
      const i = (y * W + x) * 3;
      buf[i] = color[0] * alpha + buf[i] * (1 - alpha);
      buf[i + 1] = color[1] * alpha + buf[i + 1] * (1 - alpha);
      buf[i + 2] = color[2] * alpha + buf[i + 2] * (1 - alpha);
    }
  }
}
function line(buf, x0, y0, x1, y1, width, color) {
  const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0)) * 2;
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    const x = Math.round(x0 + (x1 - x0) * t);
    const y = Math.round(y0 + (y1 - y0) * t);
    for (let dy = -width; dy <= width; dy++) {
      for (let dx = -width; dx <= width; dx++) setPx(buf, x + dx, y + dy, color);
    }
  }
}
function palm(buf, bx, by, h, lean, color) {
  // trunk: a leaning segmented line; fronds: arcs of lines from the crown
  const topX = bx + lean, topY = by - h;
  let px = bx, py = by;
  for (let s = 1; s <= 6; s++) {
    const t = s / 6;
    const nx = bx + lean * t * t + Math.sin(t * 3) * 4;
    const ny = by - h * t;
    line(buf, Math.round(px), Math.round(py), Math.round(nx), Math.round(ny), 3, color);
    px = nx; py = ny;
  }
  const rnd = mulberry32(bx * 7 + by);
  for (let f = 0; f < 7; f++) {
    const ang = Math.PI * (0.08 + f * 0.14) + (rnd() - 0.5) * 0.2;
    const len = h * (0.42 + rnd() * 0.2);
    const ex = topX + Math.cos(ang) * len * (f % 2 === 0 ? 1 : -1) * 0.9;
    const ey = topY + Math.abs(Math.sin(ang)) * len * 0.55 + len * 0.12;
    // frond as a drooping curve: 3 segments
    const mx = topX + (ex - topX) * 0.5, my = topY + (ey - topY) * 0.25 - 6;
    line(buf, Math.round(topX), Math.round(topY), Math.round(mx), Math.round(my), 2, color);
    line(buf, Math.round(mx), Math.round(my), Math.round(ex), Math.round(ey), 2, color);
  }
}

// ---- scenes ----
function sceneSunsetBeach() {
  const buf = makeBuffer();
  fillVertical(buf, [
    [0.0, rgb(38, 16, 74)], [0.35, rgb(122, 32, 96)], [0.55, rgb(232, 84, 96)],
    [0.68, rgb(255, 150, 80)], [0.78, rgb(255, 196, 110)], [1.0, rgb(64, 24, 60)],
  ]);
  glow(buf, 480, 400, 260, rgb(255, 170, 90), 0.55);
  disc(buf, 480, 400, 72, rgb(255, 236, 180), 1);
  disc(buf, 480, 400, 58, rgb(255, 214, 130), 1);
  // sea: darker band with a sun reflection streak
  rect(buf, 0, 430, W, 520, rgb(52, 22, 72), 0.85);
  for (let y = 432; y < 520; y++) {
    const wob = Math.sin(y * 0.35) * 26;
    const half = 26 + (y - 430) * 0.55;
    for (let x = Math.round(480 - half + wob); x < Math.round(480 + half + wob); x++) {
      const i = (y * W + x) * 3;
      const a = 0.5 * (1 - (y - 430) / 90);
      buf[i] = 255 * a + buf[i] * (1 - a);
      buf[i + 1] = 190 * a + buf[i + 1] * (1 - a);
      buf[i + 2] = 120 * a + buf[i + 2] * (1 - a);
    }
  }
  // beach foreground: gradient band, rows 520..640 only (never repaints the sky)
  fillBand(buf, 520, H, [[0.0, rgb(96, 44, 66)], [1.0, rgb(40, 16, 40)]]);
  // wet sand sheen
  rect(buf, 0, 520, W, 540, rgb(255, 150, 90), 0.25);
  palm(buf, 120, 640, 260, 46, rgb(24, 8, 26));
  palm(buf, 850, 640, 210, -38, rgb(24, 8, 26));
  // birds
  const bird = rgb(30, 10, 30);
  for (const [bx, by, s] of [[300, 150, 14], [360, 120, 11], [620, 170, 12], [690, 130, 9]]) {
    line(buf, bx - s, by, bx, by - 5, 1, bird);
    line(buf, bx, by - 5, bx + s, by, 1, bird);
  }
  return buf;
}

function sceneNeonStreet() {
  const buf = makeBuffer();
  const rnd = mulberry32(20261120);
  fillVertical(buf, [
    [0.0, rgb(10, 8, 32)], [0.5, rgb(28, 14, 62)], [0.75, rgb(74, 22, 84)], [1.0, rgb(16, 8, 30)],
  ]);
  disc(buf, 760, 150, 46, rgb(255, 214, 140), 1);
  glow(buf, 760, 150, 150, rgb(255, 180, 100), 0.4);
  // buildings
  let x = 0;
  while (x < W) {
    const bw = 70 + rnd() * 110;
    const bh = 150 + rnd() * 220;
    const top = 470 - bh;
    rect(buf, x, top, x + bw, 470, rgb(14, 10, 34), 1);
    // lit windows
    for (let wy = top + 14; wy < 460; wy += 26) {
      for (let wx = x + 10; wx < x + bw - 12; wx += 24) {
        if (rnd() < 0.42) {
          const warm = rnd() < 0.6;
          rect(buf, wx, wy, wx + 12, wy + 16, warm ? rgb(255, 190, 90) : rgb(90, 220, 255), 0.95);
        }
      }
    }
    // neon sign bars on some buildings
    if (rnd() < 0.55) {
      const sy = top + 30 + rnd() * 60;
      const neon = rnd() < 0.5 ? rgb(255, 60, 180) : rgb(60, 230, 255);
      glow(buf, x + bw / 2, sy, 60, neon, 0.5);
      rect(buf, x + 8, sy - 4, x + bw - 8, sy + 4, neon, 1);
    }
    x += bw + 6;
  }
  // street
  rect(buf, 0, 470, W, H, rgb(20, 12, 40), 1);
  // wet-road reflections: vertical smears under the neon
  for (let i = 0; i < 26; i++) {
    const rx = rnd() * W, rw = 4 + rnd() * 14, rh = 40 + rnd() * 110;
    const neon = rnd() < 0.5 ? rgb(255, 60, 180) : rgb(60, 230, 255);
    rect(buf, rx, 470, rx + rw, 470 + rh, neon, 0.16 + rnd() * 0.2);
  }
  // road centre line
  for (let y = 480; y < H; y += 46) rect(buf, 470, y, 490, y + 24, rgb(255, 210, 110), 0.8);
  palm(buf, 60, 640, 190, 30, rgb(10, 6, 22));
  return buf;
}

function scenePalmDrive() {
  const buf = makeBuffer();
  const rnd = mulberry32(777);
  fillVertical(buf, [
    [0.0, rgb(30, 14, 66)], [0.4, rgb(140, 40, 100)], [0.6, rgb(255, 120, 70)],
    [0.72, rgb(255, 190, 110)], [1.0, rgb(50, 20, 56)],
  ]);
  glow(buf, 480, 430, 300, rgb(255, 160, 80), 0.5);
  disc(buf, 480, 430, 60, rgb(255, 226, 160), 1);
  // distant skyline
  let x = 0;
  while (x < W) {
    const bw = 50 + rnd() * 90, bh = 60 + rnd() * 130;
    rect(buf, x, 470 - bh, x + bw, 470, rgb(40, 16, 60), 1);
    x += bw + 4;
  }
  // road perspective
  const road = rgb(28, 14, 40);
  for (let y = 470; y < H; y++) {
    const t = (y - 470) / (H - 470);
    const half = 30 + t * 330;
    rect(buf, 480 - half, y, 480 + half, y + 1, road, 1);
  }
  // centre dashes, widening with perspective
  for (let y = 478; y < H; y += 34) {
    const t = (y - 470) / (H - 470);
    const hw = 2 + t * 8;
    rect(buf, 480 - hw, y, 480 + hw, y + 14 + t * 10, rgb(255, 200, 100), 0.85);
  }
  // roadside glow strips
  rect(buf, 120, 470, 130, H, rgb(255, 80, 180), 0.35);
  rect(buf, 830, 470, 840, H, rgb(80, 220, 255), 0.35);
  palm(buf, 90, 640, 300, 60, rgb(22, 8, 26));
  palm(buf, 880, 640, 260, -52, rgb(22, 8, 26));
  palm(buf, 210, 640, 190, 34, rgb(22, 8, 26));
  palm(buf, 760, 640, 170, -28, rgb(22, 8, 26));
  return buf;
}

// ---- PNG encoder ----
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function pngChunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, 'ascii'), data])), 8 + data.length);
  return out;
}
function encodePNG(buf) {
  const raw = Buffer.alloc((W * 4 + 1) * H);
  for (let y = 0; y < H; y++) {
    raw[y * (W * 4 + 1)] = 0; // filter: none
    for (let x = 0; x < W; x++) {
      const si = (y * W + x) * 3, di = y * (W * 4 + 1) + 1 + x * 4;
      raw[di] = Math.max(0, Math.min(255, Math.round(buf[si])));
      raw[di + 1] = Math.max(0, Math.min(255, Math.round(buf[si + 1])));
      raw[di + 2] = Math.max(0, Math.min(255, Math.round(buf[si + 2])));
      raw[di + 3] = 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw, { level: 6 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync(OUT, { recursive: true });
for (const [name, scene] of [
  ['sunset-beach', sceneSunsetBeach],
  ['neon-street', sceneNeonStreet],
  ['palm-drive', scenePalmDrive],
]) {
  const png = encodePNG(scene());
  writeFileSync(join(OUT, `${name}.png`), png);
  console.log(`${name}.png ${png.length} bytes`);
}
console.log('samples done');

// Generates the app's sample photos procedurally (no external images, no
// Rockstar art): three 800 x 800 sunset scenes painted pixel by pixel and
// written as PNGs under app/samples/. Run once at build time:
//
//   node tools/gen-samples.mjs
//
// The PNG writer is hand-rolled on node:zlib (deflate) with a CRC32 table —
// the script needs nothing installed. Every scene is deterministic: the same
// run always writes the same bytes.

import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SIZE = 800;
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'app', 'samples');

// --- tiny deterministic PRNG (mulberry32) ---------------------------------
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- CRC32 ------------------------------------------------------------------
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let c = 0xffffffff;
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function writePng(path, rgb, w, h) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y += 1) {
    raw[y * (w * 3 + 1)] = 0; // filter: none
    rgb.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: RGB
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw, { level: 6 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
  writeFileSync(path, png);
  return png.length;
}

// --- a small RGB canvas -------------------------------------------------------
class Canvas {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.px = Buffer.alloc(w * h * 3);
  }

  set(x, y, r, g, b) {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    if (xi < 0 || yi < 0 || xi >= this.w || yi >= this.h) return;
    const i = (yi * this.w + xi) * 3;
    this.px[i] = r;
    this.px[i + 1] = g;
    this.px[i + 2] = b;
  }

  // Blend a colour over the pixel with alpha 0..1.
  blend(x, y, r, g, b, a) {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    if (xi < 0 || yi < 0 || xi >= this.w || yi >= this.h) return;
    const i = (yi * this.w + xi) * 3;
    this.px[i] = this.px[i] * (1 - a) + r * a;
    this.px[i + 1] = this.px[i + 1] * (1 - a) + g * a;
    this.px[i + 2] = this.px[i + 2] * (1 - a) + b * a;
  }

  rect(x0, y0, x1, y1, r, g, b) {
    for (let y = Math.max(0, y0); y < Math.min(this.h, y1); y += 1) {
      for (let x = Math.max(0, x0); x < Math.min(this.w, x1); x += 1) {
        this.set(x, y, r, g, b);
      }
    }
  }

  vgrad(stops) {
    for (let y = 0; y < this.h; y += 1) {
      const t = y / (this.h - 1);
      let a = stops[0];
      let b = stops[stops.length - 1];
      for (let s = 0; s < stops.length - 1; s += 1) {
        if (t >= stops[s][0] && t <= stops[s + 1][0]) {
          a = stops[s];
          b = stops[s + 1];
          break;
        }
      }
      const f = (t - a[0]) / Math.max(0.0001, b[0] - a[0]);
      const r = a[1] + (b[1] - a[1]) * f;
      const g = a[2] + (b[2] - a[2]) * f;
      const bl = a[3] + (b[3] - a[3]) * f;
      for (let x = 0; x < this.w; x += 1) this.set(x, y, r, g, bl);
    }
  }

  disc(cx, cy, rad, r, g, b) {
    for (let y = Math.floor(cy - rad); y <= cy + rad; y += 1) {
      for (let x = Math.floor(cx - rad); x <= cx + rad; x += 1) {
        const d = Math.hypot(x - cx, y - cy);
        if (d <= rad) this.set(x, y, r, g, b);
      }
    }
  }

  glow(cx, cy, rad, r, g, b, peak) {
    for (let y = Math.floor(cy - rad); y <= cy + rad; y += 1) {
      for (let x = Math.floor(cx - rad); x <= cx + rad; x += 1) {
        const d = Math.hypot(x - cx, y - cy) / rad;
        if (d < 1) this.blend(x, y, r, g, b, peak * (1 - d) * (1 - d));
      }
    }
  }

  // A thick line, stamped as discs along its length.
  line(x0, y0, x1, y1, width, r, g, b) {
    const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0));
    for (let s = 0; s <= steps; s += 1) {
      const t = s / steps;
      this.disc(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, width / 2, r, g, b);
    }
  }

  // A palm silhouette: a leaning trunk and arcing fronds.
  palm(x, baseY, height, lean, dark) {
    const topX = x + lean;
    const topY = baseY - height;
    this.line(x, baseY, topX, topY, 13, ...dark);
    const rand = rng(Math.floor(x * 7 + height));
    for (let f = 0; f < 7; f += 1) {
      const ang = Math.PI * (0.12 + (f / 7) * 0.76) + (rand() - 0.5) * 0.2;
      const len = height * (0.42 + rand() * 0.18);
      const ex = topX + Math.cos(ang) * len * (f < 3 ? -1 : 1);
      const ey = topY + Math.abs(Math.sin(ang)) * len * 0.55 + len * 0.12;
      this.line(topX, topY, ex, ey, 7, ...dark);
    }
    this.disc(topX, topY, 12, ...dark);
  }
}

const DARK = [26, 10, 46];
const DARKER = [16, 6, 30];

// --- scene 1: sunset boulevard -----------------------------------------------
function boulevard() {
  const c = new Canvas(SIZE, SIZE);
  c.vgrad([
    [0, 43, 16, 64],
    [0.42, 158, 52, 130],
    [0.62, 255, 126, 95],
    [1, 254, 180, 123],
  ]);
  c.glow(400, 470, 260, 255, 190, 120, 0.55);
  c.disc(400, 470, 78, 255, 214, 140);
  // Distant skyline.
  const rand = rng(11);
  let x = 0;
  while (x < SIZE) {
    const bw = 46 + rand() * 70;
    const bh = 90 + rand() * 170;
    c.rect(x, 560 - bh, x + bw, 560, ...DARK);
    for (let wy = 560 - bh + 12; wy < 548; wy += 18) {
      for (let wx = x + 8; wx < x + bw - 8; wx += 16) {
        if (rand() < 0.5) c.rect(wx, wy, wx + 6, wy + 8, 255, 190, 110);
      }
    }
    x += bw + 6;
  }
  // The road, widening towards the viewer.
  c.rect(0, 560, SIZE, SIZE, 34, 16, 52);
  for (let y = 560; y < SIZE; y += 1) {
    const t = (y - 560) / 240;
    const half = 26 + t * 150;
    for (let px = 400 - half; px < 400 + half; px += 1) {
      c.blend(px, y, 58, 28, 74, 0.5);
    }
  }
  for (let i = 0; i < 7; i += 1) {
    const y = 580 + i * i * 3.4;
    c.rect(396, y, 404, y + 8 + i * 2, 255, 200, 120);
  }
  // Palms lining the road.
  c.palm(90, 700, 260, -38, DARK);
  c.palm(716, 720, 290, 44, DARK);
  c.palm(150, 790, 210, -30, DARKER);
  c.palm(660, 795, 220, 30, DARKER);
  return c;
}

// --- scene 2: neon pier ---------------------------------------------------------
function pier() {
  const c = new Canvas(SIZE, SIZE);
  c.vgrad([
    [0, 4, 18, 46],
    [0.5, 18, 58, 109],
    [0.72, 120, 45, 120],
    [1, 233, 69, 96],
  ]);
  const rand = rng(23);
  for (let i = 0; i < 130; i += 1) {
    c.set(rand() * SIZE, rand() * 380, 255, 255, 255);
  }
  c.glow(620, 150, 130, 220, 240, 255, 0.5);
  c.disc(620, 150, 42, 235, 244, 255);
  // The sea, with neon reflections.
  for (let y = 400; y < 640; y += 1) {
    const t = (y - 400) / 240;
    const base = 14 + t * 26;
    for (let x = 0; x < SIZE; x += 1) {
      const shimmer = Math.sin(x * 0.05 + y * 0.35) * 6;
      c.set(x, y, base + shimmer, 30 + t * 30, 80 + t * 40);
    }
  }
  for (let i = 0; i < 26; i += 1) {
    const x = 120 + rand() * 560;
    const y = 420 + rand() * 200;
    const w = 30 + rand() * 90;
    const neon = rand() < 0.5 ? [0, 229, 255] : [255, 46, 136];
    c.rect(x, y, x + w, y + 3, ...neon);
  }
  // The pier planks.
  for (let y = 640; y < SIZE; y += 8) {
    c.rect(0, y, SIZE, y + 6, 30, 16, 44);
    c.rect(0, y + 6, SIZE, y + 8, 12, 6, 22);
  }
  c.rect(120, 640, 128, SIZE, 52, 28, 66);
  c.rect(672, 640, 680, SIZE, 52, 28, 66);
  // Neon sign glows on the pier.
  c.glow(200, 600, 90, 255, 46, 136, 0.6);
  c.glow(600, 590, 80, 0, 229, 255, 0.6);
  c.disc(200, 600, 16, 255, 120, 180);
  c.disc(600, 590, 14, 120, 235, 255);
  // Palm silhouettes at the pier's end.
  c.palm(70, 660, 200, -26, DARKER);
  c.palm(736, 660, 210, 30, DARKER);
  return c;
}

// --- scene 3: palm drive ---------------------------------------------------------
function palms() {
  const c = new Canvas(SIZE, SIZE);
  c.vgrad([
    [0, 6, 40, 70],
    [0.45, 0, 150, 160],
    [0.68, 255, 140, 90],
    [1, 255, 200, 130],
  ]);
  c.glow(400, 430, 300, 255, 170, 100, 0.5);
  c.disc(400, 430, 66, 255, 220, 150);
  // Distant hills.
  for (let x = 0; x < SIZE; x += 1) {
    const hill = 520 - Math.sin(x * 0.008) * 46 - Math.sin(x * 0.021 + 2) * 18;
    for (let y = hill; y < 560; y += 1) c.set(x, y, 74, 34, 92);
  }
  // The road curving away.
  for (let y = 560; y < SIZE; y += 1) {
    const t = (y - 560) / 240;
    const centre = 400 - t * t * 130;
    const half = 18 + t * 170;
    for (let x = Math.floor(centre - half); x < centre + half; x += 1) {
      c.set(x, y, 40, 20, 58);
    }
  }
  for (let i = 0; i < 8; i += 1) {
    const y = 575 + i * i * 3.2;
    const centre = 400 - ((y - 560) / 240) ** 2 * 130;
    c.rect(centre - 4, y, centre + 4, y + 7 + i * 2, 255, 210, 130);
  }
  // Big palms framing the drive.
  c.palm(110, 780, 380, -58, DARK);
  c.palm(700, 790, 400, 62, DARK);
  c.palm(210, 800, 260, -40, DARKER);
  c.palm(600, 800, 270, 42, DARKER);
  return c;
}

mkdirSync(OUT, { recursive: true });
for (const [name, scene] of [
  ['sunset-boulevard', boulevard],
  ['neon-pier', pier],
  ['palm-drive', palms],
]) {
  const canvas = scene();
  const bytes = writePng(join(OUT, `${name}.png`), canvas.px, SIZE, SIZE);
  console.log(`${name}.png: ${bytes} bytes`);
}

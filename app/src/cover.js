// Draws the cover: three panels of the person's photo (one hero, two detail
// crops) over a sunset or neon grade, with a bold caption in a bottom strip
// or across the hero panel. Pure canvas 2D, no assets: every colour, panel
// and letter is drawn here, so the exported PNG is the app's own art.
//
// State shape (see main.js):
//   photo        an <img> (or null before one is loaded)
//   panels       [{ zoom, x, y, flip }] — one per panel; x/y is the focus
//                point of the crop, as a fraction of the photo (0..1)
//   caption      the words on the cover
//   captionSize  caption height in pixels at 1080 x 1080
//   captionPos   'bottom' (its own strip) or 'hero' (over the hero panel)
//   grade        'sunset' or 'neon'

export const COVER_SIZE = 1080;
const MARGIN = 36;
const GAP = 28;

// Panel rectangles on the 1080 x 1080 cover, in drawing order.
export const PANELS = [
  { x: 36, y: 36, w: 1008, h: 540 }, // hero
  { x: 36, y: 604, w: 492, h: 288 }, // left detail
  { x: 552, y: 604, w: 492, h: 288 }, // right detail
];

// The caption strip under the panels (only used when captionPos is 'bottom').
const CAPTION_STRIP = { x: 36, y: 920, w: 1008, h: 124 };

const GRADES = {
  sunset: {
    bg: ['#1b0b3b', '#7b2d8b', '#ff7e5f'],
    tintTop: 'rgba(255, 126, 95, 0.10)',
    tintMid: 'rgba(255, 46, 136, 0.16)',
    tintBottom: 'rgba(123, 45, 139, 0.34)',
    accent: '#ff2e88',
  },
  neon: {
    bg: ['#04122e', '#123a6d', '#e94560'],
    tintTop: 'rgba(0, 194, 255, 0.12)',
    tintMid: 'rgba(0, 229, 255, 0.16)',
    tintBottom: 'rgba(233, 69, 96, 0.34)',
    accent: '#00e5ff',
  },
};

/** The panel (0, 1 or 2) holding point (x, y) in cover pixels, or -1. */
export function panelAt(x, y) {
  for (let i = PANELS.length - 1; i >= 0; i -= 1) {
    const p = PANELS[i];
    if (x >= p.x && x < p.x + p.w && y >= p.y && y < p.y + p.h) return i;
  }
  return -1;
}

function drawPhotoIn(ctx, photo, rect, panel) {
  const iw = photo.naturalWidth;
  const ih = photo.naturalHeight;
  const base = Math.max(rect.w / iw, rect.h / ih);
  const scale = base * panel.zoom;
  const dw = iw * scale;
  const dh = ih * scale;
  // Put the panel's focus point at the panel's centre, then clamp so the
  // photo always covers the panel (no empty corners at any zoom).
  let dx = rect.x + rect.w / 2 - panel.x * dw;
  let dy = rect.y + rect.h / 2 - panel.y * dh;
  dx = Math.min(rect.x, Math.max(rect.x + rect.w - dw, dx));
  dy = Math.min(rect.y, Math.max(rect.y + rect.h - dh, dy));
  ctx.save();
  ctx.translate(rect.x, rect.y);
  if (panel.flip) {
    ctx.translate(rect.w, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(photo, dx - rect.x, dy - rect.y, dw, dh);
  ctx.restore();
}

function drawEmptyPanel(ctx, rect, grade) {
  const g = ctx.createLinearGradient(0, rect.y, 0, rect.y + rect.h);
  g.addColorStop(0, '#3a1c5e');
  g.addColorStop(1, '#1b0b3b');
  ctx.fillStyle = g;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  // A small sun and a skyline, so the empty cover still reads as a poster.
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h * 0.38;
  const sun = ctx.createRadialGradient(cx, cy, 4, cx, cy, rect.h * 0.3);
  sun.addColorStop(0, 'rgba(255, 190, 120, 0.95)');
  sun.addColorStop(1, 'rgba(255, 46, 136, 0)');
  ctx.fillStyle = sun;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.fillStyle = 'rgba(255, 190, 120, 0.9)';
  ctx.beginPath();
  ctx.arc(cx, cy, rect.h * 0.11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(20, 8, 34, 0.9)';
  const base = rect.y + rect.h * 0.82;
  for (let i = 0; i < 7; i += 1) {
    const bw = rect.w / 7;
    const bh = rect.h * (0.08 + ((i * 37) % 10) / 55);
    ctx.fillRect(rect.x + i * bw + 2, base - bh, bw - 4, bh + rect.h * 0.18);
  }
}

function drawPanelBorder(ctx, rect) {
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 5;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 5;
  ctx.strokeRect(rect.x + 2.5, rect.y + 2.5, rect.w - 5, rect.h - 5);
  ctx.restore();
}

function drawCaption(ctx, text, size, centreY, maxWidth, accent) {
  const words = text.trim().toUpperCase();
  if (!words) return 0;
  let s = size;
  const font = (px) => `italic 900 ${px}px "Arial Black", Arial, Helvetica, sans-serif`;
  ctx.font = font(s);
  while (ctx.measureText(words).width > maxWidth && s > 24) {
    s -= 2;
    ctx.font = font(s);
  }
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.shadowColor = accent;
  ctx.shadowBlur = s * 0.22;
  ctx.strokeStyle = 'rgba(20, 5, 30, 0.92)';
  ctx.lineWidth = Math.max(4, s * 0.13);
  ctx.strokeText(words, COVER_SIZE / 2, centreY);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(words, COVER_SIZE / 2, centreY);
  ctx.restore();
  // A neon underline bar, centred under the words.
  const barW = Math.min(maxWidth, ctx.measureText(words).width * 0.62);
  ctx.fillStyle = accent;
  ctx.fillRect(
    COVER_SIZE / 2 - barW / 2,
    centreY + s * 0.52,
    barW,
    Math.max(5, s * 0.07),
  );
  return s;
}

/** Draws the whole cover onto the canvas (which must be 1080 x 1080). */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const grade = GRADES[state.grade] ?? GRADES.sunset;

  // Backdrop: the sunset or neon wash the panels sit on.
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, grade.bg[0]);
  bg.addColorStop(0.55, grade.bg[1]);
  bg.addColorStop(1, grade.bg[2]);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // The three panels.
  PANELS.forEach((rect, i) => {
    const panel = state.panels[i];
    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
    ctx.clip();
    if (state.photo) {
      drawPhotoIn(ctx, state.photo, rect, panel);
    } else {
      drawEmptyPanel(ctx, rect, grade);
    }
    // Colour grade over the photo, stronger towards the foot of each panel.
    const tint = ctx.createLinearGradient(0, rect.y, 0, rect.y + rect.h);
    tint.addColorStop(0, grade.tintTop);
    tint.addColorStop(0.55, grade.tintMid);
    tint.addColorStop(1, grade.tintBottom);
    ctx.fillStyle = tint;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.restore();
    drawPanelBorder(ctx, rect);
  });

  // A soft vignette over the whole cover, so the panels sit in one poster.
  const vig = ctx.createRadialGradient(w / 2, h * 0.45, h * 0.35, w / 2, h * 0.5, h * 0.78);
  vig.addColorStop(0, 'rgba(10, 0, 20, 0)');
  vig.addColorStop(1, 'rgba(10, 0, 20, 0.30)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);

  // The caption — or, while no photo is in yet, a "load a photo" note in the
  // same strip (never both: they would print on top of each other).
  if (!state.photo) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '700 30px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 10;
    ctx.fillText('LOAD A PHOTO TO BEGIN', w / 2, CAPTION_STRIP.y + CAPTION_STRIP.h / 2 - 6);
    ctx.restore();
    return;
  }
  if (state.captionPos === 'hero') {
    const hero = PANELS[0];
    const band = ctx.createLinearGradient(0, hero.y + hero.h - 120, 0, hero.y + hero.h);
    band.addColorStop(0, 'rgba(10, 0, 20, 0)');
    band.addColorStop(1, 'rgba(10, 0, 20, 0.72)');
    ctx.fillStyle = band;
    ctx.fillRect(hero.x, hero.y + hero.h - 120, hero.w, 120);
    drawCaption(ctx, state.caption, Math.min(state.captionSize, 110), hero.y + hero.h - 52, hero.w - 72, grade.accent);
  } else {
    drawCaption(
      ctx,
      state.caption,
      state.captionSize,
      CAPTION_STRIP.y + CAPTION_STRIP.h / 2 - 6,
      CAPTION_STRIP.w - 40,
      grade.accent,
    );
  }
}

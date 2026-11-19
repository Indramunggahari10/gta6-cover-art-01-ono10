// Sunset Cover Studio — cover renderer (Session B).
//
// Draws the cover on a canvas at any of the three export sizes, in any of
// the three layouts, from the person's own photos. Pure canvas 2D, no
// assets: every colour, panel and letter is drawn here, so the exported PNG
// is the app's own art. No Rockstar logo, artwork or font anywhere.
//
// State shape (see src/main.js):
//   layoutId     'trio' | 'quad' | 'strips'
//   sizeId       '1080x1080' | '1080x1350' | '1920x1080'
//   photos       [{ id, name, img }] — the loaded photo library
//   panelsByLayout  { trio: [panel...], quad: [panel...], strips: [panel...] }
//     panel: { photoId, zoom, x, y, flip, bright, contrast, sat }
//       photoId is a library id, or null for an empty panel; x/y is the
//       focus point of the crop, as a fraction of the photo (0..1);
//       bright/contrast/sat are grade factors (1 = untouched)
//   caption      { text, tagline, font, size, color, pos, outline, glow }
//     size is caption height in pixels at 1080 px wide; it scales with the
//     cover width. pos is 'bottom' | 'hero' | 'top'.
//   grade        'sunset' | 'neon' | 'dusk'

export const EXPORT_SIZES = [
  { id: '1080x1080', w: 1080, h: 1080, label: '1080 × 1080 · Square post' },
  { id: '1080x1350', w: 1080, h: 1350, label: '1080 × 1350 · Portrait post' },
  { id: '1920x1080', w: 1920, h: 1080, label: '1920 × 1080 · Wide post' },
];

export const GRADES = {
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
  dusk: {
    bg: ['#12082e', '#4b1d6e', '#ff9a3d'],
    tintTop: 'rgba(255, 154, 61, 0.10)',
    tintMid: 'rgba(178, 80, 220, 0.16)',
    tintBottom: 'rgba(75, 29, 110, 0.36)',
    accent: '#ffb347',
  },
};

export const CAPTION_FONTS = {
  black: { label: 'Poster Black', css: (px) => `italic 900 ${px}px "Arial Black", Arial, Helvetica, sans-serif` },
  impact: { label: 'Impact Tall', css: (px) => `900 ${px}px Impact, "Arial Narrow Bold", Arial, sans-serif` },
  serif: { label: 'Classic Serif', css: (px) => `900 ${px}px Georgia, "Times New Roman", serif` },
  mono: { label: 'Typewriter', css: (px) => `800 ${px}px "Courier New", Courier, monospace` },
  round: { label: 'Friendly Bold', css: (px) => `900 ${px}px "Trebuchet MS", Verdana, sans-serif` },
};

export const CAPTION_COLORS = {
  '#ffffff': 'White',
  '#ffd23e': 'Sunset gold',
  '#ff5e8a': 'Hot pink',
  '#7ff3ff': 'Neon cyan',
};

// Frame shared by the panel layouts: outer margin, gap between panels and
// the height of the bottom caption strip, all scaled to the cover.
function frame(w, h) {
  const m = Math.max(16, Math.round(Math.min(w, h) * 0.033));
  const gap = Math.max(10, Math.round(Math.min(w, h) * 0.026));
  const stripH = Math.round(h * 0.13);
  return { m, gap, stripH };
}

// Each layout names its panels and tells the renderer where the caption
// lives. panels(w, h) returns rectangles in cover pixels, in drawing order.
// captionZone(w, h) returns the band the caption sits in when pos is
// 'bottom' (or 'top' for the strips layout).
export const LAYOUTS = {
  trio: {
    name: 'Sunset Trio',
    blurb: 'One wide hero panel over two detail crops — the classic poster.',
    labels: ['Hero', 'Left detail', 'Right detail'],
    panels(w, h) {
      const { m, gap, stripH } = frame(w, h);
      const stripY = h - m - stripH;
      const heroH = Math.round((stripY - gap - m) * 0.62);
      const detailY = m + heroH + gap;
      const detailH = stripY - gap - detailY;
      const detailW = Math.round((w - 2 * m - gap) / 2);
      return [
        { x: m, y: m, w: w - 2 * m, h: heroH },
        { x: m, y: detailY, w: detailW, h: detailH },
        { x: m + detailW + gap, y: detailY, w: detailW, h: detailH },
      ];
    },
    captionZone(w, h) {
      const { m, stripH } = frame(w, h);
      return { x: m, y: h - m - stripH, w: w - 2 * m, h: stripH };
    },
  },
  quad: {
    name: 'Four-Up',
    blurb: 'One big panel beside a column of three details — a busy, rich poster.',
    labels: ['Big panel', 'Top detail', 'Middle detail', 'Bottom detail'],
    panels(w, h) {
      const { m, gap, stripH } = frame(w, h);
      const top = m;
      const bottom = h - m - stripH;
      const leftW = Math.round((w - 2 * m - gap) * 0.56);
      const rightX = m + leftW + gap;
      const rightW = w - m - rightX;
      const rh = Math.round((bottom - top - 2 * gap) / 3);
      return [
        { x: m, y: top, w: leftW, h: bottom - top },
        { x: rightX, y: top, w: rightW, h: rh },
        { x: rightX, y: top + rh + gap, w: rightW, h: rh },
        { x: rightX, y: top + 2 * (rh + gap), w: rightW, h: rh },
      ];
    },
    captionZone(w, h) {
      const { m, stripH } = frame(w, h);
      return { x: m, y: h - m - stripH, w: w - 2 * m, h: stripH };
    },
  },
  strips: {
    name: 'Vice Strips',
    blurb: 'Bold title band on top, three tall strips below — a magazine cover.',
    labels: ['Left strip', 'Middle strip', 'Right strip'],
    panels(w, h) {
      const { m, gap } = frame(w, h);
      const bandH = Math.round(h * 0.17);
      const tagH = Math.round(h * 0.05);
      const y0 = bandH + m;
      const ph = h - m - tagH - y0;
      const pw = Math.round((w - 2 * m - 2 * gap) / 3);
      return [
        { x: m, y: y0, w: pw, h: ph },
        { x: m + pw + gap, y: y0, w: pw, h: ph },
        { x: m + 2 * (pw + gap), y: y0, w: pw, h: ph },
      ];
    },
    captionZone(w, h) {
      return { x: 0, y: 0, w, h: Math.round(h * 0.17) };
    },
  },
};

export const LAYOUT_IDS = Object.keys(LAYOUTS);

/** Panel rectangles for a layout at a cover size. */
export function layoutPanels(layoutId, w, h) {
  return (LAYOUTS[layoutId] ?? LAYOUTS.trio).panels(w, h);
}

/** The panel (index) holding point (x, y) in cover pixels, or -1. */
export function panelAt(x, y, layoutId, w, h) {
  const rects = layoutPanels(layoutId, w, h);
  for (let i = rects.length - 1; i >= 0; i -= 1) {
    const p = rects[i];
    if (x >= p.x && x < p.x + p.w && y >= p.y && y < p.y + p.h) return i;
  }
  return -1;
}

/** True when at least one panel of the layout shows a photo. */
export function hasAnyPhoto(state) {
  return (state.panelsByLayout[state.layoutId] ?? []).some((p) => p.photoId != null);
}

function photoById(state, id) {
  return state.photos.find((p) => p.id === id)?.img ?? null;
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
  ctx.filter = `brightness(${panel.bright}) contrast(${panel.contrast}) saturate(${panel.sat})`;
  ctx.translate(rect.x, rect.y);
  if (panel.flip) {
    ctx.translate(rect.w, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(photo, dx - rect.x, dy - rect.y, dw, dh);
  ctx.restore();
  ctx.filter = 'none';
}

function drawEmptyPanel(ctx, rect) {
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

// One line of poster lettering, centred at (cx, centreY), shrunk to fit.
function drawCaptionLine(ctx, text, size, cx, centreY, maxWidth, caption, accent) {
  const words = text.trim().toUpperCase();
  if (!words) return 0;
  const font = CAPTION_FONTS[caption.font] ?? CAPTION_FONTS.black;
  let s = size;
  ctx.font = font.css(s);
  while (ctx.measureText(words).width > maxWidth && s > 18) {
    s -= 2;
    ctx.font = font.css(s);
  }
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  if (caption.glow) {
    ctx.shadowColor = accent;
    ctx.shadowBlur = s * 0.22;
  } else {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
    ctx.shadowBlur = Math.max(4, s * 0.08);
    ctx.shadowOffsetY = Math.max(2, s * 0.04);
  }
  if (caption.outline) {
    ctx.strokeStyle = 'rgba(20, 5, 30, 0.92)';
    ctx.lineWidth = Math.max(3, s * 0.12);
    ctx.strokeText(words, cx, centreY);
  }
  ctx.fillStyle = caption.color;
  ctx.fillText(words, cx, centreY);
  const width = ctx.measureText(words).width;
  ctx.restore();
  return { size: s, width };
}

// The caption plus its optional tagline, stacked in one band. The caption
// is capped to the band's height, so a wide cover's big lettering never
// spills out of a short band. Returns the caption size actually used.
function drawCaptionBlock(ctx, caption, zone, scale, accent) {
  const hasTag = caption.tagline.trim().length > 0;
  let size = caption.size * scale;
  const cap = hasTag ? zone.h * 0.52 : zone.h * 0.72;
  if (size > cap) size = cap;
  const cx = zone.x + zone.w / 2;
  const maxW = zone.w - Math.max(24, 40 * scale);
  if (!hasTag) {
    return drawCaptionLine(ctx, caption.text, size, cx, zone.y + zone.h / 2, maxW, caption, accent).size;
  }
  const capY = zone.y + zone.h * 0.30;
  const capResult = drawCaptionLine(ctx, caption.text, size, cx, capY, maxW, caption, accent);
  const used = capResult.size ?? size;
  const tagSize = Math.max(14, used * 0.30);
  ctx.save();
  ctx.font = `800 ${tagSize}px "Trebuchet MS", Verdana, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
  ctx.shadowBlur = 8;
  ctx.fillText(caption.tagline.trim().toUpperCase(), cx, zone.y + zone.h * 0.82);
  ctx.restore();
  // A short accent bar between the caption and the tagline.
  const barW = Math.min(maxW * 0.5, (capResult.width ?? 0) * 0.4);
  ctx.fillStyle = accent;
  ctx.fillRect(cx - barW / 2, zone.y + zone.h * 0.60, barW, Math.max(4, used * 0.06));
  return used;
}

/** Draws the whole cover onto the canvas (sized to an export size). */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const scale = w / 1080;
  const layout = LAYOUTS[state.layoutId] ?? LAYOUTS.trio;
  const grade = GRADES[state.grade] ?? GRADES.sunset;
  const rects = layout.panels(w, h);
  const panels = state.panelsByLayout[state.layoutId] ?? [];

  // Backdrop: the sunset, neon or dusk wash the panels sit on.
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, grade.bg[0]);
  bg.addColorStop(0.55, grade.bg[1]);
  bg.addColorStop(1, grade.bg[2]);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // The panels.
  rects.forEach((rect, i) => {
    const panel = panels[i];
    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
    ctx.clip();
    const photo = panel ? photoById(state, panel.photoId) : null;
    if (photo) {
      drawPhotoIn(ctx, photo, rect, panel);
    } else {
      drawEmptyPanel(ctx, rect);
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

  // The caption — or, while no photo is in yet, a "load a photo" note in
  // the caption band (never both: they would print on top of each other).
  const zone = layout.captionZone(w, h);
  if (!hasAnyPhoto(state)) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 ${Math.max(22, 30 * scale)}px system-ui, sans-serif`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 10;
    ctx.fillText('LOAD A PHOTO TO BEGIN', w / 2, zone.y + zone.h / 2);
    ctx.restore();
    return;
  }
  const pos = state.caption.pos;
  if (pos === 'hero') {
    const hero = rects[0];
    const bandH = Math.round(state.caption.size * scale * 2.1);
    const bandY = hero.y + hero.h - bandH;
    const band = ctx.createLinearGradient(0, bandY, 0, hero.y + hero.h);
    band.addColorStop(0, 'rgba(10, 0, 20, 0)');
    band.addColorStop(1, 'rgba(10, 0, 20, 0.72)');
    ctx.fillStyle = band;
    ctx.fillRect(hero.x, bandY, hero.w, bandH);
    drawCaptionBlock(ctx, state.caption, { x: hero.x + 24, y: bandY, w: hero.w - 48, h: bandH }, scale, grade.accent);
  } else if (pos === 'top') {
    const bandH = Math.round(state.caption.size * scale * 2.2);
    const band = ctx.createLinearGradient(0, 0, 0, bandH);
    band.addColorStop(0, 'rgba(10, 0, 20, 0.78)');
    band.addColorStop(1, 'rgba(10, 0, 20, 0)');
    ctx.fillStyle = band;
    ctx.fillRect(0, 0, w, bandH);
    drawCaptionBlock(ctx, state.caption, { x: 24, y: 0, w: w - 48, h: bandH }, scale, grade.accent);
  } else {
    drawCaptionBlock(ctx, state.caption, zone, scale, grade.accent);
  }
}

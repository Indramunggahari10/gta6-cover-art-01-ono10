// cover.js — draws GTA-poster-style covers on a canvas.
// Four multi-panel layouts, three colour grades, three export sizes.
// All art drawn in code: no Rockstar logo, artwork or font anywhere.
// Lettering uses system fonts only ("Arial Black" stack and friends).
//
// Composition (baoyu-cover-image: type scene + typography, palettes warm /
// vivid / cool, mood bold): a single visual anchor per layout (hero panel
// offset left, full-bleed billboard, or a strict triptych/grid), 40-60%
// breathing room around the title band, one bold display title plus one
// subline, and a warm sunset / neon / dusk grade over every photo.

export const COVER_SIZES = {
  square: { w: 1080, h: 1080, label: '1080 × 1080' },
  portrait: { w: 1080, h: 1350, label: '1080 × 1350' },
  wide: { w: 1920, h: 1080, label: '1920 × 1080' },
};

export const GRADES = {
  sunset: {
    label: 'Sunset',
    titleTop: '#ffd94a', titleMid: '#ff7a18', titleBottom: '#ff2e88',
    overlayTop: 'rgba(255,46,136,0.34)', overlayBottom: 'rgba(255,122,24,0.30)',
    frame: '#ffffff', accent: '#ffc93c', strip: '#ff2e88',
  },
  neon: {
    label: 'Neon',
    titleTop: '#7df9ff', titleMid: '#00e5c7', titleBottom: '#ff2e88',
    overlayTop: 'rgba(0,229,199,0.30)', overlayBottom: 'rgba(255,46,136,0.32)',
    frame: '#00e5c7', accent: '#ff2e88', strip: '#00e5c7',
  },
  dusk: {
    label: 'Dusk',
    titleTop: '#e9d5ff', titleMid: '#a78bfa', titleBottom: '#ff7a18',
    overlayTop: 'rgba(124,58,237,0.34)', overlayBottom: 'rgba(255,122,24,0.28)',
    frame: '#e9d5ff', accent: '#a78bfa', strip: '#a78bfa',
  },
};

// Caption fonts — system stacks only, nothing vendored, nothing Rockstar.
export const CAPTION_FONTS = {
  display: { label: 'Display', stack: '"Arial Black", "Segoe UI", Arial, sans-serif', italic: true, weight: 900 },
  impact: { label: 'Impact', stack: 'Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif', italic: false, weight: 900 },
  serif: { label: 'Serif', stack: 'Georgia, "Times New Roman", serif', italic: true, weight: 700 },
  mono: { label: 'Mono', stack: '"Courier New", Courier, monospace', italic: false, weight: 700 },
};

export const CAPTION_COLORS = {
  gradient: { label: 'Sunset gradient' },
  '#ffffff': { label: 'White' },
  '#ffc93c': { label: 'Gold' },
  '#7df9ff': { label: 'Cyan' },
  '#ff2e88': { label: 'Magenta' },
};

// Layouts are data: panel rects as fractions of W/H, a title anchor and a
// subline anchor. One renderer draws them all, so the layout picker just
// swaps the spec. `zoom`/`fx`/`fy` give each panel its own crop flavour.
export const LAYOUTS = {
  classic: {
    label: 'Classic',
    blurb: 'Tall hero left, two stacked panels right — the Session A poster.',
    panels: [
      { x: 0.033, y: 0.169, w: 0.572, h: 0.648, zoom: 1.0, fx: 0, fy: 0, hero: true },
      { x: 0.628, y: 0.169, w: 0.339, h: 0.315, zoom: 1.45, fx: 0, fy: -60 },
      { x: 0.628, y: 0.502, w: 0.339, h: 0.315, zoom: 1.2, fx: 0, fy: 55 },
    ],
    titleY: 0.109, stripY: 0.844, sublineY: 0.891, footerY: 0.946,
  },
  triptych: {
    label: 'Triptych',
    blurb: 'Three equal vertical panels — one story in three beats.',
    panels: [
      { x: 0.033, y: 0.170, w: 0.300, h: 0.630, zoom: 1.05, fx: -30, fy: 0 },
      { x: 0.350, y: 0.170, w: 0.300, h: 0.630, zoom: 1.25, fx: 0, fy: -20 },
      { x: 0.667, y: 0.170, w: 0.300, h: 0.630, zoom: 1.05, fx: 30, fy: 0 },
    ],
    titleY: 0.105, stripY: 0.835, sublineY: 0.885, footerY: 0.945,
  },
  billboard: {
    label: 'Billboard',
    blurb: 'One full-bleed photo, title overlaid at the bottom, inset panel.',
    panels: [
      { x: 0, y: 0, w: 1, h: 1, zoom: 1.0, fx: 0, fy: 0, fullBleed: true },
      { x: 0.700, y: 0.045, w: 0.265, h: 0.290, zoom: 1.3, fx: 0, fy: 0, inset: true },
    ],
    titleY: 0.815, stripY: 0.760, sublineY: 0.905, footerY: 0.955,
    scrim: true,
  },
  grid: {
    label: 'Grid',
    blurb: 'Four equal panels — a contact sheet of the same day.',
    panels: [
      { x: 0.033, y: 0.170, w: 0.462, h: 0.315, zoom: 1.1, fx: -25, fy: -15 },
      { x: 0.505, y: 0.170, w: 0.462, h: 0.315, zoom: 1.1, fx: 25, fy: -15 },
      { x: 0.033, y: 0.500, w: 0.462, h: 0.315, zoom: 1.35, fx: 0, fy: 30 },
      { x: 0.505, y: 0.500, w: 0.462, h: 0.315, zoom: 1.15, fx: 0, fy: 45 },
    ],
    titleY: 0.105, stripY: 0.840, sublineY: 0.890, footerY: 0.945,
  },
};

export const DEFAULT_OPTIONS = {
  layout: 'classic',
  caption: 'VICE CITY NIGHTS',
  subline: 'SUNSET BOULEVARD',
  tagline: '',
  captionFont: 'display',
  captionColor: 'gradient',
  captionOutline: true,
  captionShadow: true,
  grade: 'sunset',
  captionSize: 96, // in 1080-square px; scaled by export width
  captionY: 118,   // in 1080-square px; scaled by export height
  // panelPhotos[i] = index into the photos array for layout panel i.
  panelPhotos: [0, 0, 0, 0],
};

// One photo slot: the image plus its own crop + grade. A photo keeps its
// settings wherever it is placed, in any layout.
export function blankPhoto(img, name) {
  return {
    img, name,
    zoom: 1.15, panX: 0, panY: 0,
    brightness: 1, contrast: 1, saturation: 1,
  };
}

// Draw the photo into rect with cover-fit, zoomed around a focus point,
// then the per-photo grade (brightness / contrast / saturation) via
// ctx.filter. `photo` is a blankPhoto() slot; null draws nothing.
export function drawPhotoCover(ctx, photo, rect, zoom, focusX, focusY) {
  if (!photo || !photo.img) return false;
  const img = photo.img;
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return false;
  const scale = Math.max(rect.w / iw, rect.h / ih) * zoom;
  const dw = iw * scale;
  const dh = ih * scale;
  // focus -100..100 maps the spare room left/right, top/bottom.
  const spareX = Math.max(0, (dw - rect.w) / 2);
  const spareY = Math.max(0, (dh - rect.h) / 2);
  const dx = rect.x + (rect.w - dw) / 2 - (focusX / 100) * spareX;
  const dy = rect.y + (rect.h - dh) / 2 - (focusY / 100) * spareY;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.filter = `brightness(${photo.brightness}) contrast(${photo.contrast}) saturate(${photo.saturation})`;
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
  return true;
}

// Warm sunset / neon wash over a photo, clipped to the same rect.
export function drawGradeOverlay(ctx, rect, grade) {
  const g = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
  g.addColorStop(0, grade.overlayTop);
  g.addColorStop(1, grade.overlayBottom);
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.fillStyle = g;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
}

// Halftone dot field in a corner of a panel — the poster-print texture.
export function drawHalftone(ctx, x, y, cols, rows, gap, color) {
  ctx.save();
  ctx.fillStyle = color;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const radius = 1 + ((r + c) % 3) * 0.9;
      ctx.beginPath();
      ctx.arc(x + c * gap, y + r * gap, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawPanelFrame(ctx, rect, color, width) {
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = 22;
  ctx.shadowOffsetY = 8;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
}

function drawEmptyPanel(ctx, rect, grade, label) {
  const g = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
  g.addColorStop(0, '#2b1055');
  g.addColorStop(0.55, '#7b1e6e');
  g.addColorStop(1, '#ff7a18');
  ctx.fillStyle = g;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  drawGradeOverlay(ctx, rect, grade);
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.font = '700 30px "Arial Black", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label || 'DROP A PHOTO', rect.x + rect.w / 2, rect.y + rect.h / 2 - 12);
  ctx.font = '600 19px Arial, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.fillText('or pick a sample below', rect.x + rect.w / 2, rect.y + rect.h / 2 + 24);
  ctx.restore();
}

// Big display title with a vertical sunset gradient (or a solid colour) and
// an optional dark outline and drop shadow. Long captions shrink to fit
// the cover instead of running off its edges.
export function drawDisplayTitle(ctx, text, cx, y, size, grade, opts = {}) {
  const fontDef = CAPTION_FONTS[opts.captionFont] || CAPTION_FONTS.display;
  const style = fontDef.italic ? 'italic' : 'normal';
  const family = fontDef.stack;
  const maxWidth = size * 11; // rough cap: ~11x the font size across
  let fitted = size;
  ctx.save();
  ctx.font = `${style} ${fontDef.weight} ${fitted}px ${family}`;
  const limit = opts.maxWidth || maxWidth;
  while (fitted > 28 && ctx.measureText(text).width > limit) {
    fitted -= 4;
    ctx.font = `${style} ${fontDef.weight} ${fitted}px ${family}`;
  }
  const font = `${style} ${fontDef.weight} ${fitted}px ${family}`;
  ctx.translate(cx, y);
  ctx.rotate(-0.028); // a slight poster tilt
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (opts.shadow !== false) {
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = Math.max(6, fitted * 0.12);
    ctx.shadowOffsetY = Math.max(3, fitted * 0.06);
  }
  if (opts.color && opts.color !== 'gradient') {
    ctx.fillStyle = opts.color;
  } else {
    const grad = ctx.createLinearGradient(0, -fitted * 0.55, 0, fitted * 0.55);
    grad.addColorStop(0, grade.titleTop);
    grad.addColorStop(0.5, grade.titleMid);
    grad.addColorStop(1, grade.titleBottom);
    ctx.fillStyle = grad;
  }
  if (opts.outline !== false) {
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(20,6,40,0.95)';
    ctx.lineWidth = Math.max(6, fitted * 0.11);
    ctx.strokeText(text, 0, 0);
  }
  ctx.fillText(text, 0, 0);
  ctx.restore();
  return fitted;
}

// Small letterspaced line under the title (the optional tagline).
function drawTagline(ctx, text, cx, y, size, color) {
  ctx.save();
  ctx.font = `600 ${size}px "Trebuchet MS", "Segoe UI", Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(text, cx, y);
  ctx.restore();
}

// The whole cover at any export size. `photos` is an array of blankPhoto()
// slots (may be empty); `opts` overrides DEFAULT_OPTIONS. panelPhotos maps
// each layout panel to a photo slot index.
export function drawCover(ctx, W, H, photos, opts = {}) {
  const o = { ...DEFAULT_OPTIONS, ...opts };
  const grade = GRADES[o.grade] || GRADES.sunset;
  const layout = LAYOUTS[o.layout] || LAYOUTS.classic;
  const sx = W / 1080; // title sizes are authored in 1080-square px
  const sy = H / 1080;

  // Backdrop: deep violet, vignetted.
  ctx.fillStyle = '#1b1035';
  ctx.fillRect(0, 0, W, H);
  const vig = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.28, W / 2, H / 2, Math.max(W, H) * 0.78);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(8,2,24,0.55)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);

  // Panels.
  layout.panels.forEach((p, i) => {
    const rect = { x: p.x * W, y: p.y * H, w: p.w * W, h: p.h * H };
    const slot = o.panelPhotos[i] ?? 0;
    const photo = photos[slot] || null;
    const zoom = (photo ? photo.zoom : 1.15) * p.zoom;
    const fx = p.fx + (photo ? photo.panX * 0.4 : 0);
    const fy = p.fy + (photo ? photo.panY * 0.4 : 0);
    const drawn = drawPhotoCover(ctx, photo, rect, zoom, fx, fy);
    if (drawn) {
      drawGradeOverlay(ctx, rect, grade);
    } else {
      drawEmptyPanel(ctx, rect, grade, slot > 0 ? 'ADD PHOTO ' + (slot + 1) : undefined);
    }
    if (!p.fullBleed) {
      drawPanelFrame(ctx, rect, p.hero ? grade.frame : grade.accent, p.hero ? 7 * sx : 5 * sx);
    }
  });
  // Poster-print halftone on the first panel's top corner.
  const first = layout.panels[0];
  if (first && !first.fullBleed) {
    drawHalftone(ctx, first.x * W + first.w * W - 96 * sx, first.y * H + 18 * sy, 5, 4, 20 * sx, 'rgba(255,255,255,0.75)');
  }

  // Billboard scrim, drawn AFTER the panels so it actually darkens the
  // full-bleed photo: a gradient up from the bottom so the overlaid title,
  // tagline and subline stay readable on any photo.
  if (layout.scrim) {
    const sc = ctx.createLinearGradient(0, H * 0.55, 0, H);
    sc.addColorStop(0, 'rgba(10,4,24,0)');
    sc.addColorStop(1, 'rgba(10,4,24,0.72)');
    ctx.fillStyle = sc;
    ctx.fillRect(0, H * 0.55, W, H * 0.45);
  }

  // Credit strip: colour rule, subline, studio mark.
  if (!layout.scrim) {
    ctx.save();
    ctx.fillStyle = grade.strip;
    ctx.fillRect(0.033 * W, layout.stripY * H, W * 0.934, 4 * sy);
    ctx.restore();
  }
  ctx.save();
  ctx.font = `700 ${Math.round(34 * sx)}px "Arial Black", Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(o.subline.toUpperCase(), W / 2, layout.sublineY * H);
  ctx.font = `600 ${Math.round(17 * sx)}px Arial, sans-serif`;
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fillText('SUNSET COVER STUDIO', W - 40 * sx, layout.footerY * H);
  ctx.textAlign = 'left';
  ctx.fillText(`${W} × ${H}`, 40 * sx, layout.footerY * H);
  ctx.restore();

  // Title band — drawn last so it sits above the panels. When a tagline
  // is set, the title lifts a little so the tagline fits in the band
  // instead of crowding the panels below it.
  const hasTag = Boolean(o.tagline && o.tagline.trim());
  const titleSize = o.captionSize * sx;
  const titleY = (o.captionY / 1080) * H + (layout.titleY - 0.109) * H - (hasTag ? titleSize * 0.32 : 0);
  const fitted = drawDisplayTitle(ctx, o.caption.toUpperCase(), W / 2, titleY, titleSize, grade, {
    captionFont: o.captionFont,
    color: o.captionColor,
    outline: o.captionOutline,
    shadow: o.captionShadow,
    maxWidth: W - 80 * sx,
  });
  if (hasTag) {
    drawTagline(ctx, o.tagline.toUpperCase(), W / 2, titleY + fitted * 0.72, Math.round(26 * sx), 'rgba(255,255,255,0.92)');
  }
}

// Render a PNG blob of the current cover at the requested export size.
export function exportCoverPNG(photos, opts = {}, sizeKey = 'square') {
  const size = COVER_SIZES[sizeKey] || COVER_SIZES.square;
  const canvas = document.createElement('canvas');
  canvas.width = size.w;
  canvas.height = size.h;
  drawCover(canvas.getContext('2d'), size.w, size.h, photos, opts);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('PNG encode failed'))), 'image/png');
  });
}

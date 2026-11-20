// cover.js — the cover renderer for Sunset Cover Studio (Session B).
// Draws GTA-style multi-panel poster covers onto any 2D canvas context, in
// three selectable layouts ("Vice City Nights", "Neon Strip", "Sunset
// Boulevard"), at any of the three post sizes (1080x1080, 1080x1350,
// 1920x1080). Every layout is its own composition: different panel counts,
// arrangements and lettering treatments, all under a warm sunset / vivid
// neon grade (Baoyu: scene type, warm+vivid palette, digital rendering,
// title-only bold text, bold mood).
//
// Pure functions of (slots, panels, caption, layout, size); no network, no
// DOM at import time, so the layout math can be tested outside a browser.
// Photos are per-slot objects { img, bright, contrast, sat }; panels pick a
// slot and carry their own crop (zoom, offsets). Nothing here is Rockstar
// artwork: all lettering uses system fonts, all art is the photo + grade.

export const EXPORT_SIZES = [
  { id: 'square', label: '1080 × 1080', w: 1080, h: 1080 },
  { id: 'portrait', label: '1080 × 1350', w: 1080, h: 1350 },
  { id: 'wide', label: '1920 × 1080', w: 1920, h: 1080 },
];
export function sizeById(id) {
  return EXPORT_SIZES.find((s) => s.id === id) || EXPORT_SIZES[0];
}

export const LAYOUTS = [
  { id: 'nights', name: 'Vice City Nights', blurb: 'Title band, big main panel, detail crop, tagline block.' },
  { id: 'strip', name: 'Neon Strip', blurb: 'Left-aligned title, two stacked panels, tall right panel, tagline strip.' },
  { id: 'boulevard', name: 'Sunset Boulevard', blurb: 'Full-width hero photo, two small panels, tagline block.' },
];
export function layoutById(id) {
  return LAYOUTS.find((l) => l.id === id) || LAYOUTS[0];
}

// ---- layout geometry -----------------------------------------------------
// Each geometry is a function of (W, H) and returns panel rects, the title
// band, the tagline rect and the white keylines between panels. Proportions
// are fractions of W/H so every layout adapts to every export size.

function keyline(x, y, w, h) {
  return { x, y, w, h, color: 'rgba(255,255,255,0.92)' };
}

function geometryNights(W, H) {
  const K = Math.max(3, Math.round(Math.min(W, H) * 0.005));
  const titleH = Math.round(H * 0.155);
  const mainW = Math.round(W * 0.64);
  const detailH = Math.round((H - titleH) * 0.5);
  return {
    title: { x: 0, y: 0, w: W, h: titleH, align: 'center', rotate: -0.018, band: 'nights' },
    panels: [
      { id: 'main', name: 'Main panel', x: 0, y: titleH, w: mainW, h: H - titleH },
      { id: 'detail', name: 'Detail panel', x: mainW + K, y: titleH, w: W - mainW - K, h: detailH },
    ],
    tagline: { x: mainW + K, y: titleH + detailH + K, w: W - mainW - K, h: H - titleH - detailH - K, style: 'block' },
    lines: [
      keyline(mainW, titleH, K, H - titleH),
      keyline(mainW, titleH + detailH, W - mainW, K),
    ],
    accent: { x: mainW + K, y: titleH + detailH - 3, w: W - mainW - K, h: 3, color: '#22d3ee' },
  };
}

function geometryStrip(W, H) {
  const K = Math.max(3, Math.round(Math.min(W, H) * 0.005));
  const titleH = Math.round(H * 0.15);
  const leftW = Math.round(W * 0.46);
  const midY = titleH + Math.round((H - titleH) * 0.52);
  const stripH = Math.round(H * 0.14);
  return {
    title: { x: 0, y: 0, w: W, h: titleH, align: 'left', rotate: 0, band: 'strip' },
    panels: [
      { id: 'top', name: 'Top panel', x: 0, y: titleH, w: leftW, h: midY - titleH },
      { id: 'bottom', name: 'Bottom panel', x: 0, y: midY, w: leftW, h: H - stripH - midY },
      { id: 'right', name: 'Tall panel', x: leftW + K, y: titleH, w: W - leftW - K, h: H - stripH - titleH },
    ],
    tagline: { x: 0, y: H - stripH, w: W, h: stripH, style: 'strip' },
    lines: [
      keyline(leftW, titleH, K, H - stripH - titleH),
      keyline(0, midY, leftW, K),
      keyline(0, H - stripH, W, K),
    ],
    accent: { x: 0, y: H - stripH, w: W, h: 3, color: '#ff3c8c' },
  };
}

function geometryBoulevard(W, H) {
  const K = Math.max(3, Math.round(Math.min(W, H) * 0.005));
  const titleH = Math.round(H * 0.12);
  const heroH = Math.round((H - titleH) * 0.58);
  const bottomY = titleH + heroH;
  const smallW1 = Math.round(W * 0.36);
  const smallW2 = Math.round(W * 0.32);
  return {
    title: { x: 0, y: 0, w: W, h: titleH, align: 'center', rotate: 0, band: 'boulevard' },
    panels: [
      { id: 'hero', name: 'Hero panel', x: 0, y: titleH, w: W, h: heroH },
      { id: 'left', name: 'Left panel', x: 0, y: bottomY + K, w: smallW1, h: H - bottomY - K },
      { id: 'right', name: 'Right panel', x: smallW1 + K, y: bottomY + K, w: smallW2, h: H - bottomY - K },
    ],
    tagline: { x: smallW1 + smallW2 + 2 * K, y: bottomY + K, w: W - smallW1 - smallW2 - 2 * K, h: H - bottomY - K, style: 'block' },
    lines: [
      keyline(0, bottomY, W, K),
      keyline(smallW1, bottomY, K, H - bottomY),
      keyline(smallW1 + smallW2 + K, bottomY, K, H - bottomY),
    ],
    accent: { x: 0, y: bottomY, w: W, h: 3, color: '#ff7a1a' },
  };
}

export function geometryFor(layoutId, W, H) {
  if (layoutId === 'strip') return geometryStrip(W, H);
  if (layoutId === 'boulevard') return geometryBoulevard(W, H);
  return geometryNights(W, H);
}

// ---- defaults ------------------------------------------------------------

export function defaultPanels(layoutId) {
  if (layoutId === 'strip') {
    return {
      top: { slot: 0, zoom: 1, offsetX: 0, offsetY: 0 },
      bottom: { slot: 1, zoom: 1.1, offsetX: 0, offsetY: 0 },
      right: { slot: 0, zoom: 1.35, offsetX: 10, offsetY: -6 },
    };
  }
  if (layoutId === 'boulevard') {
    return {
      hero: { slot: 0, zoom: 1, offsetX: 0, offsetY: 0 },
      left: { slot: 1, zoom: 1.2, offsetX: 0, offsetY: 0 },
      right: { slot: 0, zoom: 1.5, offsetX: -8, offsetY: 8 },
    };
  }
  return {
    main: { slot: 0, zoom: 1, offsetX: 0, offsetY: 0 },
    detail: { slot: 0, zoom: 1.6, offsetX: 12, offsetY: -8 },
  };
}

export function defaultCaption() {
  return {
    caption: 'SUNSET HEIST',
    font: 'display',
    size: 92, // px at 1080 wide; scaled by canvas width
    y: 118, // px inside a 168px title band; scaled by band height
    color: '#ffffff',
    outline: true,
    shadow: true,
    tagline: 'VICE CITY • 2026',
    taglineOn: true,
  };
}

export function defaultSlot() {
  return { img: null, name: '', bright: 1, contrast: 1, sat: 1 };
}

export const CAPTION_FONTS = {
  display: { label: 'Poster Black', css: `'Arial Black', Impact, sans-serif`, weight: 900 },
  impact: { label: 'Impact', css: `Impact, 'Arial Black', sans-serif`, weight: 900 },
  serif: { label: 'Bold Serif', css: `Georgia, 'Times New Roman', serif`, weight: 700 },
  mono: { label: 'Typewriter', css: `'Courier New', monospace`, weight: 700 },
  rounded: { label: 'Rounded Bold', css: `'Trebuchet MS', 'Helvetica Neue', sans-serif`, weight: 900 },
};

export const CAPTION_COLORS = {
  '#ffffff': 'White',
  '#ffd166': 'Gold',
  '#22d3ee': 'Neon cyan',
  '#ff8ac2': 'Hot pink',
  '#ffe9a8': 'Sunset cream',
};

// Cover-fit: scale the image to fill (w,h), then shift by offset percent of
// the overflow. Returns [sx, sy, sw, sh] source rect for drawImage.
export function coverFit(imgW, imgH, w, h, zoom, offsetX, offsetY) {
  const scale = Math.max(w / imgW, h / imgH) * zoom;
  const sw = w / scale;
  const sh = h / scale;
  const maxOx = Math.max(0, (imgW - sw) / 2);
  const maxOy = Math.max(0, (imgH - sh) / 2);
  const sx = (imgW - sw) / 2 + (offsetX / 100) * maxOx;
  const sy = (imgH - sh) / 2 + (offsetY / 100) * maxOy;
  return [sx, sy, sw, sh];
}

function gradeFilter(slot) {
  const b = slot.bright ?? 1, c = slot.contrast ?? 1, s = slot.sat ?? 1;
  if (b === 1 && c === 1 && s === 1) return 'none';
  return `brightness(${b}) contrast(${c}) saturate(${s})`;
}

function drawPhotoPanel(ctx, slot, x, y, w, h, panel) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  if (!slot || !slot.img) {
    // No photo in this slot: dark panel with a dashed frame, never a hole.
    ctx.fillStyle = '#1c0b3d';
    ctx.fillRect(x, y, w, h);
    ctx.setLineDash([10, 8]);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 8, y + 8, w - 16, h - 16);
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = `700 ${Math.max(14, Math.round(w * 0.03))}px 'Helvetica Neue', Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('NO PHOTO', x + w / 2, y + h / 2);
    ctx.restore();
    return;
  }
  ctx.filter = gradeFilter(slot);
  const [sx, sy, sw, sh] = coverFit(
    slot.img.naturalWidth, slot.img.naturalHeight, w, h,
    panel.zoom, panel.offsetX, panel.offsetY,
  );
  ctx.drawImage(slot.img, sx, sy, sw, sh, x, y, w, h);
  ctx.filter = 'none';
  ctx.restore();
}

function sunsetGrade(ctx, x, y, w, h) {
  // Warm wash: orange from the top, magenta from the bottom, low alpha so
  // the photo stays readable; then a soft vignette for poster depth.
  ctx.save();
  const wash = ctx.createLinearGradient(x, y, x, y + h);
  wash.addColorStop(0, 'rgba(255, 122, 26, 0.16)');
  wash.addColorStop(0.55, 'rgba(255, 80, 140, 0.07)');
  wash.addColorStop(1, 'rgba(64, 16, 92, 0.20)');
  ctx.fillStyle = wash;
  ctx.fillRect(x, y, w, h);
  const vg = ctx.createRadialGradient(
    x + w / 2, y + h / 2, Math.min(w, h) * 0.32,
    x + w / 2, y + h / 2, Math.max(w, h) * 0.72,
  );
  vg.addColorStop(0, 'rgba(10, 6, 28, 0)');
  vg.addColorStop(1, 'rgba(10, 6, 28, 0.42)');
  ctx.fillStyle = vg;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

function drawCaption(ctx, text, band, opts, W) {
  const font = CAPTION_FONTS[opts.font] || CAPTION_FONTS.display;
  const clean = (text || 'SUNSET HEIST').toUpperCase().slice(0, 28);
  // Size scales with canvas width; shrink until it fits the band. It must
  // also fit the band HEIGHT: a wide canvas has a short band (e.g. the
  // boulevard band is 130px tall on a 1920-wide cover), so cap by height too.
  let size = Math.max(36, Math.min(220, opts.size * (W / 1080)));
  const setFont = (s) => { ctx.font = `${font.weight} ${Math.round(s)}px ${font.css}`; };
  setFont(size);
  const maxW = band.w * (band.align === 'left' ? 0.92 : 0.94);
  while (ctx.measureText(clean).width > maxW && size > 30) {
    size *= 0.92;
    setFont(size);
  }
  size = Math.min(size, band.h * 0.78);
  setFont(size);
  const cx = band.align === 'left' ? band.x + band.w * 0.05 : band.x + band.w / 2;
  // Keep the whole glyph box inside the band: clamp the centre so neither
  // the caps nor the neon underline echo can spill over the band edges.
  const cy = Math.min(
    Math.max(band.y + band.h * (opts.y / 168), band.y + size * 0.5),
    band.y + band.h - size * 0.55,
  );
  ctx.save();
  ctx.translate(cx, cy);
  if (band.rotate) ctx.rotate(band.rotate);
  ctx.textAlign = band.align === 'left' ? 'left' : 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  if (opts.shadow) {
    ctx.shadowColor = 'rgba(255, 60, 140, 0.85)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 5;
  }
  if (opts.outline) {
    ctx.lineWidth = Math.max(4, size * 0.09);
    ctx.strokeStyle = '#14082b';
    ctx.strokeText(clean, 0, 0);
  }
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = opts.color || '#ffffff';
  ctx.fillText(clean, 0, 0);
  // thin neon underline echo of the caption
  const tw = ctx.measureText(clean).width;
  const ux = band.align === 'left' ? 0 : -tw / 2;
  ctx.fillStyle = '#ff3c8c';
  ctx.fillRect(ux, size * 0.45, tw, 4);
  ctx.restore();
}

function drawTitleBand(ctx, band, opts, W) {
  if (band.band === 'strip') {
    const g = ctx.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, '#160a2e');
    g.addColorStop(0.6, '#3d0f4d');
    g.addColorStop(1, '#12082b');
    ctx.fillStyle = g;
    ctx.fillRect(band.x, band.y, band.w, band.h);
    // hot-pink underline bar + thin cyan rule at the band bottom
    ctx.fillStyle = '#ff3c8c';
    ctx.fillRect(band.x, band.y + band.h - 10, band.w, 6);
    ctx.fillStyle = '#22d3ee';
    ctx.fillRect(band.x, band.y + band.h - 3, band.w, 3);
  } else if (band.band === 'boulevard') {
    const g = ctx.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, '#1c0b3d');
    g.addColorStop(0.5, '#571a4e');
    g.addColorStop(1, '#12082b');
    ctx.fillStyle = g;
    ctx.fillRect(band.x, band.y, band.w, band.h);
    // gold rule under the title
    ctx.fillStyle = '#ffd166';
    ctx.fillRect(band.x, band.y + band.h - 6, band.w, 4);
    ctx.fillStyle = '#ff3c8c';
    ctx.fillRect(band.x, band.y + band.h - 2, band.w, 2);
  } else {
    const g = ctx.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, '#1c0b3d');
    g.addColorStop(0.5, '#4b1158');
    g.addColorStop(1, '#12082b');
    ctx.fillStyle = g;
    ctx.fillRect(band.x, band.y, band.w, band.h);
    // sunset stripe under the title
    const stripe = ctx.createLinearGradient(0, 0, W, 0);
    stripe.addColorStop(0, '#ff7a1a');
    stripe.addColorStop(0.5, '#ff3c8c');
    stripe.addColorStop(1, '#22d3ee');
    ctx.fillStyle = stripe;
    ctx.fillRect(band.x, band.y + band.h - 8, band.w, 8);
  }
  drawCaption(ctx, opts.caption, band, opts, W);
}

function drawTaglineBlock(ctx, rect, tagline, style) {
  const { x, y, w, h } = rect;
  if (style === 'strip') {
    ctx.fillStyle = '#160a2e';
    ctx.fillRect(x, y, w, h);
    const tag = (tagline || 'VICE CITY • 2026').toUpperCase().slice(0, 40);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#22d3ee';
    ctx.font = `800 ${Math.max(24, Math.round(h * 0.42))}px 'Arial Black', Impact, sans-serif`;
    ctx.fillText(tag, x + w / 2, y + h / 2);
    // pink diamonds flanking the strip text
    ctx.fillStyle = '#ff3c8c';
    const d = Math.max(8, Math.round(h * 0.14));
    for (const dx of [x + w * 0.06, x + w * 0.94]) {
      ctx.beginPath();
      ctx.moveTo(dx, y + h / 2 - d);
      ctx.lineTo(dx + d, y + h / 2);
      ctx.lineTo(dx, y + h / 2 + d);
      ctx.lineTo(dx - d, y + h / 2);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    return;
  }
  // 'block' style: gradient, double neon frame, wrapped tagline, footer.
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, '#241040');
  g.addColorStop(1, '#0e0722');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#ff3c8c';
  ctx.lineWidth = 3;
  ctx.strokeRect(x + 10, y + 10, w - 20, h - 20);
  ctx.strokeStyle = 'rgba(34, 211, 238, 0.8)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x + 16, y + 16, w - 32, h - 32);

  const tag = (tagline || 'VICE CITY • 2026').toUpperCase().slice(0, 40);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffe9f4';
  ctx.font = `800 34px 'Arial Black', Impact, sans-serif`;
  const words = tag.split(' ');
  const lines = [''];
  for (const word of words) {
    const trial = lines[lines.length - 1] ? `${lines[lines.length - 1]} ${word}` : word;
    if (ctx.measureText(trial).width > w - 56 && lines[lines.length - 1]) lines.push(word);
    else lines[lines.length - 1] = trial;
  }
  const shown = lines.slice(0, 2);
  const lh = 44;
  const startY = y + h / 2 - ((shown.length - 1) * lh) / 2 - 18;
  shown.forEach((lineText, i) => ctx.fillText(lineText, x + w / 2, startY + i * lh));
  ctx.font = `700 19px 'Helvetica Neue', Arial, sans-serif`;
  ctx.fillStyle = '#22d3ee';
  ctx.fillText('SUNSET COVER STUDIO', x + w / 2, y + h - 42);
  ctx.restore();
}

// Draw the full cover. model = { layout, slots, panels, caption }.
// panels maps panel id -> { slot, zoom, offsetX, offsetY }.
export function drawCover(ctx, W, H, model) {
  const geo = geometryFor(model.layout, W, H);
  const caption = { ...defaultCaption(), ...(model.caption || {}) };
  const panels = model.panels || {};
  // deep violet base so no pixel is ever transparent
  ctx.fillStyle = '#160a2e';
  ctx.fillRect(0, 0, W, H);

  drawTitleBand(ctx, geo.title, caption, W);

  for (const panel of geo.panels) {
    const p = panels[panel.id] || { slot: 0, zoom: 1, offsetX: 0, offsetY: 0 };
    const slot = model.slots[p.slot] || model.slots[0];
    drawPhotoPanel(ctx, slot, panel.x, panel.y, panel.w, panel.h, p);
    if (slot && slot.img) sunsetGrade(ctx, panel.x, panel.y, panel.w, panel.h);
  }

  // keylines between panels, then the layout's neon accent line
  for (const line of geo.lines) {
    ctx.fillStyle = line.color;
    ctx.fillRect(line.x, line.y, line.w, line.h);
  }
  ctx.fillStyle = geo.accent.color;
  ctx.fillRect(geo.accent.x, geo.accent.y, geo.accent.w, geo.accent.h);

  if (caption.taglineOn) {
    drawTaglineBlock(ctx, geo.tagline, caption.tagline, geo.tagline.style);
  }
}

// Render the cover to a fresh offscreen canvas and return it.
export function renderCoverCanvas(model, size) {
  const canvas = document.createElement('canvas');
  canvas.width = size.w;
  canvas.height = size.h;
  drawCover(canvas.getContext('2d'), size.w, size.h, model);
  return canvas;
}

// Empty state for the preview when no photo is loaded yet.
export function drawEmpty(ctx, W, H) {
  ctx.fillStyle = '#160a2e';
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.setLineDash([14, 10]);
  ctx.strokeStyle = 'rgba(255, 60, 140, 0.7)';
  ctx.lineWidth = 3;
  ctx.strokeRect(W * 0.08, H * 0.2, W * 0.84, H * 0.6);
  ctx.setLineDash([]);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffe9f4';
  ctx.font = `900 ${Math.round(W * 0.045)}px 'Arial Black', Impact, sans-serif`;
  ctx.fillText('LOAD A PHOTO TO BEGIN', W / 2, H * 0.44);
  ctx.fillStyle = '#b9a8d9';
  ctx.font = `${Math.round(W * 0.022)}px 'Helvetica Neue', Arial, sans-serif`;
  ctx.fillText('Pick a sample photo, or drop your own — it never leaves this machine.', W / 2, H * 0.54);
  ctx.restore();
}

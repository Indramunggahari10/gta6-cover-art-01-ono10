// cover.js — the cover renderer for Sunset Cover Studio.
// Draws the "Vice City Nights" multi-panel poster onto any 2D canvas context:
// a bold title band, one large photo panel, one detail panel and a tagline
// block, all under a warm sunset grade with neon keylines. Pure functions of
// (photo, options); no network, no DOM at import time, so the layout math can
// be tested outside a browser too.
//
// Layout (export canvas is always square, SIZE x SIZE):
//   title band    y 0 .. TITLE_H
//   main panel    x 0 .. MAIN_W, y TITLE_H .. SIZE
//   detail panel  x MAIN_W .. SIZE, y TITLE_H .. TITLE_H + DETAIL_H
//   tagline block x MAIN_W .. SIZE, y TITLE_H + DETAIL_H .. SIZE
// Panels are separated by white keylines; the whole cover gets a sunset wash
// and a vignette so the panels read as one poster, not three photos.

export const SIZE = 1080;
export const TITLE_H = 168;
export const MAIN_W = 692;
export const DETAIL_H = 452;
export const KEYLINE = 5;

export function defaultOptions() {
  return {
    caption: 'SUNSET HEIST',
    captionSize: 92,
    captionY: 118,
    tagline: 'VICE CITY • 2026',
    zoom: 1.0,
    offsetX: 0, // -100..100, percent of panel overflow
    offsetY: 0,
    detailZoom: 1.6,
    detailOffsetX: 12,
    detailOffsetY: -8,
  };
}

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

function drawPhotoPanel(ctx, photo, x, y, w, h, zoom, offsetX, offsetY) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  const [sx, sy, sw, sh] = coverFit(photo.naturalWidth, photo.naturalHeight, w, h, zoom, offsetX, offsetY);
  ctx.drawImage(photo, sx, sy, sw, sh, x, y, w, h);
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

function drawTitleBand(ctx, opts) {
  const g = ctx.createLinearGradient(0, 0, SIZE, 0);
  g.addColorStop(0, '#1c0b3d');
  g.addColorStop(0.5, '#4b1158');
  g.addColorStop(1, '#12082b');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, SIZE, TITLE_H);
  // sunset stripe under the title
  const stripe = ctx.createLinearGradient(0, 0, SIZE, 0);
  stripe.addColorStop(0, '#ff7a1a');
  stripe.addColorStop(0.5, '#ff3c8c');
  stripe.addColorStop(1, '#22d3ee');
  ctx.fillStyle = stripe;
  ctx.fillRect(0, TITLE_H - 8, SIZE, 8);

  const text = (opts.caption || 'SUNSET HEIST').toUpperCase().slice(0, 28);
  const size = Math.max(40, Math.min(140, opts.captionSize));
  ctx.save();
  ctx.translate(SIZE / 2, opts.captionY);
  ctx.rotate(-0.018);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 ${size}px 'Arial Black', Impact, 'Helvetica Neue', sans-serif`;
  ctx.shadowColor = 'rgba(255, 60, 140, 0.85)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 5;
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(4, size * 0.09);
  ctx.strokeStyle = '#14082b';
  ctx.strokeText(text, 0, 0);
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, 0, 0);
  // thin neon underline echo of the caption
  const tw = ctx.measureText(text).width;
  ctx.fillStyle = '#ff3c8c';
  ctx.fillRect(-tw / 2, size * 0.52, tw, 4);
  ctx.restore();
}

function drawTaglineBlock(ctx, opts) {
  const x = MAIN_W + KEYLINE;
  const y = TITLE_H + DETAIL_H + KEYLINE;
  const w = SIZE - x;
  const h = SIZE - y;
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, '#241040');
  g.addColorStop(1, '#0e0722');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  // neon frame
  ctx.strokeStyle = '#ff3c8c';
  ctx.lineWidth = 3;
  ctx.strokeRect(x + 10, y + 10, w - 20, h - 20);
  ctx.strokeStyle = 'rgba(34, 211, 238, 0.8)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x + 16, y + 16, w - 32, h - 32);

  const tag = (opts.tagline || 'VICE CITY • 2026').toUpperCase().slice(0, 40);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffe9f4';
  ctx.font = `800 34px 'Arial Black', Impact, sans-serif`;
  // wrap the tagline onto at most two lines
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

// Draw the full cover. photo is an HTMLImageElement (or any drawImage source
// with naturalWidth/naturalHeight). ctx must belong to a SIZE x SIZE canvas.
export function drawCover(ctx, photo, opts) {
  const o = { ...defaultOptions(), ...opts };
  // deep violet base so no pixel is ever transparent
  ctx.fillStyle = '#160a2e';
  ctx.fillRect(0, 0, SIZE, SIZE);

  drawTitleBand(ctx, o);

  // main panel: the photo, full-bleed with the user's crop
  drawPhotoPanel(ctx, photo, 0, TITLE_H, MAIN_W, SIZE - TITLE_H, o.zoom, o.offsetX, o.offsetY);
  sunsetGrade(ctx, 0, TITLE_H, MAIN_W, SIZE - TITLE_H);

  // detail panel: same photo, tighter crop — the poster's second angle
  const dx = MAIN_W + KEYLINE;
  drawPhotoPanel(ctx, photo, dx, TITLE_H, SIZE - dx, DETAIL_H, o.detailZoom, o.detailOffsetX, o.detailOffsetY);
  sunsetGrade(ctx, dx, TITLE_H, SIZE - dx, DETAIL_H);

  // keylines between panels
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.fillRect(MAIN_W, TITLE_H, KEYLINE, SIZE - TITLE_H);
  ctx.fillRect(MAIN_W, TITLE_H + DETAIL_H, SIZE - MAIN_W, KEYLINE);
  // neon edge on the detail panel
  ctx.fillStyle = '#22d3ee';
  ctx.fillRect(dx, TITLE_H + DETAIL_H - 3, SIZE - dx, 3);

  drawTaglineBlock(ctx, o);
}

// Render the cover to a fresh offscreen canvas and return it.
export function renderCoverCanvas(photo, opts) {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  drawCover(canvas.getContext('2d'), photo, opts);
  return canvas;
}

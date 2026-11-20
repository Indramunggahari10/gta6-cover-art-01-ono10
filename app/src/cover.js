// cover.js — draws the GTA-poster-style cover on a canvas.
// One layout, three colour grades, all art drawn in code: no Rockstar logo,
// artwork or font anywhere. System display fonts only ("Arial Black" stack).
// The cover is a 1080 x 1080 square: a big display title, one hero panel plus
// two stacked side panels (same photo, different crops), and a credit strip.
export const COVER_SIZE = 1080;

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

export const DEFAULT_OPTIONS = {
  caption: 'VICE CITY NIGHTS',
  subline: 'SUNSET BOULEVARD',
  grade: 'sunset',
  zoom: 1.15,
  panX: 0,   // -100..100, percent of the photo's spare width
  panY: 0,   // -100..100, percent of the photo's spare height
  captionSize: 96,
  captionY: 118,
};

// Draw the photo into rect with cover-fit, zoomed around a focus point.
export function drawPhotoCover(ctx, photo, rect, zoom, focusX, focusY) {
  const iw = photo.naturalWidth || photo.width;
  const ih = photo.naturalHeight || photo.height;
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
  ctx.drawImage(photo, dx, dy, dw, dh);
  ctx.restore();
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

function drawEmptyPanel(ctx, rect, grade) {
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
  ctx.fillText('DROP A PHOTO', rect.x + rect.w / 2, rect.y + rect.h / 2 - 12);
  ctx.font = '600 19px Arial, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.fillText('or pick a sample below', rect.x + rect.w / 2, rect.y + rect.h / 2 + 24);
  ctx.restore();
}

// Big display title with a vertical sunset gradient and a dark outline.
// Long captions shrink to fit the cover instead of running off its edges.
export function drawDisplayTitle(ctx, text, cx, y, size, grade) {
  const family = '"Arial Black", "Segoe UI", Arial, sans-serif';
  let fitted = size;
  ctx.save();
  ctx.font = `italic 900 ${fitted}px ${family}`;
  const maxWidth = COVER_SIZE - 80;
  while (fitted > 40 && ctx.measureText(text).width > maxWidth) {
    fitted -= 4;
    ctx.font = `italic 900 ${fitted}px ${family}`;
  }
  const font = `italic 900 ${fitted}px ${family}`;
  ctx.translate(cx, y);
  ctx.rotate(-0.028); // a slight poster tilt
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const grad = ctx.createLinearGradient(0, -fitted * 0.55, 0, fitted * 0.55);
  grad.addColorStop(0, grade.titleTop);
  grad.addColorStop(0.5, grade.titleMid);
  grad.addColorStop(1, grade.titleBottom);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(20,6,40,0.95)';
  ctx.lineWidth = Math.max(6, fitted * 0.11);
  ctx.strokeText(text, 0, 0);
  ctx.fillStyle = grad;
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

// The whole cover. photo may be null (empty state). opts overrides defaults.
export function drawCover(ctx, photo, opts = {}) {
  const o = { ...DEFAULT_OPTIONS, ...opts };
  const grade = GRADES[o.grade] || GRADES.sunset;
  const S = COVER_SIZE;

  // Backdrop: deep violet, vignetted.
  ctx.fillStyle = '#1b1035';
  ctx.fillRect(0, 0, S, S);
  const vig = ctx.createRadialGradient(S / 2, S / 2, S * 0.28, S / 2, S / 2, S * 0.78);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(8,2,24,0.55)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, S, S);

  // Title band.
  drawDisplayTitle(ctx, o.caption.toUpperCase(), S / 2, o.captionY, o.captionSize, grade);

  // Hero panel (left, tall) + two stacked side panels (right).
  const hero = { x: 36, y: 182, w: 618, h: 700 };
  const sideTop = { x: 678, y: 182, w: 366, h: 340 };
  const sideBottom = { x: 678, y: 542, w: 366, h: 340 };
  if (photo) {
    drawPhotoCover(ctx, photo, hero, o.zoom, o.panX, o.panY);
    drawGradeOverlay(ctx, hero, grade);
    drawPhotoCover(ctx, photo, sideTop, o.zoom * 1.45, -o.panX * 0.5, -60);
    drawGradeOverlay(ctx, sideTop, grade);
    drawPhotoCover(ctx, photo, sideBottom, o.zoom * 1.2, o.panX * 0.6, 55);
    drawGradeOverlay(ctx, sideBottom, grade);
  } else {
    drawEmptyPanel(ctx, hero, grade);
    drawEmptyPanel(ctx, sideTop, grade);
    drawEmptyPanel(ctx, sideBottom, grade);
  }
  drawPanelFrame(ctx, hero, grade.frame, 7);
  drawPanelFrame(ctx, sideTop, grade.accent, 5);
  drawPanelFrame(ctx, sideBottom, grade.accent, 5);
  drawHalftone(ctx, hero.x + hero.w - 96, hero.y + 18, 5, 4, 20, 'rgba(255,255,255,0.75)');

  // Credit strip: gold rule, subline, studio mark.
  ctx.save();
  ctx.fillStyle = grade.strip;
  ctx.fillRect(36, 912, S - 72, 4);
  ctx.font = '700 34px "Arial Black", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(o.subline.toUpperCase(), S / 2, 962);
  ctx.font = '600 17px Arial, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fillText('SUNSET COVER STUDIO', S - 40, 1022);
  ctx.textAlign = 'left';
  ctx.fillText('1080 × 1080', 40, 1022);
  ctx.restore();
}

// Render a 1080 x 1080 PNG blob of the current cover.
export function exportCoverPNG(photo, opts = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = COVER_SIZE;
  canvas.height = COVER_SIZE;
  drawCover(canvas.getContext('2d'), photo, opts);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('PNG encode failed'))), 'image/png');
  });
}

// Wires the page: load a photo (file picker, drag-drop or paste), pick a
// panel and crop it (sliders or drag), write the caption, pick a grade, and
// export the cover as a 1080 x 1080 PNG. A `?shot=` query instead sets up a
// fixed scene for a screenshot (see shots.js).
import { drawCover, panelAt, PANELS } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const status = document.getElementById('status');
const captionInput = document.getElementById('captionText');
const sizeInput = document.getElementById('captionSize');
const posInput = document.getElementById('captionPos');
const gradeInput = document.getElementById('grade');
const zoomInput = document.getElementById('zoom');
const panXInput = document.getElementById('panX');
const panYInput = document.getElementById('panY');
const dropZone = document.getElementById('dropZone');
const panelButtons = [...document.querySelectorAll('.panel-btn')];

// One photo, three crops of it: the hero shows the whole scene, the two
// detail panels zoom into it (the right one flipped, for the poster look).
const state = {
  photo: null,
  panels: [
    { zoom: 1.0, x: 0.5, y: 0.5, flip: false },
    { zoom: 1.9, x: 0.5, y: 0.55, flip: false },
    { zoom: 1.6, x: 0.5, y: 0.68, flip: true },
  ],
  caption: captionInput.value,
  captionSize: Number(sizeInput.value),
  captionPos: posInput.value,
  grade: gradeInput.value,
};
let selected = 0;

function redraw() {
  drawCover(canvas, state);
}

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
  });
}

async function setPhotoFromFile(file) {
  if (!file || !file.type.startsWith('image/')) {
    status.textContent = 'That was not an image file.';
    return;
  }
  try {
    state.photo = await loadImage(URL.createObjectURL(file));
    status.textContent = `Photo loaded: ${file.name}`;
    redraw();
  } catch {
    status.textContent = 'That photo could not be read.';
  }
}

async function setPhotoFromSample(name) {
  try {
    state.photo = await loadImage(`samples/${name}.png`);
    status.textContent = `Sample loaded: ${name}`;
    redraw();
  } catch {
    status.textContent = `Sample ${name} could not be loaded.`;
  }
}

function selectPanel(i) {
  selected = i;
  panelButtons.forEach((b, j) => b.classList.toggle('active', j === i));
  const panel = state.panels[i];
  zoomInput.value = String(panel.zoom);
  panXInput.value = String(panel.x);
  panYInput.value = String(panel.y);
}

panelButtons.forEach((button) => {
  button.addEventListener('click', () => selectPanel(Number(button.dataset.panel)));
});

document.getElementById('photoFile').addEventListener('change', (event) => {
  setPhotoFromFile(event.target.files[0]);
});

document.querySelectorAll('[data-sample]').forEach((button) => {
  button.addEventListener('click', () => setPhotoFromSample(button.dataset.sample));
});

// Drag a photo file onto the cover, or paste one from the clipboard.
dropZone.addEventListener('dragover', (event) => event.preventDefault());
dropZone.addEventListener('drop', (event) => {
  event.preventDefault();
  setPhotoFromFile(event.dataTransfer.files[0]);
});
document.addEventListener('paste', (event) => {
  const file = [...(event.clipboardData?.files ?? [])].find((f) => f.type.startsWith('image/'));
  if (file) setPhotoFromFile(file);
});

// Click a panel to select it; drag inside it to reposition the photo.
let drag = null;
function coverPoint(event) {
  const rect = canvas.getBoundingClientRect();
  const scale = canvas.width / rect.width;
  return {
    x: (event.clientX - rect.left) * scale,
    y: (event.clientY - rect.top) * scale,
  };
}
canvas.addEventListener('pointerdown', (event) => {
  const point = coverPoint(event);
  const hit = panelAt(point.x, point.y);
  if (hit === -1) return;
  selectPanel(hit);
  if (!state.photo) return;
  const panel = state.panels[hit];
  const rect = PANELS[hit];
  const base = Math.max(rect.w / state.photo.naturalWidth, rect.h / state.photo.naturalHeight);
  drag = {
    startX: point.x,
    startY: point.y,
    focusX: panel.x,
    focusY: panel.y,
    drawW: state.photo.naturalWidth * base * panel.zoom,
    drawH: state.photo.naturalHeight * base * panel.zoom,
  };
  canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener('pointermove', (event) => {
  if (!drag) return;
  const point = coverPoint(event);
  const panel = state.panels[selected];
  panel.x = Math.min(1, Math.max(0, drag.focusX - (point.x - drag.startX) / drag.drawW));
  panel.y = Math.min(1, Math.max(0, drag.focusY - (point.y - drag.startY) / drag.drawH));
  panXInput.value = String(panel.x);
  panYInput.value = String(panel.y);
  redraw();
});
canvas.addEventListener('pointerup', () => { drag = null; });
canvas.addEventListener('pointercancel', () => { drag = null; });

// Crop sliders follow the selected panel.
zoomInput.addEventListener('input', () => {
  state.panels[selected].zoom = Number(zoomInput.value);
  redraw();
});
panXInput.addEventListener('input', () => {
  state.panels[selected].x = Number(panXInput.value);
  redraw();
});
panYInput.addEventListener('input', () => {
  state.panels[selected].y = Number(panYInput.value);
  redraw();
});

// Caption and grade.
captionInput.addEventListener('input', () => {
  state.caption = captionInput.value;
  redraw();
});
sizeInput.addEventListener('input', () => {
  state.captionSize = Number(sizeInput.value);
  redraw();
});
posInput.addEventListener('change', () => {
  state.captionPos = posInput.value;
  redraw();
});
gradeInput.addEventListener('change', () => {
  state.grade = gradeInput.value;
  redraw();
});

// Export: the canvas is already 1080 x 1080, so the PNG is the cover itself.
document.getElementById('exportBtn').addEventListener('click', () => {
  canvas.toBlob((blob) => {
    if (!blob) {
      status.textContent = 'Export failed — the canvas could not make a PNG.';
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'sunset-cover-1080x1080.png';
    a.click();
    URL.revokeObjectURL(a.href);
    status.textContent = 'Saved sunset-cover-1080x1080.png (1080 × 1080).';
  }, 'image/png');
});

// Screenshot mode: ?shot=editor (the app with a sample) or ?shot=cover (the
// cover alone). Otherwise draw the empty cover and wait for a photo.
const query = new URLSearchParams(location.search);
const shot = query.get('shot');
if (shot) {
  runShot(shot, query, async (sample, text) => {
    await setPhotoFromSample(sample);
    captionInput.value = text;
    state.caption = text;
    redraw();
  });
} else {
  selectPanel(0);
  redraw();
}

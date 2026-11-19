// Sunset Cover Studio — page wiring (Session B).
//
// Load photos into a small library (file picker, drag-drop, paste or the
// built-in samples), assign one to each panel of the chosen layout, crop and
// grade each panel, write the caption, pick a grade and an export size, and
// export the cover as a PNG. A `?shot=` query instead sets up a fixed scene
// for a screenshot (see shots.js).
import { drawCover, panelAt, layoutPanels, hasAnyPhoto, EXPORT_SIZES, LAYOUTS, LAYOUT_IDS, CAPTION_FONTS, CAPTION_COLORS } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const status = document.getElementById('status');
const captionInput = document.getElementById('captionText');
const taglineInput = document.getElementById('taglineText');
const fontInput = document.getElementById('captionFont');
const sizeInput = document.getElementById('captionSize');
const colorInput = document.getElementById('captionColor');
const posInput = document.getElementById('captionPos');
const outlineInput = document.getElementById('captionOutline');
const glowInput = document.getElementById('captionGlow');
const gradeInput = document.getElementById('grade');
const sizeSelect = document.getElementById('exportSize');
const layoutBlurb = document.getElementById('layoutBlurb');
const photoList = document.getElementById('photoList');
const panelBtns = document.getElementById('panelBtns');
const panelPhotoSelect = document.getElementById('panelPhoto');
const zoomInput = document.getElementById('zoom');
const panXInput = document.getElementById('panX');
const panYInput = document.getElementById('panY');
const flipInput = document.getElementById('flip');
const brightInput = document.getElementById('bright');
const contrastInput = document.getElementById('contrast');
const satInput = document.getElementById('sat');
const dropZone = document.getElementById('dropZone');
const exportBtn = document.getElementById('exportBtn');

function makePanel(zoom, x, y, flip) {
  return { photoId: null, zoom, x, y, flip, bright: 1, contrast: 1, sat: 1 };
}

// One panel setup per layout: the hero shows the whole scene, the detail
// panels zoom into it (some flipped, for the poster look).
const state = {
  layoutId: 'trio',
  sizeId: '1080x1080',
  photos: [],
  nextPhotoId: 1,
  panelsByLayout: {
    trio: [makePanel(1.0, 0.5, 0.5, false), makePanel(1.9, 0.5, 0.55, false), makePanel(1.6, 0.5, 0.68, true)],
    quad: [makePanel(1.0, 0.5, 0.5, false), makePanel(2.0, 0.42, 0.4, false), makePanel(1.8, 0.55, 0.6, true), makePanel(2.2, 0.5, 0.7, false)],
    strips: [makePanel(1.3, 0.5, 0.55, false), makePanel(1.1, 0.5, 0.45, false), makePanel(1.4, 0.5, 0.6, true)],
  },
  caption: {
    text: captionInput.value,
    tagline: '',
    font: 'black',
    size: Number(sizeInput.value),
    color: '#ffffff',
    pos: posInput.value,
    outline: true,
    glow: true,
  },
  grade: gradeInput.value,
};
let selected = 0;

function currentPanels() {
  return state.panelsByLayout[state.layoutId];
}

function currentSize() {
  return EXPORT_SIZES.find((s) => s.id === state.sizeId) ?? EXPORT_SIZES[0];
}

function applySizeToCanvas() {
  const size = currentSize();
  canvas.width = size.w;
  canvas.height = size.h;
  exportBtn.textContent = `Export PNG · ${size.w} × ${size.h}`;
}

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

function addPhoto(img, name) {
  const existing = state.photos.find((p) => p.name === name);
  if (existing) return existing;
  const photo = { id: state.nextPhotoId, name, img };
  state.nextPhotoId += 1;
  state.photos.push(photo);
  renderPhotoList();
  renderPanelPhotoOptions();
  return photo;
}

function removePhoto(id) {
  state.photos = state.photos.filter((p) => p.id !== id);
  currentPanels().forEach((panel) => {
    if (panel.photoId === id) panel.photoId = null;
  });
  Object.values(state.panelsByLayout).forEach((panels) => {
    panels.forEach((panel) => { if (panel.photoId === id) panel.photoId = null; });
  });
  renderPhotoList();
  renderPanelPhotoOptions();
  redraw();
}

function renderPhotoList() {
  photoList.innerHTML = '';
  if (state.photos.length === 0) {
    const li = document.createElement('li');
    li.className = 'empty-note';
    li.textContent = 'No photos yet — pick a file or try a sample below.';
    photoList.appendChild(li);
    return;
  }
  state.photos.forEach((photo) => {
    const li = document.createElement('li');
    const label = document.createElement('span');
    label.textContent = photo.name;
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = 'Remove';
    remove.addEventListener('click', () => removePhoto(photo.id));
    li.append(label, remove);
    photoList.appendChild(li);
  });
}

function renderPanelPhotoOptions() {
  const keep = currentPanels()[selected]?.photoId ?? null;
  panelPhotoSelect.innerHTML = '';
  const none = document.createElement('option');
  none.value = '';
  none.textContent = '— empty panel —';
  panelPhotoSelect.appendChild(none);
  state.photos.forEach((photo) => {
    const option = document.createElement('option');
    option.value = String(photo.id);
    option.textContent = photo.name;
    panelPhotoSelect.appendChild(option);
  });
  panelPhotoSelect.value = keep == null ? '' : String(keep);
}

function renderPanelButtons() {
  const labels = LAYOUTS[state.layoutId].labels;
  panelBtns.innerHTML = '';
  labels.forEach((label, i) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `panel-btn${i === selected ? ' active' : ''}`;
    button.textContent = label;
    button.addEventListener('click', () => selectPanel(i));
    panelBtns.appendChild(button);
  });
}

async function setPhotoFromFile(file) {
  if (!file || !file.type.startsWith('image/')) {
    status.textContent = 'That was not an image file — pick a PNG or JPEG photo.';
    return;
  }
  try {
    const img = await loadImage(URL.createObjectURL(file));
    const photo = addPhoto(img, file.name);
    currentPanels()[selected].photoId = photo.id;
    renderPanelPhotoOptions();
    status.textContent = `Photo loaded: ${file.name} — it is in the ${LAYOUTS[state.layoutId].labels[selected]} panel.`;
    redraw();
  } catch {
    status.textContent = 'That photo could not be read.';
  }
}

async function setPhotoFromSample(name) {
  try {
    const img = await loadImage(`samples/${name}.png`);
    const photo = addPhoto(img, `Sample: ${name}`);
    currentPanels()[selected].photoId = photo.id;
    renderPanelPhotoOptions();
    status.textContent = `Sample loaded: ${name} — it is in the ${LAYOUTS[state.layoutId].labels[selected]} panel.`;
    redraw();
  } catch {
    status.textContent = `Sample ${name} could not be loaded.`;
  }
}

function selectPanel(i) {
  const panels = currentPanels();
  selected = Math.min(i, panels.length - 1);
  renderPanelButtons();
  renderPanelPhotoOptions();
  const panel = panels[selected];
  zoomInput.value = String(panel.zoom);
  panXInput.value = String(panel.x);
  panYInput.value = String(panel.y);
  flipInput.checked = panel.flip;
  brightInput.value = String(panel.bright);
  contrastInput.value = String(panel.contrast);
  satInput.value = String(panel.sat);
}

function selectLayout(id) {
  if (!LAYOUTS[id]) return;
  const oldPanels = currentPanels();
  state.layoutId = id;
  selected = 0;
  // Carry the photos over: a panel that has no photo yet takes the photo
  // of the same-numbered panel in the layout you came from, so switching
  // layouts never empties the cover. Assignments you made in a layout stay.
  currentPanels().forEach((panel, i) => {
    if (panel.photoId == null && oldPanels[i] && oldPanels[i].photoId != null) {
      panel.photoId = oldPanels[i].photoId;
    }
  });
  layoutBlurb.textContent = LAYOUTS[id].blurb;
  document.querySelectorAll('[data-layout]').forEach((b) => {
    b.classList.toggle('active', b.dataset.layout === id);
  });
  selectPanel(0);
  redraw();
}

function selectSize(id) {
  const size = EXPORT_SIZES.find((s) => s.id === id);
  if (!size) return;
  state.sizeId = id;
  sizeSelect.value = id;
  applySizeToCanvas();
  redraw();
}

// --- wiring ---------------------------------------------------------------

// Layout picker.
document.querySelectorAll('[data-layout]').forEach((button) => {
  button.addEventListener('click', () => selectLayout(button.dataset.layout));
});

// Export size picker.
EXPORT_SIZES.forEach((size) => {
  const option = document.createElement('option');
  option.value = size.id;
  option.textContent = size.label;
  sizeSelect.appendChild(option);
});
sizeSelect.value = state.sizeId;
sizeSelect.addEventListener('change', () => selectSize(sizeSelect.value));

// Caption font + colour pickers (system fonts only — nothing to download).
Object.entries(CAPTION_FONTS).forEach(([id, font]) => {
  const option = document.createElement('option');
  option.value = id;
  option.textContent = font.label;
  fontInput.appendChild(option);
});
fontInput.value = state.caption.font;
Object.entries(CAPTION_COLORS).forEach(([value, label]) => {
  const option = document.createElement('option');
  option.value = value;
  option.textContent = label;
  colorInput.appendChild(option);
});
colorInput.value = state.caption.color;

// Photo loading: file picker, samples, drag-drop, paste.
document.getElementById('photoFile').addEventListener('change', (event) => {
  setPhotoFromFile(event.target.files[0]);
});
document.querySelectorAll('[data-sample]').forEach((button) => {
  button.addEventListener('click', () => setPhotoFromSample(button.dataset.sample));
});
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
  return { x: (event.clientX - rect.left) * scale, y: (event.clientY - rect.top) * scale };
}
canvas.addEventListener('pointerdown', (event) => {
  const point = coverPoint(event);
  const hit = panelAt(point.x, point.y, state.layoutId, canvas.width, canvas.height);
  if (hit === -1) return;
  selectPanel(hit);
  const panel = currentPanels()[hit];
  const photo = state.photos.find((p) => p.id === panel.photoId)?.img;
  if (!photo) return;
  const rect = layoutPanels(state.layoutId, canvas.width, canvas.height)[hit];
  const base = Math.max(rect.w / photo.naturalWidth, rect.h / photo.naturalHeight);
  drag = {
    startX: point.x,
    startY: point.y,
    focusX: panel.x,
    focusY: panel.y,
    drawW: photo.naturalWidth * base * panel.zoom,
    drawH: photo.naturalHeight * base * panel.zoom,
  };
  canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener('pointermove', (event) => {
  if (!drag) return;
  const point = coverPoint(event);
  const panel = currentPanels()[selected];
  panel.x = Math.min(1, Math.max(0, drag.focusX - (point.x - drag.startX) / drag.drawW));
  panel.y = Math.min(1, Math.max(0, drag.focusY - (point.y - drag.startY) / drag.drawH));
  panXInput.value = String(panel.x);
  panYInput.value = String(panel.y);
  redraw();
});
canvas.addEventListener('pointerup', () => { drag = null; });
canvas.addEventListener('pointercancel', () => { drag = null; });

// Per-panel controls follow the selected panel.
panelPhotoSelect.addEventListener('change', () => {
  const value = panelPhotoSelect.value;
  currentPanels()[selected].photoId = value === '' ? null : Number(value);
  redraw();
});
zoomInput.addEventListener('input', () => {
  currentPanels()[selected].zoom = Number(zoomInput.value);
  redraw();
});
panXInput.addEventListener('input', () => {
  currentPanels()[selected].x = Number(panXInput.value);
  redraw();
});
panYInput.addEventListener('input', () => {
  currentPanels()[selected].y = Number(panYInput.value);
  redraw();
});
flipInput.addEventListener('change', () => {
  currentPanels()[selected].flip = flipInput.checked;
  redraw();
});
brightInput.addEventListener('input', () => {
  currentPanels()[selected].bright = Number(brightInput.value);
  redraw();
});
contrastInput.addEventListener('input', () => {
  currentPanels()[selected].contrast = Number(contrastInput.value);
  redraw();
});
satInput.addEventListener('input', () => {
  currentPanels()[selected].sat = Number(satInput.value);
  redraw();
});

// Caption editor: every change repaints the live preview at once.
captionInput.addEventListener('input', () => {
  state.caption.text = captionInput.value;
  redraw();
});
taglineInput.addEventListener('input', () => {
  state.caption.tagline = taglineInput.value;
  redraw();
});
fontInput.addEventListener('change', () => {
  state.caption.font = fontInput.value;
  redraw();
});
sizeInput.addEventListener('input', () => {
  state.caption.size = Number(sizeInput.value);
  redraw();
});
colorInput.addEventListener('change', () => {
  state.caption.color = colorInput.value;
  redraw();
});
posInput.addEventListener('change', () => {
  state.caption.pos = posInput.value;
  redraw();
});
outlineInput.addEventListener('change', () => {
  state.caption.outline = outlineInput.checked;
  redraw();
});
glowInput.addEventListener('change', () => {
  state.caption.glow = glowInput.checked;
  redraw();
});
gradeInput.addEventListener('change', () => {
  state.grade = gradeInput.value;
  redraw();
});

// Export: the preview canvas is already at the chosen export size, so the
// PNG is the cover itself, at the exact pixel dimensions.
exportBtn.addEventListener('click', () => {
  if (!hasAnyPhoto(state)) {
    status.textContent = 'Load a photo first — there is nothing to export yet.';
    return;
  }
  const size = currentSize();
  canvas.toBlob((blob) => {
    if (!blob) {
      status.textContent = 'Export failed — the canvas could not make a PNG.';
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `sunset-cover-${state.layoutId}-${size.w}x${size.h}.png`;
    a.click();
    URL.revokeObjectURL(a.href);
    status.textContent = `Saved sunset-cover-${state.layoutId}-${size.w}x${size.h}.png (${size.w} × ${size.h}).`;
  }, 'image/png');
});

// Screenshot mode: ?shot=editor (the app with samples) or ?shot=cover (the
// cover alone). Otherwise draw the empty cover and wait for a photo.
const query = new URLSearchParams(location.search);
const shot = query.get('shot');
applySizeToCanvas();
layoutBlurb.textContent = LAYOUTS[state.layoutId].blurb;
renderPhotoList();
if (shot) {
  runShot(shot, query, {
    async loadSample(name, panelIndex = 0) {
      const img = await loadImage(`samples/${name}.png`);
      const photo = addPhoto(img, `Sample: ${name}`);
      const panels = currentPanels();
      if (panels[panelIndex]) panels[panelIndex].photoId = photo.id;
      redraw();
    },
    setLayout(id) { selectLayout(id); },
    setSize(id) { selectSize(id); },
    setGrade(id) { state.grade = id; gradeInput.value = id; redraw(); },
    setCaption(text) { captionInput.value = text; state.caption.text = text; redraw(); },
    setTagline(text) { taglineInput.value = text; state.caption.tagline = text; redraw(); },
  });
} else {
  selectPanel(0);
  status.textContent = 'Load a photo to begin — or try a sample below.';
  redraw();
}

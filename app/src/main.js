// main.js — wires the Sunset Cover Studio editor: photo slots (up to 3,
// each with its own crop + grade), four layouts, per-panel photo
// assignment, a rich caption editor, colour grades, live preview and PNG
// export at 1080×1080, 1080×1350 and 1920×1080. Photos are read on this
// machine only; nothing is uploaded anywhere.
import {
  COVER_SIZES, GRADES, LAYOUTS, CAPTION_FONTS, CAPTION_COLORS,
  DEFAULT_OPTIONS, blankPhoto, drawCover, exportCoverPNG,
} from './cover.js';

const $ = (id) => document.getElementById(id);
const preview = $('preview');
const pctx = preview.getContext('2d');

const MAX_PHOTOS = 3;
const SAMPLES = ['sunset-beach', 'neon-street', 'palm-drive'];

const state = {
  photos: [],
  selectedPhoto: 0,
  layout: 'classic',
  size: 'square',
  grade: 'sunset',
  caption: DEFAULT_OPTIONS.caption,
  subline: DEFAULT_OPTIONS.subline,
  tagline: '',
  captionFont: 'display',
  captionColor: 'gradient',
  captionOutline: true,
  captionShadow: true,
  captionSize: DEFAULT_OPTIONS.captionSize,
  captionY: DEFAULT_OPTIONS.captionY,
  panelPhotos: [0, 0, 0, 0],
};

function status(msg) {
  $('status').textContent = msg;
}

function coverOpts() {
  return {
    layout: state.layout,
    grade: state.grade,
    caption: state.caption || DEFAULT_OPTIONS.caption,
    subline: state.subline || DEFAULT_OPTIONS.subline,
    tagline: state.tagline,
    captionFont: state.captionFont,
    captionColor: state.captionColor,
    captionOutline: state.captionOutline,
    captionShadow: state.captionShadow,
    captionSize: state.captionSize,
    captionY: state.captionY,
    panelPhotos: state.panelPhotos,
  };
}

function renderPreview() {
  const size = COVER_SIZES[state.size];
  if (preview.width !== size.w || preview.height !== size.h) {
    preview.width = size.w;
    preview.height = size.h;
  }
  drawCover(pctx, size.w, size.h, state.photos, coverOpts());
  const hasPhoto = state.photos.length > 0;
  $('exportBtn').disabled = !hasPhoto;
  $('exportBtn').textContent = hasPhoto
    ? `Export PNG · ${size.label}`
    : 'Export PNG — load a photo first';
  $('sizeNote').textContent = `Preview ${size.w} × ${size.h} — export is a full-size PNG at the same size.`;
}

// --- photo slots ------------------------------------------------------------
// Each slot card shows the photo's name, its crop + grade sliders, and a
// remove button. The sliders always edit the slot the card belongs to, so
// every photo keeps its own framing wherever it is placed.
function slotCard(photo, index) {
  const card = document.createElement('div');
  card.className = 'photo-slot';
  card.dataset.index = index;

  const head = document.createElement('div');
  head.className = 'slot-head';
  const name = document.createElement('span');
  name.className = 'slot-name';
  name.textContent = `${index + 1} · ${photo.name}`;
  const remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'slot-remove';
  remove.textContent = 'Remove';
  remove.setAttribute('aria-label', `Remove photo ${photo.name}`);
  remove.addEventListener('click', () => removePhoto(index));
  head.append(name, remove);
  card.appendChild(head);

  const sliders = [
    ['zoom', 'Zoom', 1, 2.5, 0.05, (v) => `${Number(v).toFixed(2)}×`, 'zoom'],
    ['panX', 'Pan left / right', -100, 100, 1, (v) => `${v}%`, 'panX'],
    ['panY', 'Pan up / down', -100, 100, 1, (v) => `${v}%`, 'panY'],
    ['brightness', 'Brightness', 0.6, 1.4, 0.05, (v) => `${Number(v).toFixed(2)}`, 'brightness'],
    ['contrast', 'Contrast', 0.6, 1.4, 0.05, (v) => `${Number(v).toFixed(2)}`, 'contrast'],
    ['saturation', 'Saturation', 0, 2, 0.05, (v) => `${Number(v).toFixed(2)}`, 'saturation'],
  ];
  for (const [key, label, min, max, step, fmt] of sliders) {
    const row = document.createElement('label');
    row.className = 'mini-slider';
    const out = document.createElement('output');
    out.textContent = fmt(photo[key]);
    row.append(document.createTextNode(label + ' '), out);
    const input = document.createElement('input');
    input.type = 'range';
    input.min = min; input.max = max; input.step = step;
    input.value = photo[key];
    input.setAttribute('aria-label', `${label} for photo ${index + 1}`);
    input.addEventListener('input', () => {
      photo[key] = Number(input.value);
      out.textContent = fmt(input.value);
      renderPreview();
    });
    row.appendChild(input);
    card.appendChild(row);
  }
  return card;
}

function renderSlots() {
  const wrap = $('photoSlots');
  wrap.textContent = '';
  state.photos.forEach((photo, i) => wrap.appendChild(slotCard(photo, i)));
  $('photoName').textContent = state.photos.length
    ? `${state.photos.length} photo${state.photos.length > 1 ? 's' : ''} loaded — assign them to panels below.`
    : 'No photo yet — the panels show the empty state.';
  renderPanelAssign();
}

function addPhoto(img, name) {
  if (state.photos.length >= MAX_PHOTOS) {
    status(`Already holding ${MAX_PHOTOS} photos — remove one before adding another.`);
    return false;
  }
  state.photos.push(blankPhoto(img, name));
  state.selectedPhoto = state.photos.length - 1;
  $('dropHint').style.display = 'none';
  renderSlots();
  renderPreview();
  status(`Loaded ${name} — pick a layout, frame it, then Export PNG.`);
  return true;
}

function removePhoto(index) {
  const [gone] = state.photos.splice(index, 1);
  // Panels that used the removed slot fall back to slot 0; higher slots
  // shift down one so assignments keep pointing at the same pictures.
  state.panelPhotos = state.panelPhotos.map((slot) => {
    if (slot === index) return 0;
    if (slot > index) return slot - 1;
    return slot;
  });
  if (state.photos.length === 0) $('dropHint').style.display = '';
  renderSlots();
  renderPreview();
  status(gone ? `Removed ${gone.name}.` : 'Photo removed.');
}

function loadPhotoFile(file) {
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    status(`"${file.name}" is not an image — try a JPG, PNG or WebP photo.`);
    return;
  }
  if (state.photos.length >= MAX_PHOTOS) {
    status(`Already holding ${MAX_PHOTOS} photos — remove one before adding another.`);
    return;
  }
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    URL.revokeObjectURL(url);
    addPhoto(img, file.name);
  };
  img.onerror = () => status(`Could not read "${file.name}" — the file may be damaged.`);
  img.src = url;
}

function loadSample(name) {
  if (state.photos.length >= MAX_PHOTOS) {
    status(`Already holding ${MAX_PHOTOS} photos — remove one before adding another.`);
    return;
  }
  const img = new Image();
  img.onload = () => addPhoto(img, `${name}.png (sample)`);
  img.onerror = () => status(`Sample ${name} failed to load — check app/samples/${name}.png exists.`);
  img.src = `samples/${name}.png`;
}

// --- photo intake: file input, dropzone click, drag-drop, paste --------------
$('photoInput').addEventListener('change', (e) => {
  loadPhotoFile(e.target.files[0]);
  e.target.value = '';
});

const dropzone = $('dropzone');
dropzone.addEventListener('click', (e) => {
  if (e.target === preview) $('photoInput').click();
});
['dragenter', 'dragover'].forEach((ev) => dropzone.addEventListener(ev, (e) => {
  e.preventDefault();
  dropzone.classList.add('dragging');
}));
['dragleave', 'drop'].forEach((ev) => dropzone.addEventListener(ev, (e) => {
  e.preventDefault();
  dropzone.classList.remove('dragging');
}));
dropzone.addEventListener('drop', (e) => loadPhotoFile(e.dataTransfer.files[0]));

document.addEventListener('paste', (e) => {
  const file = [...(e.clipboardData?.files || [])].find((f) => f.type.startsWith('image/'));
  if (file) loadPhotoFile(file);
});

// Sample photo buttons.
const sampleRow = $('samples');
for (const name of SAMPLES) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'sample-btn';
  btn.textContent = name.replace(/-/g, ' ');
  btn.addEventListener('click', () => loadSample(name));
  sampleRow.appendChild(btn);
}

// --- layouts ------------------------------------------------------------------
const layoutRow = $('layouts');
for (const [key, layout] of Object.entries(LAYOUTS)) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'layout-btn' + (key === state.layout ? ' active' : '');
  btn.dataset.layout = key;
  btn.setAttribute('aria-pressed', String(key === state.layout));
  btn.title = layout.blurb;
  btn.innerHTML = `<strong>${layout.label}</strong><span>${layout.panels.length} panel${layout.panels.length > 1 ? 's' : ''}</span>`;
  btn.addEventListener('click', () => {
    state.layout = key;
    layoutRow.querySelectorAll('.layout-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.layout === key);
      b.setAttribute('aria-pressed', String(b.dataset.layout === key));
    });
    renderPanelAssign();
    renderPreview();
    status(`${layout.label} layout — ${layout.blurb}`);
  });
  layoutRow.appendChild(btn);
}

// Per-panel photo assignment: one select per panel of the active layout.
function renderPanelAssign() {
  const wrap = $('panelAssign');
  wrap.textContent = '';
  const layout = LAYOUTS[state.layout];
  layout.panels.forEach((panel, i) => {
    const row = document.createElement('label');
    row.className = 'panel-assign';
    row.textContent = `Panel ${i + 1}${panel.hero ? ' (hero)' : panel.inset ? ' (inset)' : panel.fullBleed ? ' (full bleed)' : ''}: `;
    const select = document.createElement('select');
    select.setAttribute('aria-label', `Photo for panel ${i + 1}`);
    const empty = document.createElement('option');
    empty.value = '-1';
    empty.textContent = 'Empty panel';
    select.appendChild(empty);
    state.photos.forEach((photo, pi) => {
      const opt = document.createElement('option');
      opt.value = String(pi);
      opt.textContent = `Photo ${pi + 1} — ${photo.name}`;
      select.appendChild(opt);
    });
    select.value = String(state.panelPhotos[i] ?? 0);
    if (!select.value) select.value = state.photos.length ? '0' : '-1';
    select.addEventListener('change', () => {
      state.panelPhotos[i] = Number(select.value);
      renderPreview();
    });
    row.appendChild(select);
    wrap.appendChild(row);
  });
}

// --- caption editor -------------------------------------------------------------
function bindSlider(id, key, outId, fmt = (v) => v) {
  const el = $(id);
  el.addEventListener('input', () => {
    state[key] = Number(el.value);
    $(outId).textContent = fmt(el.value);
    renderPreview();
  });
}
bindSlider('captionSize', 'captionSize', 'captionSizeVal', (v) => `${v}px`);
bindSlider('captionY', 'captionY', 'captionYVal', (v) => `${v}px`);

$('caption').addEventListener('input', (e) => {
  state.caption = e.target.value;
  renderPreview();
});
$('subline').addEventListener('input', (e) => {
  state.subline = e.target.value;
  renderPreview();
});
$('tagline').addEventListener('input', (e) => {
  state.tagline = e.target.value;
  renderPreview();
});

const fontSelect = $('captionFont');
for (const [key, font] of Object.entries(CAPTION_FONTS)) {
  const opt = document.createElement('option');
  opt.value = key;
  opt.textContent = font.label;
  fontSelect.appendChild(opt);
}
fontSelect.value = state.captionFont;
fontSelect.addEventListener('change', () => {
  state.captionFont = fontSelect.value;
  renderPreview();
});

const colorSelect = $('captionColor');
for (const [key, col] of Object.entries(CAPTION_COLORS)) {
  const opt = document.createElement('option');
  opt.value = key;
  opt.textContent = col.label;
  colorSelect.appendChild(opt);
}
colorSelect.value = state.captionColor;
colorSelect.addEventListener('change', () => {
  state.captionColor = colorSelect.value;
  renderPreview();
});

$('captionOutline').addEventListener('change', (e) => {
  state.captionOutline = e.target.checked;
  renderPreview();
});
$('captionShadow').addEventListener('change', (e) => {
  state.captionShadow = e.target.checked;
  renderPreview();
});

// --- colour grades ----------------------------------------------------------------
const gradeRow = $('grades');
for (const [key, grade] of Object.entries(GRADES)) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'grade-btn' + (key === state.grade ? ' active' : '');
  btn.textContent = grade.label;
  btn.setAttribute('aria-pressed', String(key === state.grade));
  btn.addEventListener('click', () => {
    state.grade = key;
    gradeRow.querySelectorAll('.grade-btn').forEach((b) => {
      b.classList.remove('active');
      b.setAttribute('aria-pressed', 'false');
    });
    btn.classList.add('active');
    btn.setAttribute('aria-pressed', 'true');
    renderPreview();
  });
  gradeRow.appendChild(btn);
}

// --- export sizes + export ---------------------------------------------------------
const sizeRow = $('exportSizes');
for (const [key, size] of Object.entries(COVER_SIZES)) {
  const label = document.createElement('label');
  label.className = 'size-option';
  const radio = document.createElement('input');
  radio.type = 'radio';
  radio.name = 'exportSize';
  radio.value = key;
  radio.checked = key === state.size;
  radio.addEventListener('change', () => {
    state.size = key;
    renderPreview();
    status(`Export size ${size.label} — preview now shows that shape.`);
  });
  label.append(radio, document.createTextNode(` ${size.label}`));
  sizeRow.appendChild(label);
}

$('exportBtn').addEventListener('click', async () => {
  if (state.photos.length === 0) {
    status('Nothing to export yet — load a photo or pick a sample first.');
    return;
  }
  const size = COVER_SIZES[state.size];
  const btn = $('exportBtn');
  btn.disabled = true;
  status(`Rendering ${size.label} PNG…`);
  try {
    const blob = await exportCoverPNG(state.photos, coverOpts(), state.size);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sunset-cover-${size.w}x${size.h}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    status(`Exported sunset-cover-${size.w}x${size.h}.png — ${blob.size.toLocaleString()} bytes, ${size.label}.`);
  } catch (err) {
    status(`Export failed: ${err.message}`);
  } finally {
    btn.disabled = state.photos.length === 0;
  }
});

// --- start ---------------------------------------------------------------------------
// URL params for deep links and screenshots:
//   ?sample=sunset-beach&sample2=neon-street  load samples into slots
//   ?layout=triptych&size=wide&grade=neon     pick layout / size / grade
const params = new URLSearchParams(location.search);
const wantedLayout = params.get('layout');
if (wantedLayout && LAYOUTS[wantedLayout]) {
  state.layout = wantedLayout;
  layoutRow.querySelectorAll('.layout-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.layout === wantedLayout);
    b.setAttribute('aria-pressed', String(b.dataset.layout === wantedLayout));
  });
}
const wantedSize = params.get('size');
if (wantedSize && COVER_SIZES[wantedSize]) state.size = wantedSize;
const wantedGrade = params.get('grade');
if (wantedGrade && GRADES[wantedGrade]) {
  state.grade = wantedGrade;
  gradeRow.querySelectorAll('.grade-btn').forEach((b) => {
    b.classList.toggle('active', b.textContent.toLowerCase() === GRADES[wantedGrade].label.toLowerCase());
    b.setAttribute('aria-pressed', String(b.textContent.toLowerCase() === GRADES[wantedGrade].label.toLowerCase()));
  });
}
const wantedCaption = params.get('caption');
if (wantedCaption) {
  state.caption = wantedCaption;
  $('caption').value = wantedCaption;
}
const wantedTagline = params.get('tagline');
if (wantedTagline) {
  state.tagline = wantedTagline;
  $('tagline').value = wantedTagline;
}
const samples = [params.get('sample'), params.get('sample2'), params.get('sample3')]
  .filter((s) => s && SAMPLES.includes(s));
if (samples.length) {
  // Load samples one at a time so each lands in its own slot.
  const loadNext = (i) => {
    if (i >= samples.length) return;
    const img = new Image();
    img.onload = () => { addPhoto(img, `${samples[i]}.png (sample)`); loadNext(i + 1); };
    img.onerror = () => { status(`Sample ${samples[i]} failed to load.`); loadNext(i + 1); };
    img.src = `samples/${samples[i]}.png`;
  };
  loadNext(0);
}
renderSlots();
renderPreview();
if (!samples.length) {
  status('Drop a photo, paste one, or pick a sample — then Export PNG.');
}

// main.js — wires the Sunset Cover Studio editor: photo loading (file input,
// drag-drop, paste), crop + position controls, caption editing, colour grade,
// live preview and the 1080 x 1080 PNG export. Photos are read on this machine
// only; nothing is uploaded anywhere.
import { COVER_SIZE, GRADES, DEFAULT_OPTIONS, drawCover, exportCoverPNG } from './cover.js';

const $ = (id) => document.getElementById(id);
const preview = $('preview');
const pctx = preview.getContext('2d');
preview.width = COVER_SIZE;
preview.height = COVER_SIZE;

const state = {
  photo: null,
  photoName: '',
  ...DEFAULT_OPTIONS,
};

const SAMPLES = ['sunset-beach', 'neon-street', 'palm-drive'];

function status(msg) {
  $('status').textContent = msg;
}

function renderPreview() {
  drawCover(pctx, state.photo, state);
  $('exportBtn').disabled = false;
  $('sizeNote').textContent = `Preview ${COVER_SIZE} × ${COVER_SIZE} — export is a full-size PNG.`;
}

function setPhoto(img, name) {
  state.photo = img;
  state.photoName = name;
  $('photoName').textContent = name;
  $('dropHint').style.display = 'none';
  renderPreview();
  status(`Loaded ${name} — drag the sliders to frame it, then Export PNG.`);
}

function loadPhotoFile(file) {
  if (!file || !file.type.startsWith('image/')) {
    status('That file is not an image — try a JPG or PNG photo.');
    return;
  }
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    URL.revokeObjectURL(url);
    setPhoto(img, file.name);
  };
  img.onerror = () => status('Could not read that image file.');
  img.src = url;
}

function loadSample(name) {
  const img = new Image();
  img.onload = () => setPhoto(img, `${name}.png (sample)`);
  img.onerror = () => status(`Sample ${name} failed to load.`);
  img.src = `samples/${name}.png`;
}

// --- photo intake: file input, drag-drop, paste ---------------------------
$('photoInput').addEventListener('change', (e) => loadPhotoFile(e.target.files[0]));

const dropzone = $('dropzone');
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

// --- controls ---------------------------------------------------------------
function bindSlider(id, key, outId, fmt = (v) => v) {
  const el = $(id);
  el.addEventListener('input', () => {
    state[key] = Number(el.value);
    $(outId).textContent = fmt(el.value);
    renderPreview();
  });
}
bindSlider('zoom', 'zoom', 'zoomVal', (v) => `${Number(v).toFixed(2)}×`);
bindSlider('panX', 'panX', 'panXVal', (v) => `${v}%`);
bindSlider('panY', 'panY', 'panYVal', (v) => `${v}%`);
bindSlider('captionSize', 'captionSize', 'captionSizeVal', (v) => `${v}px`);
bindSlider('captionY', 'captionY', 'captionYVal', (v) => `${v}px`);

$('caption').addEventListener('input', (e) => {
  state.caption = e.target.value || DEFAULT_OPTIONS.caption;
  renderPreview();
});
$('subline').addEventListener('input', (e) => {
  state.subline = e.target.value || DEFAULT_OPTIONS.subline;
  renderPreview();
});

// Grade buttons: one per colour grade in cover.js.
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

// --- export -------------------------------------------------------------------
$('exportBtn').addEventListener('click', async () => {
  const btn = $('exportBtn');
  btn.disabled = true;
  status('Rendering 1080 × 1080 PNG…');
  try {
    const blob = await exportCoverPNG(state.photo, state);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sunset-cover-1080.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    status(`Exported sunset-cover-1080.png — ${blob.size.toLocaleString()} bytes, 1080 × 1080.`);
  } catch (err) {
    status(`Export failed: ${err.message}`);
  } finally {
    btn.disabled = false;
  }
});

// --- start ----------------------------------------------------------------------
const params = new URLSearchParams(location.search);
const wanted = params.get('sample');
if (wanted && SAMPLES.includes(wanted)) {
  loadSample(wanted);
} else {
  renderPreview();
  status('Drop a photo, paste one, or pick a sample — then Export PNG.');
}

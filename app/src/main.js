// main.js — the editor wiring for Sunset Cover Studio.
// Owns the UI state (photo, crop, caption, tagline), re-renders the preview
// canvas on every change, and exports the cover as a 1080 x 1080 PNG.
// Photos are read on this machine only (FileReader / drag-drop / paste) and
// never leave it. Also supports scripted modes for screenshots and checks:
//   ?shot=editor&photo=<sample>&caption=<text>  load a sample, render the editor
//   ?shot=cover&photo=<sample>&caption=<text>   render the cover full-screen
//   ?selftest=1                                 render + export, report the result
//                                                 in #status and document.title
import { SIZE, drawCover, defaultOptions } from './cover.js';

const SAMPLES = ['sunset-beach', 'neon-street', 'palm-drive'];

const els = {
  photo: document.getElementById('photo'),
  dropzone: document.getElementById('dropzone'),
  sampleBtn: document.getElementById('sampleBtn'),
  sampleName: document.getElementById('sampleName'),
  caption: document.getElementById('caption'),
  captionSize: document.getElementById('captionSize'),
  captionSizeVal: document.getElementById('captionSizeVal'),
  captionY: document.getElementById('captionY'),
  tagline: document.getElementById('tagline'),
  zoom: document.getElementById('zoom'),
  zoomVal: document.getElementById('zoomVal'),
  offsetX: document.getElementById('offsetX'),
  offsetY: document.getElementById('offsetY'),
  exportBtn: document.getElementById('exportBtn'),
  status: document.getElementById('status'),
  preview: document.getElementById('preview'),
};

const state = {
  ...defaultOptions(),
  photo: null, // HTMLImageElement
  sampleIndex: 0,
};

function setStatus(text) {
  els.status.textContent = text;
}

function render() {
  if (!state.photo) return;
  const ctx = els.preview.getContext('2d');
  drawCover(ctx, state.photo, state);
}

function loadPhotoFromFile(file) {
  if (!file || !file.type.startsWith('image/')) {
    setStatus('That file is not an image — pick a photo (PNG or JPEG).');
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      state.photo = img;
      els.sampleName.textContent = file.name;
      setStatus(`Photo loaded: ${file.name} (${img.naturalWidth} x ${img.naturalHeight}).`);
      render();
    };
    img.onerror = () => setStatus('Could not read that image file.');
    img.src = reader.result;
  };
  reader.onerror = () => setStatus('Could not read that file.');
  reader.readAsDataURL(file);
}

function loadSample(name) {
  const img = new Image();
  img.onload = () => {
    state.photo = img;
    els.sampleName.textContent = `sample: ${name}`;
    setStatus(`Sample photo loaded: ${name}.`);
    render();
  };
  img.onerror = () => setStatus(`Sample photo not found: ${name}.`);
  img.src = `./samples/${name}.png`;
}

function nextSample() {
  const name = SAMPLES[state.sampleIndex % SAMPLES.length];
  state.sampleIndex += 1;
  loadSample(name);
}

function exportPng(options = {}) {
  const download = options.download !== false;
  if (!state.photo) {
    setStatus('Load a photo first, then export.');
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = SIZE;
    canvas.height = SIZE;
    drawCover(canvas.getContext('2d'), state.photo, state);
    canvas.toBlob((blob) => {
      if (!blob) {
        setStatus('Export failed: the browser could not make the PNG.');
        resolve(null);
        return;
      }
      if (download) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'sunset-cover-1080x1080.png';
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
      }
      setStatus(`Exported sunset-cover-1080x1080.png (${blob.size} bytes, 1080 x 1080).`);
      resolve({ blob, bytes: blob.size, width: SIZE, height: SIZE });
    }, 'image/png');
  });
}

// ---- controls ----
els.photo.addEventListener('change', (e) => loadPhotoFromFile(e.target.files[0]));
els.sampleBtn.addEventListener('click', nextSample);
els.caption.addEventListener('input', () => { state.caption = els.caption.value; render(); });
els.captionSize.addEventListener('input', () => {
  state.captionSize = Number(els.captionSize.value);
  els.captionSizeVal.textContent = `${state.captionSize}px`;
  render();
});
els.captionY.addEventListener('input', () => { state.captionY = Number(els.captionY.value); render(); });
els.tagline.addEventListener('input', () => { state.tagline = els.tagline.value; render(); });
els.zoom.addEventListener('input', () => {
  state.zoom = Number(els.zoom.value) / 100;
  els.zoomVal.textContent = `${els.zoom.value}%`;
  render();
});
els.offsetX.addEventListener('input', () => { state.offsetX = Number(els.offsetX.value); render(); });
els.offsetY.addEventListener('input', () => { state.offsetY = Number(els.offsetY.value); render(); });
els.exportBtn.addEventListener('click', () => { void exportPng(); });

// drag-drop + paste: photos stay on this machine
for (const evt of ['dragenter', 'dragover']) {
  els.dropzone.addEventListener(evt, (e) => { e.preventDefault(); els.dropzone.classList.add('dragging'); });
}
for (const evt of ['dragleave', 'drop']) {
  els.dropzone.addEventListener(evt, (e) => { e.preventDefault(); els.dropzone.classList.remove('dragging'); });
}
els.dropzone.addEventListener('drop', (e) => loadPhotoFromFile(e.dataTransfer.files[0]));
document.addEventListener('paste', (e) => {
  const file = [...(e.clipboardData?.files ?? [])].find((f) => f.type.startsWith('image/'));
  if (file) loadPhotoFromFile(file);
});

// ---- scripted modes (?shot= / ?selftest=) ----
const params = new URLSearchParams(location.search);
const shot = params.get('shot');
const sampleParam = params.get('photo');
const captionParam = params.get('caption');
if (captionParam) {
  els.caption.value = captionParam;
  state.caption = captionParam;
}
if (sampleParam) {
  state.sampleIndex = Math.max(0, SAMPLES.indexOf(sampleParam));
  loadSample(sampleParam);
} else if (shot || params.has('selftest')) {
  loadSample(SAMPLES[0]);
}

if (shot === 'cover') {
  // Cover mode: the preview canvas fills the viewport for the cover shot.
  document.body.classList.add('cover-mode');
}
if (params.has('selftest')) {
  // Wait for the sample to load, then run the real export path and report.
  const check = setInterval(() => {
    if (!state.photo) return;
    clearInterval(check);
    render();
    // Self-test runs the real export pipeline (render + toBlob) but skips
    // the download click: headless Chrome stalls on the download prompt.
    void exportPng({ download: false }).then((result) => {
      const line = result
        ? `EXPORT_OK ${result.width}x${result.height} ${result.bytes} bytes`
        : 'EXPORT_FAIL';
      setStatus(line);
      document.title = line;
    });
  }, 100);
  setTimeout(() => { if (document.title === 'Sunset Cover Studio') { setStatus('SELFTEST_TIMEOUT'); document.title = 'SELFTEST_TIMEOUT'; } }, 15000);
}

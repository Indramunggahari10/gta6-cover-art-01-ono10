// main.js — the editor wiring for Sunset Cover Studio (Session B).
// Owns the UI state (two photo slots, per-panel crop, caption, tagline,
// layout + export size), re-renders the preview canvas on every change, and
// exports the cover as a PNG at 1080x1080, 1080x1350 or 1920x1080.
// Photos are read on this machine only (FileReader / drag-drop / paste) and
// never leave it. Also supports scripted modes for screenshots and checks:
//   ?shot=editor&photo=<sample>&caption=<text>&layout=<id>&size=<id>
//   ?shot=cover&photo=<sample>&caption=<text>&layout=<id>&size=<id>
//   ?selftest=1   render + export all 3 sizes, report in #status and title
import {
  EXPORT_SIZES, LAYOUTS, sizeById, layoutById, geometryFor,
  defaultPanels, defaultCaption, defaultSlot,
} from './cover.js';

const SAMPLES = ['sunset-beach', 'neon-street', 'palm-drive'];

const els = {
  photoA: document.getElementById('photoA'),
  photoB: document.getElementById('photoB'),
  dropzone: document.getElementById('dropzone'),
  sampleA: document.getElementById('sampleA'),
  sampleB: document.getElementById('sampleB'),
  nameA: document.getElementById('nameA'),
  nameB: document.getElementById('nameB'),
  gradeSlot: document.getElementById('gradeSlot'),
  bright: document.getElementById('bright'),
  brightVal: document.getElementById('brightVal'),
  contrast: document.getElementById('contrast'),
  contrastVal: document.getElementById('contrastVal'),
  sat: document.getElementById('sat'),
  satVal: document.getElementById('satVal'),
  layoutPicker: document.getElementById('layoutPicker'),
  panelSelect: document.getElementById('panelSelect'),
  panelSlot: document.getElementById('panelSlot'),
  zoom: document.getElementById('zoom'),
  zoomVal: document.getElementById('zoomVal'),
  offsetX: document.getElementById('offsetX'),
  offsetY: document.getElementById('offsetY'),
  caption: document.getElementById('caption'),
  captionFont: document.getElementById('captionFont'),
  captionSize: document.getElementById('captionSize'),
  captionSizeVal: document.getElementById('captionSizeVal'),
  captionY: document.getElementById('captionY'),
  captionColor: document.getElementById('captionColor'),
  outlineChk: document.getElementById('outlineChk'),
  shadowChk: document.getElementById('shadowChk'),
  tagline: document.getElementById('tagline'),
  taglineChk: document.getElementById('taglineChk'),
  sizePicker: document.getElementById('sizePicker'),
  exportBtn: document.getElementById('exportBtn'),
  status: document.getElementById('status'),
  preview: document.getElementById('preview'),
  previewNote: document.getElementById('previewNote'),
};

const state = {
  layout: 'nights',
  sizeId: 'square',
  caption: defaultCaption(),
  slots: [defaultSlot(), defaultSlot()],
  panels: {
    nights: defaultPanels('nights'),
    strip: defaultPanels('strip'),
    boulevard: defaultPanels('boulevard'),
  },
  activePanel: 'main',
  sampleIndex: [0, 1],
};

window.__errs = [];
window.addEventListener('error', (e) => window.__errs.push(String(e.message || e.error)));

function setStatus(text) {
  els.status.textContent = text;
}

function currentSize() {
  return sizeById(state.sizeId);
}

function currentPanels() {
  return state.panels[state.layout];
}

function render() {
  const size = currentSize();
  if (els.preview.width !== size.w || els.preview.height !== size.h) {
    els.preview.width = size.w;
    els.preview.height = size.h;
  }
  const ctx = els.preview.getContext('2d');
  const geo = geometryFor(state.layout, size.w, size.h);
  // Dynamic import keeps the first paint cheap; cover.js is already loaded
  // as a module import above, so draw via the shared renderer below.
  drawCoverInto(ctx, size.w, size.h, geo);
  els.previewNote.textContent =
    `Live preview — ${layoutById(state.layout).name} · ${size.label} export. ` +
    `Title band, panels and tagline update as you edit.`;
}

// The renderer lives in cover.js; this thin wrapper keeps main.js free of
// layout math and lets the self-test call the same path as the preview.
import { drawCover, drawEmpty } from './cover.js';
function drawCoverInto(ctx, W, H, geo) {
  const model = {
    layout: state.layout,
    slots: state.slots,
    panels: currentPanels(),
    caption: state.caption,
  };
  if (!state.slots[0].img && !state.slots[1].img) {
    drawEmpty(ctx, W, H, geo);
    return;
  }
  drawCover(ctx, W, H, model);
}

function loadPhotoFromFile(slotIdx, file) {
  if (!file || !file.type.startsWith('image/')) {
    setStatus('That file is not an image — pick a photo (PNG or JPEG).');
    return Promise.resolve(false);
  }
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        state.slots[slotIdx].img = img;
        state.slots[slotIdx].name = file.name;
        (slotIdx === 0 ? els.nameA : els.nameB).textContent = file.name;
        setStatus(`Photo ${slotIdx === 0 ? 'A' : 'B'} loaded: ${file.name} (${img.naturalWidth} x ${img.naturalHeight}).`);
        render();
        resolve(true);
      };
      img.onerror = () => { setStatus('Could not read that image file.'); resolve(false); };
      img.src = reader.result;
    };
    reader.onerror = () => { setStatus('Could not read that file.'); resolve(false); };
    reader.readAsDataURL(file);
  });
}

function loadSampleInto(slotIdx, name) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      state.slots[slotIdx].img = img;
      state.slots[slotIdx].name = `sample: ${name}`;
      (slotIdx === 0 ? els.nameA : els.nameB).textContent = `sample: ${name}`;
      setStatus(`Sample photo loaded into slot ${slotIdx === 0 ? 'A' : 'B'}: ${name}.`);
      render();
      resolve(true);
    };
    img.onerror = () => { setStatus(`Sample photo not found: ${name}.`); resolve(false); };
    img.src = `./samples/${name}.png`;
  });
}

function nextSample(slotIdx) {
  const name = SAMPLES[state.sampleIndex[slotIdx] % SAMPLES.length];
  state.sampleIndex[slotIdx] += 1;
  return loadSampleInto(slotIdx, name);
}

function exportPng(sizeId, options = {}) {
  const download = options.download !== false;
  if (!state.slots[0].img && !state.slots[1].img) {
    setStatus('Load a photo first, then export.');
    return Promise.resolve(null);
  }
  const size = sizeById(sizeId);
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = size.w;
    canvas.height = size.h;
    const model = {
      layout: state.layout,
      slots: state.slots,
      panels: currentPanels(),
      caption: state.caption,
    };
    drawCover(canvas.getContext('2d'), size.w, size.h, model);
    canvas.toBlob((blob) => {
      if (!blob) {
        setStatus('Export failed: the browser could not make the PNG.');
        resolve(null);
        return;
      }
      const fileName = `sunset-cover-${size.w}x${size.h}.png`;
      if (download) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
      }
      setStatus(`Exported ${fileName} (${blob.size} bytes, ${size.w} x ${size.h}).`);
      resolve({ blob, bytes: blob.size, width: size.w, height: size.h });
    }, 'image/png');
  });
}

// ---- panel + grade controls ----
function refreshPanelOptions() {
  const geo = geometryFor(state.layout, currentSize().w, currentSize().h);
  els.panelSelect.innerHTML = '';
  for (const panel of geo.panels) {
    const opt = document.createElement('option');
    opt.value = panel.id;
    opt.textContent = panel.name;
    els.panelSelect.appendChild(opt);
  }
  if (!geo.panels.some((p) => p.id === state.activePanel)) {
    state.activePanel = geo.panels[0].id;
  }
  els.panelSelect.value = state.activePanel;
  refreshPanelControls();
}

function refreshPanelControls() {
  const p = currentPanels()[state.activePanel] || { slot: 0, zoom: 1, offsetX: 0, offsetY: 0 };
  els.panelSlot.value = String(p.slot);
  els.zoom.value = Math.round(p.zoom * 100);
  els.zoomVal.textContent = `${Math.round(p.zoom * 100)}%`;
  els.offsetX.value = p.offsetX;
  els.offsetY.value = p.offsetY;
}

function refreshGradeControls() {
  const slot = state.slots[Number(els.gradeSlot.value)];
  els.bright.value = Math.round(slot.bright * 100);
  els.brightVal.textContent = `${Math.round(slot.bright * 100)}%`;
  els.contrast.value = Math.round(slot.contrast * 100);
  els.contrastVal.textContent = `${Math.round(slot.contrast * 100)}%`;
  els.sat.value = Math.round(slot.sat * 100);
  els.satVal.textContent = `${Math.round(slot.sat * 100)}%`;
}

function refreshCaptionControls() {
  els.caption.value = state.caption.caption;
  els.captionFont.value = state.caption.font;
  els.captionSize.value = state.caption.size;
  els.captionSizeVal.textContent = `${state.caption.size}px`;
  els.captionY.value = state.caption.y;
  els.captionColor.value = state.caption.color;
  els.outlineChk.checked = state.caption.outline;
  els.shadowChk.checked = state.caption.shadow;
  els.tagline.value = state.caption.tagline;
  els.taglineChk.checked = state.caption.taglineOn;
}

function refreshExportButton() {
  const size = currentSize();
  els.exportBtn.textContent = `Export PNG · ${size.label}`;
}

// ---- controls wiring ----
els.photoA.addEventListener('change', (e) => { void loadPhotoFromFile(0, e.target.files[0]); });
els.photoB.addEventListener('change', (e) => { void loadPhotoFromFile(1, e.target.files[0]); });
els.sampleA.addEventListener('click', () => { void nextSample(0); });
els.sampleB.addEventListener('click', () => { void nextSample(1); });
els.gradeSlot.addEventListener('change', refreshGradeControls);
for (const [key, el, valEl] of [
  ['bright', els.bright, els.brightVal],
  ['contrast', els.contrast, els.contrastVal],
  ['sat', els.sat, els.satVal],
]) {
  el.addEventListener('input', () => {
    const slot = state.slots[Number(els.gradeSlot.value)];
    slot[key] = Number(el.value) / 100;
    valEl.textContent = `${el.value}%`;
    render();
  });
}
els.layoutPicker.addEventListener('change', (e) => {
  state.layout = e.target.value;
  refreshPanelOptions();
  render();
});
els.panelSelect.addEventListener('change', () => {
  state.activePanel = els.panelSelect.value;
  refreshPanelControls();
});
els.panelSlot.addEventListener('change', () => {
  currentPanels()[state.activePanel].slot = Number(els.panelSlot.value);
  render();
});
els.zoom.addEventListener('input', () => {
  currentPanels()[state.activePanel].zoom = Number(els.zoom.value) / 100;
  els.zoomVal.textContent = `${els.zoom.value}%`;
  render();
});
els.offsetX.addEventListener('input', () => {
  currentPanels()[state.activePanel].offsetX = Number(els.offsetX.value);
  render();
});
els.offsetY.addEventListener('input', () => {
  currentPanels()[state.activePanel].offsetY = Number(els.offsetY.value);
  render();
});
els.caption.addEventListener('input', () => { state.caption.caption = els.caption.value; render(); });
els.captionFont.addEventListener('change', () => { state.caption.font = els.captionFont.value; render(); });
els.captionSize.addEventListener('input', () => {
  state.caption.size = Number(els.captionSize.value);
  els.captionSizeVal.textContent = `${state.caption.size}px`;
  render();
});
els.captionY.addEventListener('input', () => { state.caption.y = Number(els.captionY.value); render(); });
els.captionColor.addEventListener('change', () => { state.caption.color = els.captionColor.value; render(); });
els.outlineChk.addEventListener('change', () => { state.caption.outline = els.outlineChk.checked; render(); });
els.shadowChk.addEventListener('change', () => { state.caption.shadow = els.shadowChk.checked; render(); });
els.tagline.addEventListener('input', () => { state.caption.tagline = els.tagline.value; render(); });
els.taglineChk.addEventListener('change', () => { state.caption.taglineOn = els.taglineChk.checked; render(); });
els.sizePicker.addEventListener('change', (e) => {
  state.sizeId = e.target.value;
  refreshExportButton();
  render();
});
els.exportBtn.addEventListener('click', () => { void exportPng(state.sizeId); });

// drag-drop + paste: photos stay on this machine
for (const evt of ['dragenter', 'dragover']) {
  els.dropzone.addEventListener(evt, (e) => { e.preventDefault(); els.dropzone.classList.add('dragging'); });
}
for (const evt of ['dragleave', 'drop']) {
  els.dropzone.addEventListener(evt, (e) => { e.preventDefault(); els.dropzone.classList.remove('dragging'); });
}
els.dropzone.addEventListener('drop', (e) => { void loadPhotoFromFile(0, e.dataTransfer.files[0]); });
document.addEventListener('paste', (e) => {
  const file = [...(e.clipboardData?.files ?? [])].find((f) => f.type.startsWith('image/'));
  if (file) void loadPhotoFromFile(0, file);
});

// ---- scripted modes (?shot= / ?selftest=) ----
const params = new URLSearchParams(location.search);
const shot = params.get('shot');
const layoutParam = params.get('layout');
const sizeParam = params.get('size');
const captionParam = params.get('caption');
const photoParam = params.get('photo');
const photoBParam = params.get('photoB');

if (layoutParam && LAYOUTS.some((l) => l.id === layoutParam)) {
  state.layout = layoutParam;
  document.querySelector(`input[name="layout"][value="${layoutParam}"]`).checked = true;
}
if (sizeParam && EXPORT_SIZES.some((s) => s.id === sizeParam)) {
  state.sizeId = sizeParam;
  document.querySelector(`input[name="size"][value="${sizeParam}"]`).checked = true;
}
if (captionParam) state.caption.caption = captionParam;

refreshPanelOptions();
refreshGradeControls();
refreshCaptionControls();
refreshExportButton();

async function loadShotPhotos() {
  const jobs = [];
  if (photoParam) jobs.push(loadSampleInto(0, photoParam));
  else if (params.has('selftest')) jobs.push(loadSampleInto(0, 'sunset-beach'));
  if (photoBParam) jobs.push(loadSampleInto(1, photoBParam));
  else if (shot || params.has('selftest')) jobs.push(loadSampleInto(1, 'neon-street'));
  await Promise.all(jobs);
  render();
}

if (photoParam || shot || params.has('selftest')) {
  void loadShotPhotos();
} else {
  render();
}

if (shot === 'cover') {
  // Cover mode: the preview canvas fills the viewport for the cover shot.
  document.body.classList.add('cover-mode');
}

if (params.has('selftest')) {
  // Run the real export pipeline for every layout x every size and report.
  const run = async () => {
    await loadShotPhotos();
    const results = [];
    let ok = 0, total = 0;
    const savedLayout = state.layout;
    for (const layout of LAYOUTS) {
      state.layout = layout.id;
      for (const size of EXPORT_SIZES) {
        total += 1;
        const r = await exportPng(size.id, { download: false });
        if (r && r.width === size.w && r.height === size.h) {
          ok += 1;
          results.push(`${layout.id}:${size.w}x${size.h} ${r.bytes}b`);
        } else {
          results.push(`${layout.id}:${size.w}x${size.h} FAIL`);
        }
      }
    }
    state.layout = savedLayout;
    render();
    const net = performance.getEntriesByType('resource')
      .filter((e) => !e.name.startsWith(location.origin) && !e.name.startsWith('data:') && !e.name.startsWith('blob:')).length;
    const errs = window.__errs.length;
    const line = `EXPORT_OK ${ok}/${total} ${results.join(' | ')} NET${net}${errs ? ` JSERR${errs}` : ''}`;
    setStatus(line);
    document.title = line;
  };
  const check = setInterval(() => {
    if (!state.slots[0].img) return;
    clearInterval(check);
    void run();
  }, 100);
  setTimeout(() => {
    if (document.title === 'Sunset Cover Studio') {
      setStatus('SELFTEST_TIMEOUT');
      document.title = 'SELFTEST_TIMEOUT';
    }
  }, 20000);
}

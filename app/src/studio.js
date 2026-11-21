// studio.js — the editor wiring for Neon Harbor Cover Studio.
//
// panels.js knows how to draw a cover; this file knows how a person makes
// one: adding their own photos, pointing panels at photos, dragging a
// photo around inside its panel, choosing a layout, a grade and a post
// size, and exporting the finished PNG. The preview and the export run
// through the same drawCover call, so what you see is the file you get.

import { LAYOUTS, THEMES, drawCover, panelAt } from './panels.js';
import { runShot } from './shots.js';

/** The built-in sample set: generated for this studio, free to play with. */
const SAMPLE_DEFS = {
  hero: { file: 'hero.jpg', label: 'Coral Blazer', ox: 0.1, oy: 0 },
  boat: { file: 'boat.jpg', label: 'Marina Blue Hour', ox: -0.05, oy: 0 },
  deco: { file: 'deco.jpg', label: 'Deco Skyline', ox: 0, oy: 0 },
  boulevard: { file: 'boulevard.jpg', label: 'The Boulevard', ox: 0, oy: 0 },
  pier: { file: 'pier.jpg', label: 'The Pier', ox: 0, oy: 0 },
};

const EXPORT_SIZES = ['1080x1080', '1080x1350', '1920x1080'];

const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');
const statusLine = document.getElementById('statusLine');

const state = {
  layout: 'hero',
  theme: 'sunset',
  title: 'NEON HARBOR',
  tagline: 'SUNSET SYNDICATE',
  photos: [],
  panelPhoto: [0, 1, 2, 3],
  highlight: 0,
};
let selectedPanel = 0;
const loadedSamples = new Set();

/** Load an image from a URL, resolving once it can be drawn. */
function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function setStatus(text) {
  statusLine.textContent = text;
}

/** The photo the selected panel currently shows, or null. */
function selectedPhoto() {
  if (!state.photos.length) return null;
  return state.photos[state.panelPhoto[selectedPanel] % state.photos.length] || null;
}

/** Redraw the preview from the current state. */
function redraw() {
  drawCover(ctx, canvas.width, canvas.height, state);
}

/** Keep every panel pointed at a photo that exists. */
function clampPanels() {
  const n = Math.max(1, state.photos.length);
  state.panelPhoto = state.panelPhoto.map((p, i) => ((p ?? i) % n + n) % n);
}

/** Load sample photos by their short names, skipping ones already in. */
async function loadSamplePhotos(names) {
  for (const name of names) {
    const def = SAMPLE_DEFS[name];
    if (!def || loadedSamples.has(name)) continue;
    const img = await loadImage(`samples/${def.file}`);
    state.photos.push({ img, name: def.label, zoom: 1, ox: def.ox, oy: def.oy });
    loadedSamples.add(name);
  }
  clampPanels();
  buildPanelList();
}

/** Add the person's own photos from a file input's FileList. */
async function addUserPhotos(files) {
  for (const file of files) {
    const img = await loadImage(URL.createObjectURL(file));
    state.photos.push({ img, name: file.name.replace(/\.[^.]+$/, ''), zoom: 1, ox: 0, oy: 0 });
  }
  clampPanels();
  buildPanelList();
  redraw();
  setStatus(`${state.photos.length} photo${state.photos.length === 1 ? '' : 's'} in the studio. Click a panel, drag to frame it.`);
}

/** Rebuild the panel list: one row per panel, its photo, and a swap button. */
function buildPanelList() {
  const list = document.getElementById('panelList');
  list.innerHTML = '';
  const panels = LAYOUTS[state.layout].panels;
  panels.forEach((_, i) => {
    const row = document.createElement('div');
    row.className = 'panel-row' + (i === selectedPanel ? ' active' : '');
    const pick = document.createElement('button');
    pick.type = 'button';
    pick.className = 'panel-pick';
    const photo = state.photos[state.panelPhoto[i] % Math.max(1, state.photos.length)];
    pick.textContent = `Panel ${i + 1} · ${photo ? photo.name : 'Empty'}`;
    pick.addEventListener('click', () => selectPanel(i));
    const swap = document.createElement('button');
    swap.type = 'button';
    swap.className = 'panel-swap';
    swap.textContent = 'Swap photo';
    swap.addEventListener('click', () => {
      if (!state.photos.length) return;
      state.panelPhoto[i] = (state.panelPhoto[i] + 1) % state.photos.length;
      selectPanel(i);
    });
    row.append(pick, swap);
    list.append(row);
  });
}

/** Select a panel: highlight it, and point the framing sliders at its photo. */
function selectPanel(i) {
  selectedPanel = i;
  state.highlight = i;
  syncFramingControls();
  buildPanelList();
  redraw();
}

/** Push the selected photo's zoom and offsets into the framing sliders. */
function syncFramingControls() {
  const photo = selectedPhoto();
  document.getElementById('zoomRange').value = photo ? photo.zoom : 1;
  document.getElementById('oxRange').value = photo ? photo.ox : 0;
  document.getElementById('oyRange').value = photo ? photo.oy : 0;
  document.getElementById('framingNote').textContent = photo
    ? `Framing panel ${selectedPanel + 1}'s photo — drag the cover or use the sliders.`
    : 'Add a photo to start framing.';
}

/** Push the whole state into the controls (used after a shot scene loads). */
function syncControls() {
  document.getElementById('layoutSel').value = state.layout;
  document.getElementById('themeSel').value = state.theme;
  document.getElementById('titleText').value = state.title;
  document.getElementById('taglineText').value = state.tagline;
  syncFramingControls();
  buildPanelList();
}

/** Apply a partial patch to the state (shot scenes use this). */
function setPatch(patch) {
  Object.assign(state, patch);
  clampPanels();
}

/** Render the cover at the chosen export size and download it as a PNG. */
function exportPng() {
  const [w, h] = document.getElementById('sizeSel').value.split('x').map(Number);
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  drawCover(out.getContext('2d'), w, h, { ...state, highlight: -1 });
  out.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `neon-harbor-cover-${w}x${h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    setStatus(`Saved neon-harbor-cover-${w}x${h}.png — post it anywhere.`);
  }, 'image/png');
}

/** Fill a select with [value, label] pairs. */
function fillSelect(id, pairs) {
  const sel = document.getElementById(id);
  for (const [value, label] of pairs) {
    const opt = document.createElement('option');
    opt.value = value;
    opt.textContent = label;
    sel.append(opt);
  }
  return sel;
}

function wireControls() {
  fillSelect('layoutSel', Object.entries(LAYOUTS).map(([k, v]) => [k, v.label]));
  fillSelect('themeSel', Object.entries(THEMES).map(([k, v]) => [k, v.label]));
  fillSelect('sizeSel', EXPORT_SIZES.map((s) => [s, s.replace('x', ' × ')]));
  document.getElementById('layoutSel').value = state.layout;
  document.getElementById('themeSel').value = state.theme;
  document.getElementById('sizeSel').value = '1080x1080';

  document.getElementById('photoFiles').addEventListener('change', async (e) => {
    if (e.target.files.length) await addUserPhotos(e.target.files);
    e.target.value = '';
  });
  document.getElementById('loadSamples').addEventListener('click', async () => {
    await loadSamplePhotos(Object.keys(SAMPLE_DEFS));
    redraw();
    setStatus('Sample set loaded. Swap any panel photo, or add your own.');
  });
  document.getElementById('clearPhotos').addEventListener('click', () => {
    state.photos = [];
    loadedSamples.clear();
    clampPanels();
    buildPanelList();
    syncFramingControls();
    redraw();
    setStatus('Cleared. Add your own photos to build a cover.');
  });

  const sampleRow = document.getElementById('sampleRow');
  for (const [key, def] of Object.entries(SAMPLE_DEFS)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.textContent = def.label;
    b.addEventListener('click', async () => {
      await loadSamplePhotos([key]);
      redraw();
    });
    sampleRow.append(b);
  }

  document.getElementById('layoutSel').addEventListener('change', (e) => {
    state.layout = e.target.value;
    buildPanelList();
    redraw();
  });
  document.getElementById('themeSel').addEventListener('change', (e) => {
    state.theme = e.target.value;
    redraw();
  });
  document.getElementById('sizeSel').addEventListener('change', (e) => {
    const [w, h] = e.target.value.split('x').map(Number);
    canvas.width = w;
    canvas.height = h;
    redraw();
  });
  document.getElementById('titleText').addEventListener('input', (e) => {
    state.title = e.target.value;
    redraw();
  });
  document.getElementById('taglineText').addEventListener('input', (e) => {
    state.tagline = e.target.value;
    redraw();
  });

  const framing = (id, key) => {
    document.getElementById(id).addEventListener('input', (e) => {
      const photo = selectedPhoto();
      if (!photo) return;
      photo[key] = Number(e.target.value);
      redraw();
    });
  };
  framing('zoomRange', 'zoom');
  framing('oxRange', 'ox');
  framing('oyRange', 'oy');

  document.getElementById('exportBtn').addEventListener('click', exportPng);

  // Drag on the cover: press selects the panel under the pointer, moving
  // pans that panel's photo inside its frame.
  let drag = null;
  canvas.addEventListener('pointerdown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
    const hit = panelAt(state.layout, canvas.width, canvas.height, x, y);
    if (hit < 0) return;
    selectPanel(hit);
    const photo = selectedPhoto();
    if (!photo) return;
    drag = { startX: e.clientX, startY: e.clientY, ox: photo.ox, oy: photo.oy, rect };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const photo = selectedPhoto();
    if (!photo) return;
    photo.ox = Math.max(-1, Math.min(1, drag.ox + ((e.clientX - drag.startX) / drag.rect.width) * 1.6));
    photo.oy = Math.max(-1, Math.min(1, drag.oy + ((e.clientY - drag.startY) / drag.rect.height) * 1.6));
    syncFramingControls();
    redraw();
  });
  const endDrag = () => { drag = null; };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
}

const editor = { canvas, loadSamplePhotos, setPatch, syncControls, redraw };
wireControls();
syncControls();
redraw();

const shotRan = await runShot(editor);
if (!shotRan) {
  await loadSamplePhotos(['hero', 'boat', 'deco', 'boulevard']);
  syncControls();
  redraw();
  setStatus('Sample set loaded. Add your own photos, swap panels, make it yours.');
}

// studio.js — Neon Harbor Cover Studio editor logic.
// Owns the state, wires every control, handles photo loading, canvas
// selection/dragging, and PNG export at the exact chosen size.
import { draw, getPanels, hitTestPanel, LAYOUTS, THEMES } from './panels.js';

export const SAMPLES = [
  { name: 'hero', src: 'samples/hero.jpg', label: 'Hero — coral suit & convertible' },
  { name: 'boat', src: 'samples/boat.jpg', label: 'Boat — pier at blue hour' },
  { name: 'deco', src: 'samples/deco.jpg', label: 'Deco — pastel skyline art' },
  { name: 'boulevard', src: 'samples/boulevard.jpg', label: 'Boulevard — kit sample' },
  { name: 'pier', src: 'samples/pier.jpg', label: 'Pier — kit sample' },
];

export const EXPORT_SIZES = [
  { id: '1080x1080', w: 1080, h: 1080, label: 'Square — 1080 × 1080' },
  { id: '1080x1350', w: 1080, h: 1350, label: 'Portrait — 1080 × 1350' },
  { id: '1920x1080', w: 1920, h: 1080, label: 'Wide — 1920 × 1080' },
];

const defaultPanel = (i) => ({ photo: i, zoom: 1, ox: 0, oy: 0 });

export const state = {
  layout: 'hero',
  theme: 'sunset',
  title: 'NEON HARBOR',
  tagline: 'SUNSET SYNDICATE',
  size: '1080x1080',
  photos: [], // [{ img, name }]
  panels: [defaultPanel(0), defaultPanel(1), defaultPanel(2), defaultPanel(3)],
  selected: 0,
};

export const els = {};
function grab(id) { els[id] = document.getElementById(id); return els[id]; }

function setStatus(msg) {
  if (els.status) els.status.textContent = msg;
}

export function renderState(showSelection) {
  return {
    layout: state.layout,
    theme: state.theme,
    title: state.title,
    tagline: state.tagline,
    photos: state.photos.map((p) => p.img),
    panels: state.panels,
    selected: state.selected,
    showSelection,
  };
}

export function redraw() {
  const canvas = els.canvas;
  if (!canvas) return;
  draw(canvas, renderState(true));
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Loads the built-in sample set (used on startup so the preview is
// never empty, and by the "Load sample set" button).
export async function loadSampleSet() {
  const loaded = [];
  for (const s of SAMPLES) {
    try {
      const img = await loadImage(s.src);
      loaded.push({ img, name: s.name });
    } catch (e) { /* skip a missing sample, keep the rest */ }
  }
  if (loaded.length) {
    state.photos = loaded;
    state.panels = loaded.map((_, i) => defaultPanel(Math.min(i, loaded.length - 1))).slice(0, 4);
    while (state.panels.length < 4) state.panels.push(defaultPanel(0));
    state.panels.forEach((p, i) => { p.photo = i % loaded.length; });
    state.selected = 0;
  }
  syncPanelList();
  syncSliders();
  redraw();
  setStatus(loaded.length
    ? `Sample set loaded — ${loaded.length} photos across ${state.panels.length} panels. Click a panel, then drag its photo.`
    : 'Sample photos could not be loaded. Add your own photos to begin.');
  return loaded.length;
}

// Loads a specific ordered list of sample names (screenshot scenes).
export async function loadSamplesByNames(names) {
  const loaded = [];
  for (const name of names) {
    const s = SAMPLES.find((x) => x.name === name);
    if (!s) continue;
    try {
      const img = await loadImage(s.src);
      loaded.push({ img, name: s.name });
    } catch (e) { /* keep going */ }
  }
  if (loaded.length) {
    state.photos = loaded;
    state.panels = [0, 1, 2, 3].map((i) => defaultPanel(i % loaded.length));
    state.selected = 0;
  }
  syncPanelList();
  syncSliders();
  redraw();
  return loaded.length;
}

async function addUserFiles(fileList) {
  const files = Array.from(fileList || []);
  if (!files.length) return;
  let added = 0;
  for (const file of files) {
    const url = URL.createObjectURL(file);
    try {
      const img = await loadImage(url);
      state.photos.push({ img, name: file.name });
      added++;
    } catch (e) { /* not a readable image */ }
  }
  // Hand fresh photos to panels that are still sharing one.
  if (added) {
    let cursor = state.photos.length - added;
    for (const p of state.panels) {
      if (cursor >= state.photos.length) break;
      if (state.panels.filter((q) => q.photo === p.photo).length > 1 || added === state.photos.length) {
        p.photo = cursor++;
      }
    }
  }
  syncPanelList();
  redraw();
  setStatus(added
    ? `Added ${added} photo${added === 1 ? '' : 's'} — ${state.photos.length} in the studio now.`
    : 'Those files could not be read as images.');
}

// ------------------------------------------------------------- panel list
export function syncPanelList() {
  const list = els.panelList;
  if (!list) return;
  list.innerHTML = '';
  state.panels.forEach((p, i) => {
    const row = document.createElement('div');
    row.className = 'panel-row' + (i === state.selected ? ' is-selected' : '');

    const pick = document.createElement('button');
    pick.type = 'button';
    pick.className = 'panel-pick';
    const photoName = state.photos[p.photo] ? state.photos[p.photo].name : 'none';
    pick.textContent = `Panel ${i + 1} · ${photoName}`;
    pick.addEventListener('click', () => {
      state.selected = i;
      syncPanelList();
      syncSliders();
      redraw();
    });

    const swap = document.createElement('button');
    swap.type = 'button';
    swap.className = 'panel-swap';
    swap.textContent = 'Swap photo';
    swap.title = 'Give this panel the next photo';
    swap.addEventListener('click', () => {
      if (!state.photos.length) return;
      p.photo = (p.photo + 1) % state.photos.length;
      state.selected = i;
      syncPanelList();
      syncSliders();
      redraw();
      setStatus(`Panel ${i + 1} now shows ${state.photos[p.photo].name}.`);
    });

    row.appendChild(pick);
    row.appendChild(swap);
    list.appendChild(row);
  });
  if (els.photoCount) {
    els.photoCount.textContent = state.photos.length
      ? state.photos.map((p, i) => `${i + 1}. ${p.name}`).join('  ·  ')
      : 'No photos yet.';
  }
}

// ---------------------------------------------------------------- sliders
export function syncSliders() {
  const p = state.panels[state.selected];
  if (!p) return;
  if (els.zoom) els.zoom.value = String(p.zoom);
  if (els.offsetX) els.offsetX.value = String(p.ox);
  if (els.offsetY) els.offsetY.value = String(p.oy);
  if (els.selectedLabel) els.selectedLabel.textContent = `Editing panel ${state.selected + 1}`;
}

function bindSlider(el, key, parse) {
  if (!el) return;
  el.addEventListener('input', () => {
    const p = state.panels[state.selected];
    if (!p) return;
    p[key] = parse(el.value);
    redraw();
  });
}

// ----------------------------------------------------------------- canvas
function canvasPoint(evt) {
  const rect = els.canvas.getBoundingClientRect();
  return {
    x: ((evt.clientX - rect.left) / rect.width) * els.canvas.width,
    y: ((evt.clientY - rect.top) / rect.height) * els.canvas.height,
    rect,
  };
}

function bindCanvas() {
  const canvas = els.canvas;
  let drag = null;
  canvas.addEventListener('pointerdown', (evt) => {
    const pt = canvasPoint(evt);
    const hit = hitTestPanel(state.layout, canvas.width, canvas.height, pt.x, pt.y);
    if (hit >= 0) {
      state.selected = hit;
      syncPanelList();
      syncSliders();
    }
    drag = { x: evt.clientX, y: evt.clientY };
    canvas.setPointerCapture(evt.pointerId);
    redraw();
  });
  canvas.addEventListener('pointermove', (evt) => {
    if (!drag) return;
    const p = state.panels[state.selected];
    if (!p) return;
    const rect = canvas.getBoundingClientRect();
    const dx = (evt.clientX - drag.x) / rect.width;
    const dy = (evt.clientY - drag.y) / rect.height;
    drag = { x: evt.clientX, y: evt.clientY };
    p.ox = Math.max(-1, Math.min(1, p.ox + dx * 2.2));
    p.oy = Math.max(-1, Math.min(1, p.oy + dy * 2.2));
    syncSliders();
    redraw();
  });
  const end = () => { drag = null; };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
}

// ----------------------------------------------------------------- export
export function sizeById(id) {
  return EXPORT_SIZES.find((s) => s.id === id) || EXPORT_SIZES[0];
}

function applyCanvasSize() {
  const s = sizeById(state.size);
  els.canvas.width = s.w;
  els.canvas.height = s.h;
}

export function exportPng() {
  const s = sizeById(state.size);
  const off = document.createElement('canvas');
  off.width = s.w;
  off.height = s.h;
  draw(off, renderState(false));
  off.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'neon-harbor-cover.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    setStatus(`Exported neon-harbor-cover.png at ${s.w} × ${s.h}.`);
  }, 'image/png');
}

// ------------------------------------------------------------- scene hook
// Used by shots.js to stage a deterministic screenshot scene.
export async function applyScene(scene) {
  if (scene.layout && LAYOUTS.some((l) => l.id === scene.layout)) state.layout = scene.layout;
  if (scene.theme && THEMES[scene.theme]) state.theme = scene.theme;
  if (typeof scene.title === 'string') state.title = scene.title;
  if (typeof scene.tagline === 'string') state.tagline = scene.tagline;
  if (scene.size && sizeById(scene.size).id === scene.size) state.size = scene.size;
  if (els.layout) els.layout.value = state.layout;
  if (els.theme) els.theme.value = state.theme;
  if (els.size) els.size.value = state.size;
  if (els.title) els.title.value = state.title;
  if (els.tagline) els.tagline.value = state.tagline;
  if (scene.photos && scene.photos.length) await loadSamplesByNames(scene.photos);
  applyCanvasSize();
  redraw();
}

// -------------------------------------------------------------------- init
function fillSelect(el, items, getValue, getLabel) {
  if (!el) return;
  el.innerHTML = '';
  for (const item of items) {
    const opt = document.createElement('option');
    opt.value = getValue(item);
    opt.textContent = getLabel(item);
    el.appendChild(opt);
  }
}

function init() {
  ['canvas', 'status', 'fileInput', 'loadSamples', 'panelList', 'photoCount',
    'layout', 'theme', 'size', 'title', 'tagline', 'zoom', 'offsetX', 'offsetY',
    'selectedLabel', 'exportBtn'].forEach(grab);

  fillSelect(els.layout, LAYOUTS, (l) => l.id, (l) => l.label);
  fillSelect(els.theme, Object.entries(THEMES).map(([id, t]) => ({ id, ...t })), (t) => t.id, (t) => t.label);
  fillSelect(els.size, EXPORT_SIZES, (s) => s.id, (s) => s.label);
  els.layout.value = state.layout;
  els.theme.value = state.theme;
  els.size.value = state.size;
  els.title.value = state.title;
  els.tagline.value = state.tagline;

  els.fileInput.addEventListener('change', () => {
    addUserFiles(els.fileInput.files);
    els.fileInput.value = '';
  });
  els.loadSamples.addEventListener('click', () => loadSampleSet());
  els.layout.addEventListener('change', () => { state.layout = els.layout.value; redraw(); });
  els.theme.addEventListener('change', () => { state.theme = els.theme.value; redraw(); });
  els.size.addEventListener('change', () => { state.size = els.size.value; applyCanvasSize(); redraw(); });
  els.title.addEventListener('input', () => { state.title = els.title.value; redraw(); });
  els.tagline.addEventListener('input', () => { state.tagline = els.tagline.value; redraw(); });
  els.exportBtn.addEventListener('click', exportPng);

  bindSlider(els.zoom, 'zoom', (v) => parseFloat(v));
  bindSlider(els.offsetX, 'ox', (v) => parseFloat(v));
  bindSlider(els.offsetY, 'oy', (v) => parseFloat(v));
  bindCanvas();

  applyCanvasSize();
  syncPanelList();
  syncSliders();
  redraw(); // placeholder panels render immediately; samples replace them

  // Screenshot staging lives in shots.js and only activates with ?shot=.
  // In shot mode the scene loader owns photo loading — starting the
  // default sample load here as well would race it and overwrite the
  // staged panel assignments nondeterministically.
  if (new URLSearchParams(window.location.search).has('shot')) {
    import('./shots.js').catch(() => { /* editor still works without it */ });
  } else {
    loadSampleSet();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

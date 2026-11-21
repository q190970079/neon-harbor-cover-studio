// Neon Harbor Cover Studio — the editor's wiring.
// Owns the state, loads the visitor's photos from their own machine (they are read with
// URL.createObjectURL and never leave it), wires every control, keeps the live preview
// painted, and exports the cover as a PNG at the chosen post size. A ?shot= query hands
// the page to ./shots.js instead, which builds one fixed scene for a screenshot.
import { drawCover, panelsFor, panelAt, LAYOUTS, THEMES } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const status = document.getElementById('status');
const titleInput = document.getElementById('title');
const taglineInput = document.getElementById('tagline');
const layoutSelect = document.getElementById('layout');
const themeSelect = document.getElementById('theme');
const sizeSelect = document.getElementById('size');
const zoomInput = document.getElementById('zoom');
const oxInput = document.getElementById('ox');
const oyInput = document.getElementById('oy');
const panelList = document.getElementById('panels');
const sampleRow = document.getElementById('samples');

const SAMPLES = [
  { name: 'heroine', label: 'Pink Blazer' },
  { name: 'chase', label: 'Marina Chase' },
  { name: 'skyline', label: 'Deco Skyline' },
  { name: 'boulevard', label: 'Boulevard' },
  { name: 'pier', label: 'The Pier' },
];

const state = {
  photos: [],
  panelPhoto: [],
  layout: 'syndicate',
  theme: 'sunset',
  title: 'NEON HARBOR',
  tagline: 'SUNSET SYNDICATE',
  selected: 0,
};

function say(message) {
  status.textContent = message;
}

/** Loads an image from a URL, resolving to the image once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/** A fresh photo slot with a gentle preset framing; i varies it so panels differ. */
function makePhoto(img, i = 0) {
  const presets = [
    { zoom: 1.05, ox: 0, oy: -0.02 },
    { zoom: 1.06, ox: -0.02, oy: 0.1 },
    { zoom: 1.1, ox: 0.03, oy: -0.04 },
    { zoom: 1.02, ox: 0, oy: 0.28 },
  ];
  return { img, ...presets[i % presets.length] };
}

/** Keeps panelPhoto the same length as the layout's panel count, cycling the photos. */
function syncPanelAssignments() {
  const count = panelsFor(state.layout).length;
  const next = [];
  for (let i = 0; i < count; i++) {
    next.push(state.panelPhoto[i] ?? (state.photos.length ? i % state.photos.length : 0));
  }
  state.panelPhoto = next;
  if (state.selected >= count) state.selected = 0;
}

/** The photo the selected panel shows (the one the sliders and dragging adjust). */
function selectedPhoto() {
  if (!state.photos.length) return null;
  const index = state.panelPhoto[state.selected] ?? 0;
  return state.photos[index % state.photos.length];
}

function redraw() {
  syncPanelAssignments();
  drawCover(canvas, state);
  buildPanelList();
  syncSliders();
}

/** Rebuilds the panel list: one row per panel, naming its photo, with a cycle button. */
function buildPanelList() {
  panelList.innerHTML = '';
  panelsFor(state.layout).forEach((_, i) => {
    const row = document.createElement('div');
    row.className = 'panel-row' + (i === state.selected ? ' active' : '');
    const pick = document.createElement('button');
    pick.type = 'button';
    pick.className = 'panel-pick';
    const photoIndex = state.panelPhoto[i] ?? 0;
    pick.textContent = state.photos.length
      ? `Panel ${i + 1} · Photo ${(photoIndex % state.photos.length) + 1}`
      : `Panel ${i + 1} · Empty`;
    pick.addEventListener('click', () => {
      state.selected = i;
      redraw();
      say(`Panel ${i + 1} selected — drag the cover or use the sliders to frame it.`);
    });
    const cycle = document.createElement('button');
    cycle.type = 'button';
    cycle.className = 'panel-cycle';
    cycle.textContent = 'Swap photo';
    cycle.addEventListener('click', () => {
      if (!state.photos.length) return;
      state.selected = i;
      state.panelPhoto[i] = ((state.panelPhoto[i] ?? 0) + 1) % state.photos.length;
      redraw();
      say(`Panel ${i + 1} now shows photo ${state.panelPhoto[i] + 1}.`);
    });
    row.append(pick, cycle);
    panelList.append(row);
  });
}

/** Points the framing sliders at the selected panel's photo. */
function syncSliders() {
  const photo = selectedPhoto();
  const on = Boolean(photo);
  for (const input of [zoomInput, oxInput, oyInput]) input.disabled = !on;
  if (!photo) return;
  zoomInput.value = String(Math.round((photo.zoom || 1) * 100));
  oxInput.value = String(Math.round((photo.ox || 0) * 100));
  oyInput.value = String(Math.round((photo.oy || 0) * 100));
}

function fillSelect(select, entries) {
  for (const [value, label] of entries) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    select.append(option);
  }
}

fillSelect(layoutSelect, Object.entries(LAYOUTS).map(([k, v]) => [k, v.label]));
fillSelect(themeSelect, Object.entries(THEMES).map(([k, v]) => [k, v.label]));
layoutSelect.value = state.layout;
themeSelect.value = state.theme;

titleInput.addEventListener('input', () => { state.title = titleInput.value; redraw(); });
taglineInput.addEventListener('input', () => { state.tagline = taglineInput.value; redraw(); });
layoutSelect.addEventListener('change', () => {
  state.layout = layoutSelect.value;
  state.selected = 0;
  redraw();
  say(`${LAYOUTS[state.layout].label}: ${panelsFor(state.layout).length} panels. Click a panel to frame its photo.`);
});
themeSelect.addEventListener('change', () => {
  state.theme = themeSelect.value;
  redraw();
  say(`${THEMES[state.theme].label} grade applied to every panel.`);
});

zoomInput.addEventListener('input', () => {
  const photo = selectedPhoto();
  if (!photo) return;
  photo.zoom = Number(zoomInput.value) / 100;
  redraw();
});
oxInput.addEventListener('input', () => {
  const photo = selectedPhoto();
  if (!photo) return;
  photo.ox = Number(oxInput.value) / 100;
  redraw();
});
oyInput.addEventListener('input', () => {
  const photo = selectedPhoto();
  if (!photo) return;
  photo.oy = Number(oyInput.value) / 100;
  redraw();
});

document.getElementById('add-photos').addEventListener('change', async (e) => {
  const files = [...e.target.files];
  if (!files.length) return;
  for (const file of files) {
    const img = await loadImage(URL.createObjectURL(file));
    state.photos.push(makePhoto(img, state.photos.length));
  }
  syncPanelAssignments();
  redraw();
  say(`${files.length} photo${files.length > 1 ? 's' : ''} added — ${state.photos.length} in the studio. Panels cycle through them; swap any panel's photo from the panel list.`);
  e.target.value = '';
});

document.getElementById('clear-photos').addEventListener('click', () => {
  state.photos = [];
  state.panelPhoto = [];
  redraw();
  say('Photos cleared. Add your own, or load a sample set.');
});

/** Loads one bundled sample photo by name and appends it to the studio. */
async function addSample(name) {
  const img = await loadImage(`samples/${name}.jpg`);
  state.photos.push(makePhoto(img, state.photos.length));
}

for (const sample of SAMPLES) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'sample-btn';
  button.textContent = sample.label;
  button.addEventListener('click', async () => {
    await addSample(sample.name);
    syncPanelAssignments();
    redraw();
    say(`Sample “${sample.label}” loaded. It is yours to remix — or add your own photos.`);
  });
  sampleRow.append(button);
}

document.getElementById('load-samples').addEventListener('click', async () => {
  state.photos = [];
  for (const sample of SAMPLES.slice(0, 4)) await addSample(sample.name);
  state.panelPhoto = [];
  syncPanelAssignments();
  redraw();
  say('Sample set loaded: four harbour photos across the panels. Click a panel and drag to reframe it.');
});

// Clicking the cover selects the panel under the pointer; dragging pans its photo.
let drag = null;
canvas.addEventListener('pointerdown', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) / rect.width;
  const y = (e.clientY - rect.top) / rect.height;
  const panel = panelAt(state.layout, x, y);
  if (panel >= 0) state.selected = panel;
  drag = { x: e.clientX, y: e.clientY };
  canvas.setPointerCapture(e.pointerId);
  redraw();
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const photo = selectedPhoto();
  if (!photo) return;
  const rect = canvas.getBoundingClientRect();
  photo.ox = Math.max(-0.5, Math.min(0.5, (photo.ox || 0) + (e.clientX - drag.x) / rect.width));
  photo.oy = Math.max(-0.5, Math.min(0.5, (photo.oy || 0) + (e.clientY - drag.y) / rect.height));
  drag = { x: e.clientX, y: e.clientY };
  redraw();
});
canvas.addEventListener('pointerup', () => { drag = null; });
canvas.addEventListener('pointercancel', () => { drag = null; });

document.getElementById('export').addEventListener('click', () => {
  const [w, h] = sizeSelect.value.split('x').map(Number);
  const offscreen = document.createElement('canvas');
  offscreen.width = w;
  offscreen.height = h;
  drawCover(offscreen, { ...state, selected: -1 });
  offscreen.toBlob((blob) => {
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `neon-harbor-cover-${w}x${h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    say(`Saved neon-harbor-cover-${w}x${h}.png — post it anywhere.`);
  }, 'image/png');
});

/** Screenshot scenes (./shots.js): load named samples, then apply the scene wholesale. */
const shotHelpers = {
  async loadSamples(names) {
    const photos = [];
    for (const name of names) {
      const img = await loadImage(`samples/${name}.jpg`);
      photos.push(makePhoto(img, photos.length));
    }
    return photos;
  },
  applyScene(shot, scene, photos) {
    state.photos = photos;
    state.panelPhoto = photos.map((_, i) => i);
    state.layout = scene.layout;
    state.theme = scene.theme;
    state.title = scene.title;
    state.tagline = scene.tagline;
    state.selected = shot === 'cover' ? -1 : 0;
    titleInput.value = scene.title;
    taglineInput.value = scene.tagline;
    layoutSelect.value = scene.layout;
    themeSelect.value = scene.theme;
    if (shot === 'cover') {
      const [w, h] = scene.size.split('x').map(Number);
      canvas.width = w || 1080;
      canvas.height = h || 1080;
      sizeSelect.value = scene.size;
    }
    redraw();
    if (shot === 'cover') drawCover(canvas, { ...state, selected: -1 });
  },
};

const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  runShot(shot, new URLSearchParams(location.search), shotHelpers);
} else {
  // Open on the sample set, so the first thing a visitor sees is a finished cover.
  (async () => {
    for (const sample of SAMPLES.slice(0, 4)) await addSample(sample.name);
    syncPanelAssignments();
    redraw();
    say('Four sample photos loaded. Add your own photos, pick a layout and a grade, then export your PNG.');
  })();
}

// Neon Harbor Cover Studio - editor logic.
import { draw, hitTestPanel, LAYOUTS, THEMES } from './panels.js';
import { initShots } from './shots.js';

const $ = (id) => document.getElementById(id);
const canvas = $('preview');
const SAMPLES = ['hero.jpg', 'boat.jpg', 'boulevard.jpg', 'pier.jpg', 'deco.jpg'];
const SIZES = { '1080x1080': [1080, 1080], '1080x1350': [1080, 1350], '1920x1080': [1920, 1080] };

const state = {
  layout: 'hero', theme: 'sunset',
  title: 'NEON HARBOR', tagline: 'SUNSET SYNDICATE',
  photos: [],            // {img, name, scale, ox, oy}
  panelPhotos: [0, 1, 2, 3],
  selected: 0, selectedPhoto: 0,
  exportW: 1080, exportH: 1080, showSelection: true,
};

function setStatus(msg) { const el = $('status'); if (el) el.textContent = msg; }

function loadImage(src, name) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ img, name, scale: 1, ox: 0, oy: 0 });
    img.onerror = reject;
    img.src = src;
  });
}

async function loadSamples(names, assignPanels) {
  const loaded = [];
  for (const n of names) {
    try { loaded.push(await loadImage('./samples/' + n, n)); } catch (e) { /* skip missing */ }
  }
  if (!loaded.length) return;
  state.photos = loaded;
  if (assignPanels) state.panelPhotos = loaded.map((_, i) => i % loaded.length).concat([0, 1, 2, 3]).slice(0, 4);
  state.selectedPhoto = 0;
  renderPhotoList(); renderPanelList(); syncSliders(); redraw();
  setStatus(loaded.length + ' photo(s) loaded. Click a panel, then drag on the cover to reframe it.');
}

function redraw() { draw(canvas, state); }

function renderPhotoList() {
  const box = $('photoList'); box.innerHTML = '';
  state.photos.forEach((p, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'chip' + (i === state.selectedPhoto ? ' on' : '');
    b.textContent = (i + 1) + '. ' + p.name;
    b.onclick = () => { state.selectedPhoto = i; syncSliders(); renderPhotoList(); };
    box.appendChild(b);
  });
}

function renderPanelList() {
  const box = $('panelList'); box.innerHTML = '';
  for (let i = 0; i < 4; i++) {
    const row = document.createElement('div'); row.className = 'panel-row' + (i === state.selected ? ' on' : '');
    const label = document.createElement('span'); label.textContent = 'Panel ' + (i + 1);
    const cur = document.createElement('span'); cur.className = 'cur';
    const pi = state.panelPhotos[i];
    cur.textContent = state.photos[pi] ? state.photos[pi].name : 'gradient';
    const prev = document.createElement('button'); prev.type = 'button'; prev.textContent = '<';
    const next = document.createElement('button'); next.type = 'button'; next.textContent = '>';
    const cycle = (d) => {
      if (!state.photos.length) return;
      state.panelPhotos[i] = ((state.panelPhotos[i] || 0) + d + state.photos.length) % state.photos.length;
      state.selected = i; renderPanelList(); redraw();
    };
    prev.onclick = () => cycle(-1); next.onclick = () => cycle(1);
    label.onclick = () => { state.selected = i; renderPanelList(); redraw(); };
    row.append(label, cur, prev, next);
    box.appendChild(row);
  }
}

function syncSliders() {
  const p = state.photos[state.selectedPhoto];
  if (!p) return;
  $('scaleRange').value = p.scale; $('oxRange').value = p.ox; $('oyRange').value = p.oy;
}

function syncControls() {
  $('layoutSel').value = state.layout; $('themeSel').value = state.theme;
  $('titleInput').value = state.title; $('taglineInput').value = state.tagline;
  $('sizeSel').value = state.exportW + 'x' + state.exportH;
  renderPhotoList(); renderPanelList(); syncSliders();
}

// --- wiring ---
$('fileInput').addEventListener('change', async (e) => {
  const files = [...e.target.files];
  for (const f of files) {
    try { state.photos.push(await loadImage(URL.createObjectURL(f), f.name)); } catch (err) {}
  }
  renderPhotoList(); renderPanelList(); redraw();
  setStatus(state.photos.length + ' photo(s) loaded.');
});
$('sampleBtn').addEventListener('click', () => loadSamples(SAMPLES, true));
$('layoutSel').addEventListener('change', (e) => { state.layout = e.target.value; redraw(); });
$('themeSel').addEventListener('change', (e) => { state.theme = e.target.value; redraw(); });
$('sizeSel').addEventListener('change', (e) => { const [w, h] = SIZES[e.target.value]; state.exportW = w; state.exportH = h; });
$('titleInput').addEventListener('input', (e) => { state.title = e.target.value; redraw(); });
$('taglineInput').addEventListener('input', (e) => { state.tagline = e.target.value; redraw(); });
for (const [id, key] of [['scaleRange', 'scale'], ['oxRange', 'ox'], ['oyRange', 'oy']]) {
  $(id).addEventListener('input', (e) => {
    const p = state.photos[state.selectedPhoto]; if (!p) return;
    p[key] = parseFloat(e.target.value); redraw();
  });
}
$('exportBtn').addEventListener('click', () => {
  const off = document.createElement('canvas');
  off.width = state.exportW; off.height = state.exportH;
  draw(off, { ...state, showSelection: false });
  const a = document.createElement('a');
  a.download = 'neon-harbor-cover-' + off.width + 'x' + off.height + '.png';
  a.href = off.toDataURL('image/png');
  a.click();
  setStatus('Exported PNG ' + off.width + 'x' + off.height + '.');
});

// canvas select + drag pan
let drag = null;
function canvasPos(e) {
  const r = canvas.getBoundingClientRect();
  return { rx: (e.clientX - r.left) / r.width, ry: (e.clientY - r.top) / r.height };
}
canvas.addEventListener('pointerdown', (e) => {
  const { rx, ry } = canvasPos(e);
  const hit = hitTestPanel(rx, ry, state.layout);
  if (hit >= 0) { state.selected = hit; renderPanelList(); redraw(); }
  const p = state.photos[state.panelPhotos[state.selected]];
  drag = { x: e.clientX, y: e.clientY, photo: p };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag || !drag.photo) return;
  const r = canvas.getBoundingClientRect();
  drag.photo.ox = Math.max(-1, Math.min(1, drag.photo.ox + (e.clientX - drag.x) / r.width * 1.4));
  drag.photo.oy = Math.max(-1, Math.min(1, drag.photo.oy + (e.clientY - drag.y) / r.height * 1.4));
  drag.x = e.clientX; drag.y = e.clientY;
  if (state.photos[state.selectedPhoto] === drag.photo) syncSliders();
  redraw();
});
canvas.addEventListener('pointerup', () => { drag = null; });

const studio = { state, canvas, loadSamples, redraw, syncControls };
window.__studio = studio;

// Boot: shot scenes are loaded only by the scene loader (no race with preload).
(async () => {
  const isShot = new URLSearchParams(location.search).has('shot');
  if (isShot) { await initShots(studio); }
  else { await loadSamples(SAMPLES, true); }
  redraw();
})();

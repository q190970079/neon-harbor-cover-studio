// panels.js — Neon Harbor Cover Studio drawing engine.
// Pure canvas code: slanted multi-panel collage layouts, colour themes,
// stacked display type, vignette and seeded grain. No network, no assets
// beyond the photos the caller hands in.

// ---------------------------------------------------------------- layouts
// Each layout returns polygons in normalised 0..1 coordinates. The
// polygons tile the whole frame; neighbouring edges share the same slant
// so the collage reads as one cut-up photograph wall.
const LAYOUT_DEFS = {
  // One big hero panel on the left, three stacked panels on the right.
  hero: [
    [[0, 0], [0.62, 0], [0.55, 1], [0, 1]],
    [[0.62, 0], [1, 0], [1, 0.34], [0.585, 0.34]],
    [[0.585, 0.34], [1, 0.34], [1, 0.67], [0.568, 0.67]],
    [[0.568, 0.67], [1, 0.67], [1, 1], [0.55, 1]],
  ],
  // Four diagonal stripes leaning into the frame.
  stripes: [
    [[0, 0], [0.28, 0], [0.16, 1], [0, 1]],
    [[0.28, 0], [0.53, 0], [0.41, 1], [0.16, 1]],
    [[0.53, 0], [0.78, 0], [0.66, 1], [0.41, 1]],
    [[0.78, 0], [1, 0], [1, 1], [0.66, 1]],
  ],
  // A wide banner across the top, three panels underneath.
  banner: [
    [[0, 0], [1, 0], [1, 0.52], [0, 0.58]],
    [[0, 0.58], [0.36, 0.545], [0.33, 1], [0, 1]],
    [[0.36, 0.545], [0.68, 0.53], [0.66, 1], [0.33, 1]],
    [[0.68, 0.53], [1, 0.52], [1, 1], [0.66, 1]],
  ],
};

export const LAYOUTS = [
  { id: 'hero', label: 'Hero + Three' },
  { id: 'stripes', label: 'Slanted Stripes' },
  { id: 'banner', label: 'Banner + Three' },
];

// ----------------------------------------------------------------- themes
// overlay: diagonal wash stops. title: gradient stops for the big type.
// filter values are applied through ctx.filter while photos are drawn.
export const THEMES = {
  sunset: {
    label: 'Sunset — orange / pink / violet',
    overlay: ['rgba(255,122,40,0.30)', 'rgba(255,61,138,0.24)', 'rgba(84,36,164,0.34)'],
    saturation: 1.28,
    contrast: 1.08,
    title: ['#ffe27a', '#ff8a3c', '#ff3d8a'],
    gap: '#fff3e2',
    accent: '#ffb347',
  },
  neon: {
    label: 'Neon — cyan / magenta',
    overlay: ['rgba(0,229,255,0.22)', 'rgba(64,80,255,0.20)', 'rgba(255,45,220,0.28)'],
    saturation: 1.5,
    contrast: 1.16,
    title: ['#a8fbff', '#2bd9ff', '#ff3df2'],
    gap: '#e6feff',
    accent: '#2bf5ff',
  },
  gold: {
    label: 'Gold — amber / honey',
    overlay: ['rgba(255,196,64,0.26)', 'rgba(255,140,26,0.22)', 'rgba(122,62,10,0.30)'],
    saturation: 1.16,
    contrast: 1.06,
    title: ['#fff6bf', '#ffc93c', '#ff8c1a'],
    gap: '#fff8e1',
    accent: '#ffd23c',
  },
  midnight: {
    label: 'Midnight — blue / teal',
    overlay: ['rgba(16,42,120,0.32)', 'rgba(0,110,160,0.24)', 'rgba(0,60,70,0.34)'],
    saturation: 1.22,
    contrast: 1.14,
    title: ['#c9f2ff', '#38b6ff', '#37ffd0'],
    gap: '#dff6ff',
    accent: '#37ffd0',
  },
};

export function getTheme(id) {
  return THEMES[id] || THEMES.sunset;
}

// ------------------------------------------------------------ panel maths
// Returns panels for a layout scaled to a W x H canvas:
// [{ points: [[x, y], ...] }] in device pixels.
export function getPanels(layoutId, W, H) {
  const def = LAYOUT_DEFS[layoutId] || LAYOUT_DEFS.hero;
  return def.map((poly) => ({
    points: poly.map(([nx, ny]) => [nx * W, ny * H]),
  }));
}

function pointInPolygon(x, y, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i];
    const [xj, yj] = points[j];
    const crosses = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}

// Hit test: which panel (index) contains canvas point (x, y), or -1.
export function hitTestPanel(layoutId, W, H, x, y) {
  const panels = getPanels(layoutId, W, H);
  for (let i = panels.length - 1; i >= 0; i--) {
    if (pointInPolygon(x, y, panels[i].points)) return i;
  }
  return -1;
}

function tracePath(ctx, points) {
  ctx.beginPath();
  points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
}

function bboxOf(points) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of points) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

// ------------------------------------------------------------- photo fill
// Draws img so it covers the polygon's bounding box, honouring the
// panel's own zoom and pan, then clips to the slanted polygon.
function drawPanelPhoto(ctx, img, points, t, theme) {
  const bb = bboxOf(points);
  ctx.save();
  tracePath(ctx, points);
  ctx.clip();
  if (!img) {
    // Placeholder wash so a panel is never blank.
    const g = ctx.createLinearGradient(bb.x, bb.y, bb.x + bb.w, bb.y + bb.h);
    g.addColorStop(0, '#3a2b55');
    g.addColorStop(1, '#12283d');
    ctx.fillStyle = g;
    ctx.fillRect(bb.x, bb.y, bb.w, bb.h);
    ctx.restore();
    return;
  }
  const zoom = t && t.zoom ? t.zoom : 1;
  const ox = t && t.ox ? t.ox : 0;
  const oy = t && t.oy ? t.oy : 0;
  const scale = Math.max(bb.w / img.width, bb.h / img.height) * zoom;
  const dw = img.width * scale;
  const dh = img.height * scale;
  const panX = Math.max(0, (dw - bb.w) / 2);
  const panY = Math.max(0, (dh - bb.h) / 2);
  const dx = bb.x + (bb.w - dw) / 2 + ox * panX;
  const dy = bb.y + (bb.h - dh) / 2 + oy * panY;
  try {
    ctx.filter = `saturate(${theme.saturation}) contrast(${theme.contrast})`;
  } catch (e) { /* filter unsupported: draw unfiltered */ }
  ctx.drawImage(img, dx, dy, dw, dh);
  try { ctx.filter = 'none'; } catch (e) { /* noop */ }
  ctx.restore();
}

// ------------------------------------------------------------------ grain
// Deterministic grain: a small noise tile generated from a fixed seed, so
// every redraw and every export shows exactly the same texture.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let grainTile = null;
function getGrainTile() {
  if (grainTile) return grainTile;
  const size = 140;
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const g = c.getContext('2d');
  const data = g.createImageData(size, size);
  const rand = mulberry32(20261121);
  for (let i = 0; i < data.data.length; i += 4) {
    const v = Math.floor(rand() * 255);
    data.data[i] = v;
    data.data[i + 1] = v;
    data.data[i + 2] = v;
    data.data[i + 3] = 255;
  }
  g.putImageData(data, 0, 0);
  grainTile = c;
  return c;
}

// ------------------------------------------------------------------- type
function drawTitle(ctx, W, H, state, theme) {
  const title = (state.title || '').trim();
  const tagline = (state.tagline || '').trim().toUpperCase();
  if (!title && !tagline) return;

  const lines = title ? title.split(/\s+/) : [];
  let size = W * 0.17;
  const fontFor = (s) => `italic 900 ${s}px "Arial Black", "Arial Bold", Arial, sans-serif`;
  ctx.save();
  // Shrink until the widest word fits comfortably.
  for (let guard = 0; guard < 40; guard++) {
    ctx.font = fontFor(size);
    const widest = lines.reduce((m, ln) => Math.max(m, ctx.measureText(ln).width), 0);
    if (widest <= W * 0.88 || size < 12) break;
    size *= 0.92;
  }
  const lineH = size * 0.94;
  const tagSize = Math.max(13, size * 0.21);
  const tagGap = tagline ? tagSize * 1.5 : 0;
  const blockH = lines.length * lineH + tagGap;
  const baseY = H - H * 0.045 - blockH;

  // Soft dark backing so the type stays readable over bright photos.
  if (lines.length) {
    const bg = ctx.createLinearGradient(0, baseY - size * 0.25, 0, H);
    bg.addColorStop(0, 'rgba(8,6,18,0)');
    bg.addColorStop(0.35, 'rgba(8,6,18,0.42)');
    bg.addColorStop(1, 'rgba(8,6,18,0.66)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, baseY - size * 0.25, W, H - baseY + size * 0.25);
  }

  const grad = ctx.createLinearGradient(0, baseY, 0, baseY + Math.max(1, lines.length) * lineH);
  theme.title.forEach((col, i) => {
    grad.addColorStop(theme.title.length === 1 ? 0 : i / (theme.title.length - 1), col);
  });

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  lines.forEach((ln, i) => {
    const y = baseY + size + i * lineH;
    ctx.font = fontFor(size);
    // Offset shadow pass.
    ctx.fillStyle = 'rgba(10,4,24,0.6)';
    ctx.fillText(ln, W / 2 + size * 0.07, y + size * 0.07);
    // Heavy dark outline.
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(2, size * 0.13);
    ctx.strokeStyle = '#150e24';
    ctx.strokeText(ln, W / 2, y);
    // Gradient face.
    ctx.fillStyle = grad;
    ctx.fillText(ln, W / 2, y);
  });

  if (tagline) {
    const y = baseY + lines.length * lineH + tagGap;
    ctx.font = `700 ${tagSize}px Arial, Helvetica, sans-serif`;
    try { ctx.letterSpacing = `${Math.round(tagSize * 0.42)}px`; } catch (e) { /* older engines */ }
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(1.5, tagSize * 0.16);
    ctx.strokeStyle = 'rgba(12,8,26,0.9)';
    ctx.strokeText(tagline, W / 2, y);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(tagline, W / 2, y);
    try { ctx.letterSpacing = '0px'; } catch (e) { /* noop */ }
  }
  ctx.restore();
}

// ------------------------------------------------------------- main entry
// state: {
//   layout, theme, title, tagline,
//   photos: [HTMLImageElement|null, ...] indexed by panel assignment,
//   panels: [{ photo, zoom, ox, oy }, ...],
//   selected: index|null, showSelection: bool
// }
export function draw(canvas, state) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const theme = getTheme(state.theme);
  const panels = getPanels(state.layout, W, H);
  const defs = state.panels || [];

  ctx.save();
  ctx.fillStyle = '#0d0a18';
  ctx.fillRect(0, 0, W, H);

  panels.forEach((panel, i) => {
    const def = defs[i] || { photo: i, zoom: 1, ox: 0, oy: 0 };
    const img = state.photos ? state.photos[def.photo] : null;
    drawPanelPhoto(ctx, img || null, panel.points, def, theme);
  });

  // Diagonal colour wash unifies the collage.
  const wash = ctx.createLinearGradient(0, 0, W, H);
  theme.overlay.forEach((col, i) => {
    wash.addColorStop(theme.overlay.length === 1 ? 0 : i / (theme.overlay.length - 1), col);
  });
  ctx.globalCompositeOperation = 'soft-light';
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1;

  // Pale seams between panels.
  const seam = Math.max(3, Math.round(W * 0.0055));
  ctx.lineJoin = 'round';
  for (const panel of panels) {
    tracePath(ctx, panel.points);
    ctx.lineWidth = seam;
    ctx.strokeStyle = theme.gap;
    ctx.stroke();
  }

  drawTitle(ctx, W, H, state, theme);

  // Vignette.
  const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.78);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(4,2,12,0.5)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);

  // Seeded grain, identical on every render.
  const tile = getGrainTile();
  const pattern = ctx.createPattern(tile, 'repeat');
  if (pattern) {
    ctx.save();
    ctx.globalAlpha = 0.05;
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  // Editor-only selection outline.
  if (state.showSelection && typeof state.selected === 'number' && panels[state.selected]) {
    tracePath(ctx, panels[state.selected].points);
    ctx.lineWidth = Math.max(3, W * 0.006);
    ctx.strokeStyle = theme.accent;
    ctx.stroke();
    tracePath(ctx, panels[state.selected].points);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(10,8,20,0.85)';
    ctx.stroke();
  }

  ctx.restore();
}

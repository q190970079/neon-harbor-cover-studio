// panels.js — the drawing heart of Neon Harbor Cover Studio.
//
// Everything a finished cover is made of lives here: three multi-panel
// layouts built from polygons with diagonal cuts, four colour-grade themes,
// per-photo crop maths (zoom + offset inside each panel), the stacked title
// lettering, a spaced tagline, a vignette and a seeded grain pass so every
// render of the same state is pixel-for-pixel the same.
//
// The module is pure canvas: it never touches the DOM beyond the 2D context
// it is handed, which is what lets the editor preview and the full-size PNG
// export share exactly one drawing path.

/** Small deterministic PRNG (mulberry32) so the grain never changes between renders. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The three layouts. Each returns panel polygons in 0..1 space, hero first. */
export const LAYOUTS = {
  hero: {
    label: 'Hero Plus Three',
    panels: [
      // The big left portrait panel, its right edge leaning with the cut.
      [[0, 0], [0.585, 0], [0.52, 1], [0, 1]],
      // Three stacked panels down the right side, seams slanting in sympathy.
      [[0.605, 0], [1, 0], [1, 0.335], [0.572, 0.385]],
      [[0.562, 0.415], [1, 0.365], [1, 0.675], [0.538, 0.705]],
      [[0.528, 0.735], [1, 0.705], [1, 1], [0.51, 1]],
    ],
  },
  strips: {
    label: 'Diagonal Strips',
    panels: [
      [[0, 0], [1, 0], [1, 0.35], [0, 0.435]],
      [[0, 0.465], [1, 0.38], [1, 0.685], [0, 0.755]],
      [[0, 0.785], [0.515, 0.72], [0.475, 1], [0, 1]],
      [[0.545, 0.72], [1, 0.715], [1, 1], [0.505, 1]],
    ],
  },
  banner: {
    label: 'Banner Over Trio',
    panels: [
      [[0, 0], [1, 0], [1, 0.595], [0, 0.66]],
      [[0, 0.69], [0.325, 0.648], [0.305, 1], [0, 1]],
      [[0.355, 0.642], [0.665, 0.628], [0.645, 1], [0.335, 1]],
      [[0.695, 0.622], [1, 0.632], [1, 1], [0.675, 1]],
    ],
  },
};

/** The four colour grades: wash stops, canvas filter, lettering colours. */
export const THEMES = {
  sunset: {
    label: 'Sunset Vice',
    filter: 'saturate(1.28) contrast(1.06) brightness(1.02)',
    wash: [[0, 'rgba(255, 138, 61, 0.16)'], [0.55, 'rgba(255, 62, 130, 0.20)'], [1, 'rgba(84, 32, 160, 0.34)']],
    washBlend: 'soft-light',
    titleTop: '#ffe259',
    titleBottom: '#ff4e7a',
    tagline: '#ffe9d6',
    gutter: '#fdf6ec',
    backdrop: '#2a1030',
  },
  neon: {
    label: 'Neon Night',
    filter: 'saturate(1.45) contrast(1.12) brightness(0.98)',
    wash: [[0, 'rgba(0, 229, 255, 0.14)'], [0.55, 'rgba(140, 60, 255, 0.18)'], [1, 'rgba(255, 43, 166, 0.30)']],
    washBlend: 'soft-light',
    titleTop: '#7df9ff',
    titleBottom: '#ff3df0',
    tagline: '#d8fbff',
    gutter: '#eefcff',
    backdrop: '#0b1030',
  },
  golden: {
    label: 'Golden Hour',
    filter: 'saturate(1.16) contrast(1.04) brightness(1.06)',
    wash: [[0, 'rgba(255, 196, 64, 0.18)'], [0.6, 'rgba(255, 128, 40, 0.20)'], [1, 'rgba(146, 64, 20, 0.32)']],
    washBlend: 'soft-light',
    titleTop: '#fff6bf',
    titleBottom: '#ff8b1f',
    tagline: '#fff3d0',
    gutter: '#fff8e6',
    backdrop: '#33200c',
  },
  midnight: {
    label: 'Midnight Run',
    filter: 'saturate(1.12) contrast(1.14) brightness(0.94)',
    wash: [[0, 'rgba(38, 198, 218, 0.13)'], [0.55, 'rgba(24, 78, 160, 0.22)'], [1, 'rgba(6, 20, 64, 0.40)']],
    washBlend: 'soft-light',
    titleTop: '#b8fff4',
    titleBottom: '#3f8cff',
    tagline: '#d9f4ff',
    gutter: '#e8f6ff',
    backdrop: '#081426',
  },
};

/** Scale a 0..1 polygon into pixel space. */
function scalePoly(poly, w, h) {
  return poly.map(([x, y]) => [x * w, y * h]);
}

/** Axis-aligned bounds of a pixel-space polygon. */
function polyBounds(pts) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of pts) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY, bw: maxX - minX, bh: maxY - minY };
}

/** Trace a polygon path on the context. */
function tracePath(ctx, pts) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
}

/**
 * Draw one photo inside one panel: the image is cover-fitted to the panel's
 * bounding box, then the photo's own zoom and offsets are applied, and the
 * panel polygon clips whatever spills.
 */
function drawPanelPhoto(ctx, pts, photo, theme) {
  const { minX, minY, bw, bh } = polyBounds(pts);
  ctx.save();
  tracePath(ctx, pts);
  ctx.clip();
  if (photo && photo.img) {
    const img = photo.img;
    const zoom = photo.zoom || 1;
    const scale = Math.max(bw / img.naturalWidth, bh / img.naturalHeight) * zoom;
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    const dx = minX + (bw - dw) / 2 + (photo.ox || 0) * bw * 0.4;
    const dy = minY + (bh - dh) / 2 + (photo.oy || 0) * bh * 0.4;
    ctx.filter = theme.filter;
    ctx.drawImage(img, dx, dy, dw, dh);
    ctx.filter = 'none';
  } else {
    const g = ctx.createLinearGradient(minX, minY, minX + bw, minY + bh);
    g.addColorStop(0, theme.backdrop);
    g.addColorStop(1, '#12081c');
    ctx.fillStyle = g;
    ctx.fillRect(minX, minY, bw, bh);
  }
  ctx.restore();
}

/** The theme's colour wash, laid over the whole collage at once. */
function applyWash(ctx, w, h, theme) {
  const g = ctx.createLinearGradient(0, 0, w * 0.25, h);
  for (const [pos, colour] of theme.wash) g.addColorStop(pos, colour);
  ctx.save();
  ctx.globalCompositeOperation = theme.washBlend;
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
  // A whisper of the same gradient in normal mode keeps the grade visible
  // on browsers where soft-light over photos reads too subtle.
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/** Draw text centred at x, with fixed pixel gaps between the letters. */
function drawSpaced(ctx, text, cx, y, spacing) {
  const chars = [...text];
  const widths = chars.map((c) => ctx.measureText(c).width);
  const total = widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1);
  let cursor = cx - total / 2;
  const prevAlign = ctx.textAlign;
  ctx.textAlign = 'left';
  chars.forEach((c, i) => {
    ctx.fillText(c, cursor, y);
    cursor += widths[i] + spacing;
  });
  ctx.textAlign = prevAlign;
}

/**
 * The lettering: a spaced tagline riding above the title, and the title
 * itself stacked word over word, shrunk until every line fits the frame.
 */
function drawLettering(ctx, w, h, state, theme) {
  const title = (state.title || '').trim().toUpperCase();
  const tagline = (state.tagline || '').trim().toUpperCase();
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  const lines = title ? title.split(/\s+/) : [];
  let titleSize = h * 0.19;
  const setTitleFont = () => {
    ctx.font = `italic 900 ${titleSize}px "Arial Black", "Helvetica Neue", Arial, sans-serif`;
  };
  if (lines.length) {
    setTitleFont();
    const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
    if (widest > w * 0.94) {
      titleSize *= (w * 0.94) / widest;
      setTitleFont();
    }
  }
  const lineHeight = titleSize * 0.94;
  const blockHeight = lines.length * lineHeight;
  const titleBottom = h - h * 0.045;

  if (tagline) {
    const tagSize = Math.max(13, h * 0.028);
    ctx.font = `700 ${tagSize}px "Helvetica Neue", Arial, sans-serif`;
    ctx.shadowColor = 'rgba(10, 2, 18, 0.85)';
    ctx.shadowBlur = tagSize * 0.35;
    ctx.shadowOffsetY = tagSize * 0.08;
    ctx.fillStyle = theme.tagline;
    drawSpaced(ctx, tagline, w / 2, titleBottom - blockHeight - tagSize * 0.55, tagSize * 0.62);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }

  if (lines.length) {
    const grad = ctx.createLinearGradient(0, titleBottom - blockHeight, 0, titleBottom);
    grad.addColorStop(0, theme.titleTop);
    grad.addColorStop(1, theme.titleBottom);
    ctx.font = `italic 900 ${titleSize}px "Arial Black", "Helvetica Neue", Arial, sans-serif`;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#170722';
    ctx.lineWidth = titleSize * 0.16;
    ctx.shadowColor = 'rgba(12, 0, 20, 0.55)';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = titleSize * 0.045;
    ctx.shadowOffsetY = titleSize * 0.07;
    lines.forEach((line, i) => {
      const y = titleBottom - (lines.length - 1 - i) * lineHeight;
      ctx.strokeText(line, w / 2, y);
      ctx.fillStyle = grad;
      ctx.fillText(line, w / 2, y);
    });
  }
  ctx.restore();
}

/** A soft dark edge all round, to seat the collage like a printed poster. */
function applyVignette(ctx, w, h) {
  const r = Math.hypot(w, h) * 0.62;
  const g = ctx.createRadialGradient(w / 2, h / 2, r * 0.42, w / 2, h / 2, r);
  g.addColorStop(0, 'rgba(8, 0, 16, 0)');
  g.addColorStop(1, 'rgba(8, 0, 16, 0.42)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

/** Deterministic film grain: the same seed, the same specks, every render. */
function applyGrain(ctx, w, h) {
  const rand = mulberry32(0x9e37 + w * 31 + h * 17);
  const specks = Math.floor((w * h) / 850);
  ctx.save();
  for (let i = 0; i < specks; i++) {
    const v = rand();
    ctx.fillStyle = v > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
    ctx.fillRect(rand() * w, rand() * h, 1.4, 1.4);
  }
  ctx.restore();
}

/**
 * Draw the whole cover described by `state` onto a 2D context sized w x h.
 * state: { layout, theme, photos, panelPhoto, title, tagline, highlight }
 * `highlight` is an editor-only panel index to outline, or -1 for a clean
 * export render.
 */
export function drawCover(ctx, w, h, state) {
  const theme = THEMES[state.theme] || THEMES.sunset;
  const layout = LAYOUTS[state.layout] || LAYOUTS.hero;
  ctx.save();
  ctx.fillStyle = theme.backdrop;
  ctx.fillRect(0, 0, w, h);

  const polys = layout.panels.map((p) => scalePoly(p, w, h));
  polys.forEach((pts, i) => {
    const photo = state.photos[state.panelPhoto[i] ?? i % Math.max(1, state.photos.length)] || null;
    drawPanelPhoto(ctx, pts, state.photos.length ? photo : null, theme);
  });

  applyWash(ctx, w, h, theme);

  // Light gutters: every panel edge stroked over the wash.
  const gutterWidth = Math.max(5, w * 0.0075);
  ctx.lineJoin = 'round';
  for (const pts of polys) {
    tracePath(ctx, pts);
    ctx.strokeStyle = theme.gutter;
    ctx.lineWidth = gutterWidth;
    ctx.stroke();
  }

  drawLettering(ctx, w, h, state, theme);
  applyVignette(ctx, w, h);
  applyGrain(ctx, w, h);

  if (state.highlight != null && state.highlight >= 0 && polys[state.highlight]) {
    tracePath(ctx, polys[state.highlight]);
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = Math.max(3, w * 0.004);
    ctx.setLineDash([14, 9]);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore();
}

/** Which panel of a layout sits under point (x, y) of a w x h canvas, or -1. */
export function panelAt(layoutName, w, h, x, y) {
  const layout = LAYOUTS[layoutName] || LAYOUTS.hero;
  const polys = layout.panels.map((p) => scalePoly(p, w, h));
  for (let i = polys.length - 1; i >= 0; i--) {
    const pts = polys[i];
    let inside = false;
    for (let a = 0, b = pts.length - 1; a < pts.length; b = a++) {
      const [ax, ay] = pts[a];
      const [bx, by] = pts[b];
      if (ay > y !== by > y && x < ((bx - ax) * (y - ay)) / (by - ay) + ax) inside = !inside;
    }
    if (inside) return i;
  }
  return -1;
}

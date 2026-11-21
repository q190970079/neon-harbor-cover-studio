// Neon Harbor Cover Studio — the pure drawing module.
// It knows nothing about the page: given a canvas and a state object it paints a complete
// multi-panel cover. State shape:
//   {
//     photos:     [{ img, zoom, ox, oy }, ...]   // img is an Image (or null), zoom >= 1,
//                                                // ox / oy are -0.5..0.5 pan offsets
//     panelPhoto: [photoIndex, ...]             // which photo fills each panel
//     layout:     'syndicate' | 'strips' | 'banner'
//     theme:      'sunset' | 'neon' | 'golden' | 'midnight'
//     title:      'NEON HARBOR'
//     tagline:    'SUNSET SYNDICATE'
//   }
// Everything is drawn with canvas primitives and the visitor's own photos: no artwork,
// logo or font file from any game is used anywhere in this app.

/** Panel layouts. Each panel is a polygon of [x, y] points in 0..1 cover space.
 *  The polygons of a layout tile the whole cover, sharing edges, so the white strokes
 *  drawn around each one read as the poster's white gutters and its diagonal cuts. */
export const LAYOUTS = {
  syndicate: {
    label: 'Syndicate Grid',
    panels: [
      // The hero: tall left panel, its right edge leaning in as it drops.
      [[0, 0], [0.58, 0], [0.52, 0.66], [0, 0.66]],
      // Top right: the lookout.
      [[0.58, 0], [1, 0], [1, 0.4], [0.52, 0.66]],
      // Bottom left: the getaway.
      [[0, 0.66], [0.52, 0.66], [0.58, 1], [0, 1]],
      // Bottom right: the prize.
      [[0.52, 0.66], [1, 0.4], [1, 1], [0.58, 1]],
    ],
  },
  strips: {
    label: 'Postcard Strips',
    panels: [
      // Three wide strips, each cut on a falling diagonal.
      [[0, 0], [1, 0], [1, 0.3], [0, 0.42]],
      [[0, 0.42], [1, 0.3], [1, 0.62], [0, 0.74]],
      [[0, 0.74], [1, 0.62], [1, 1], [0, 1]],
    ],
  },
  banner: {
    label: 'Hero Banner',
    panels: [
      // One wide banner across the top, its foot edge stepping down to the right.
      [[0, 0], [1, 0], [1, 0.58], [0.67, 0.613], [0.34, 0.637], [0, 0.66]],
      // Three uprights underneath it.
      [[0, 0.66], [0.34, 0.637], [0.34, 1], [0, 1]],
      [[0.34, 0.637], [0.67, 0.613], [0.67, 1], [0.34, 1]],
      [[0.67, 0.613], [1, 0.58], [1, 1], [0.67, 1]],
    ],
  },
};

/** Colour grades. `grade` lists [stop, rgba] pairs for a top-to-bottom wash painted over
 *  every photo; `filter` is the canvas filter applied while a photo is drawn; `title`
 *  lists the gradient stops of the big lettering; `paper` fills a panel with no photo. */
export const THEMES = {
  sunset: {
    label: 'Sunset Vice',
    filter: 'saturate(1.28) contrast(1.08) brightness(1.02)',
    grade: [[0, 'rgba(255, 166, 66, 0.16)'], [0.45, 'rgba(255, 84, 138, 0.20)'], [1, 'rgba(52, 8, 92, 0.46)']],
    title: ['#ffe259', '#ff7518', '#ff2e88'],
    tagline: '#ffd9ec',
    paper: ['#3a1654', '#8f2160'],
  },
  neon: {
    label: 'Neon Night',
    filter: 'saturate(1.35) contrast(1.12) brightness(0.98)',
    grade: [[0, 'rgba(0, 229, 255, 0.13)'], [0.5, 'rgba(255, 0, 153, 0.18)'], [1, 'rgba(3, 6, 54, 0.52)']],
    title: ['#5ffbf1', '#4facfe', '#ff71ce'],
    tagline: '#c8fff8',
    paper: ['#041e42', '#5b1160'],
  },
  golden: {
    label: 'Golden Hour',
    filter: 'saturate(1.18) contrast(1.05) brightness(1.05) sepia(0.18)',
    grade: [[0, 'rgba(255, 214, 110, 0.20)'], [0.55, 'rgba(255, 140, 60, 0.16)'], [1, 'rgba(96, 38, 6, 0.44)']],
    title: ['#fff3b0', '#ffb347', '#ff5e62'],
    tagline: '#ffedbe',
    paper: ['#4a2408', '#8a5410'],
  },
  midnight: {
    label: 'Midnight Run',
    filter: 'saturate(1.12) contrast(1.12) brightness(0.94)',
    grade: [[0, 'rgba(38, 110, 178, 0.18)'], [0.5, 'rgba(16, 60, 120, 0.16)'], [1, 'rgba(1, 14, 40, 0.56)']],
    title: ['#a8e6ff', '#4facfe', '#b18cff'],
    tagline: '#d3ecff',
    paper: ['#02142e', '#123a6b'],
  },
};

export function layoutNames() {
  return Object.keys(LAYOUTS);
}

export function themeNames() {
  return Object.keys(THEMES);
}

/** The panels of a layout as polygons in cover space (arrays of [x, y]). */
export function panelsFor(layout) {
  return (LAYOUTS[layout] ?? LAYOUTS.syndicate).panels;
}

/** True when the 0..1 point (x, y) falls inside the polygon. Ray casting, edges count as in. */
export function pointInPolygon(x, y, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Index of the panel under a 0..1 point, or -1 when the point is on a gutter seam. */
export function panelAt(layout, x, y) {
  const panels = panelsFor(layout);
  for (let i = 0; i < panels.length; i++) {
    if (pointInPolygon(x, y, panels[i])) return i;
  }
  return -1;
}

/** The axis-aligned box a polygon spans, in cover space. */
function polygonBox(polygon) {
  let minX = 1, minY = 1, maxX = 0, maxY = 0;
  for (const [x, y] of polygon) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY };
}

/** A tiny deterministic random source (a linear congruential generator), so the grain
 *  is the same on every render of the same cover and main.ts stays reproducible. */
function seededRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Paints one photo into one clipped panel: cover-fit over the panel's box, then the
 *  photo's zoom and pan, then the theme's filter and grade wash. With no photo the panel
 *  gets the theme's paper gradient and a soft sun disc, so a fresh cover never looks broken. */
function drawPanelPhoto(ctx, polygon, photo, theme, w, h) {
  const box = polygonBox(polygon);
  const bx = box.minX * w, by = box.minY * h, bw = box.w * w, bh = box.h * h;
  ctx.save();
  ctx.beginPath();
  polygon.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x * w, y * h) : ctx.lineTo(x * w, y * h)));
  ctx.closePath();
  ctx.clip();
  const img = photo?.img;
  if (img && img.naturalWidth > 0) {
    const zoom = Math.max(1, photo.zoom || 1);
    const scale = Math.max(bw / img.naturalWidth, bh / img.naturalHeight) * zoom;
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    const dx = bx + (bw - dw) / 2 + (photo.ox || 0) * bw;
    const dy = by + (bh - dh) / 2 + (photo.oy || 0) * bh;
    ctx.filter = theme.filter;
    ctx.drawImage(img, dx, dy, dw, dh);
    ctx.filter = 'none';
  } else {
    const paper = ctx.createLinearGradient(bx, by, bx + bw, by + bh);
    paper.addColorStop(0, theme.paper[0]);
    paper.addColorStop(1, theme.paper[1]);
    ctx.fillStyle = paper;
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = 'rgba(255, 220, 160, 0.55)';
    ctx.beginPath();
    ctx.arc(bx + bw * 0.68, by + bh * 0.3, Math.min(bw, bh) * 0.16, 0, Math.PI * 2);
    ctx.fill();
  }
  const wash = ctx.createLinearGradient(0, by, 0, by + bh);
  for (const [stop, colour] of theme.grade) wash.addColorStop(stop, colour);
  ctx.fillStyle = wash;
  ctx.fillRect(bx, by, bw, bh);
  ctx.restore();
}

/** The white gutters: every panel stroked in paper white, plus a white frame at the edge. */
function drawGutters(ctx, panels, w, h) {
  const gutter = Math.max(5, Math.round(w * 0.007));
  ctx.strokeStyle = '#ffffff';
  ctx.lineJoin = 'round';
  for (const polygon of panels) {
    ctx.beginPath();
    polygon.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x * w, y * h) : ctx.lineTo(x * w, y * h)));
    ctx.closePath();
    ctx.lineWidth = gutter * 2;
    ctx.stroke();
  }
  ctx.lineWidth = gutter * 2;
  ctx.strokeRect(0, 0, w, h);
}

/** The lettering: the tagline in spaced capitals over the title, the title stacked word
 *  by word, heavy italic, gradient-filled, dark-stroked, with a hard offset shadow. */
function drawLettering(ctx, state, theme, w, h) {
  const title = (state.title || '').trim().toUpperCase();
  const tagline = (state.tagline || '').trim().toUpperCase();
  if (!title && !tagline) return;
  const words = title ? title.split(/\s+/) : [];
  // Fit the longest word to 88% of the width, and never let the stack eat the cover.
  let size = h * 0.17;
  const setFont = (px) => { ctx.font = `italic 900 ${px}px "Arial Black", Arial, Helvetica, sans-serif`; };
  setFont(size);
  const widest = words.reduce((m, word) => Math.max(m, ctx.measureText(word).width), 0);
  if (widest > w * 0.88) {
    size = Math.max(18, size * ((w * 0.88) / widest));
    setFont(size);
  }
  const lineHeight = size * 0.94;
  const stackHeight = words.length * lineHeight;
  const taglineSize = Math.max(13, size * 0.21);
  const bottom = h * 0.965;
  const taglineY = bottom - stackHeight - taglineSize * 0.9;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  if (tagline) {
    const spaced = tagline.split('').join('  ');
    ctx.font = `700 ${taglineSize}px Arial, Helvetica, sans-serif`;
    ctx.shadowColor = 'rgba(10, 2, 24, 0.85)';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = taglineSize * 0.09;
    ctx.shadowOffsetY = taglineSize * 0.09;
    ctx.fillStyle = theme.tagline;
    ctx.fillText(spaced, w / 2, taglineY);
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }

  const fill = ctx.createLinearGradient(0, taglineY, 0, bottom);
  theme.title.forEach((colour, i) => fill.addColorStop(i / (theme.title.length - 1), colour));
  setFont(size);
  ctx.lineJoin = 'round';
  words.forEach((word, i) => {
    const y = bottom - (words.length - 1 - i) * lineHeight;
    ctx.shadowColor = 'rgba(12, 2, 26, 0.9)';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = size * 0.055;
    ctx.shadowOffsetY = size * 0.07;
    ctx.fillStyle = 'rgba(12, 2, 26, 0.9)';
    ctx.fillText(word, w / 2, y);
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.lineWidth = size * 0.13;
    ctx.strokeStyle = '#160820';
    ctx.strokeText(word, w / 2, y);
    ctx.fillStyle = fill;
    ctx.fillText(word, w / 2, y);
  });
}

/** A soft dark edge all round, so the panels sit inside the poster like a print. */
function drawVignette(ctx, w, h) {
  const r = Math.hypot(w, h) / 2;
  const v = ctx.createRadialGradient(w / 2, h / 2, r * 0.42, w / 2, h / 2, r * 1.02);
  v.addColorStop(0, 'rgba(8, 0, 18, 0)');
  v.addColorStop(1, 'rgba(8, 0, 18, 0.36)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);
}

/** Deterministic film grain: seeded specks at low alpha, identical on every render. */
function drawGrain(ctx, w, h) {
  const rand = seededRandom(0x9e3779b9);
  const count = Math.round((w * h) / 2600);
  ctx.save();
  for (let i = 0; i < count; i++) {
    const a = rand() * 0.07;
    ctx.fillStyle = rand() > 0.5 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a})`;
    ctx.fillRect(rand() * w, rand() * h, 1.6, 1.6);
  }
  ctx.restore();
}

/** A thin highlight ring on the selected panel, so the editor can show what a click picked.
 *  Only drawn when state.selected is a panel index (the editor passes it; exports do not). */
function drawSelection(ctx, panels, state, w, h) {
  const i = state.selected;
  if (typeof i !== 'number' || !panels[i]) return;
  ctx.save();
  ctx.beginPath();
  panels[i].forEach(([x, y], j) => (j === 0 ? ctx.moveTo(x * w, y * h) : ctx.lineTo(x * w, y * h)));
  ctx.closePath();
  ctx.strokeStyle = 'rgba(0, 229, 255, 0.95)';
  ctx.lineWidth = Math.max(3, w * 0.005);
  ctx.setLineDash([w * 0.02, w * 0.012]);
  ctx.stroke();
  ctx.restore();
}

/** Draws the whole cover described by `state` onto `canvas` at the canvas's own size. */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  const theme = THEMES[state.theme] ?? THEMES.sunset;
  const panels = panelsFor(state.layout);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  panels.forEach((polygon, i) => {
    const photoIndex = state.panelPhoto?.[i] ?? i;
    const photo = state.photos?.[photoIndex % Math.max(1, state.photos.length)] ?? null;
    drawPanelPhoto(ctx, polygon, photo, theme, w, h);
  });
  drawGutters(ctx, panels, w, h);
  drawLettering(ctx, state, theme, w, h);
  drawVignette(ctx, w, h);
  drawGrain(ctx, w, h);
  drawSelection(ctx, panels, state, w, h);
}

// Neon Harbor Cover Studio - panel collage renderer.
// Original code: clipped polygon panels, themed grade overlays,
// stacked display type, vignette and seeded grain.

export const THEMES = {
  sunset:   { label: 'Sunset',   top: '#ff9a3d', mid: '#ff4e7a', bot: '#5b2a86', sat: 1.25, con: 1.12, tint: 'rgba(255,110,60,0.16)' },
  neon:     { label: 'Neon',     top: '#19e3ff', mid: '#ff2fb3', bot: '#101a5e', sat: 1.45, con: 1.18, tint: 'rgba(30,200,255,0.14)' },
  gold:     { label: 'Gold',     top: '#ffd76a', mid: '#e08a1e', bot: '#4a2405', sat: 1.15, con: 1.10, tint: 'rgba(255,190,60,0.18)' },
  midnight: { label: 'Midnight', top: '#3ec6ff', mid: '#1c5fd6', bot: '#050b2e', sat: 1.05, con: 1.16, tint: 'rgba(40,110,255,0.16)' },
};

// Each layout returns polygons in relative 0..1 coordinates.
export const LAYOUTS = {
  hero: {
    label: 'Hero + Trio',
    panels: (w, h) => [
      [[0, 0], [0.66, 0], [0.58, 0.72], [0, 0.78]],
      [[0.68, 0], [1, 0], [1, 0.34], [0.60, 0.70]],
      [[0, 0.80], [0.57, 0.74], [0.52, 1], [0, 1]],
      [[0.54, 1], [0.53, 0.73], [1, 0.36], [1, 1]],
    ],
  },
  stripes: {
    label: 'Slanted Stripes',
    panels: (w, h) => [
      [[0, 0], [0.34, 0], [0.24, 1], [0, 1]],
      [[0.36, 0], [0.62, 0], [0.52, 1], [0.26, 1]],
      [[0.64, 0], [0.86, 0], [0.76, 1], [0.54, 1]],
      [[0.88, 0], [1, 0], [1, 1], [0.78, 1]],
    ],
  },
  banner: {
    label: 'Banner + Three',
    panels: (w, h) => [
      [[0, 0], [1, 0], [1, 0.52], [0, 0.60]],
      [[0, 0.62], [0.32, 0.55], [0.30, 1], [0, 1]],
      [[0.34, 0.54], [0.66, 0.53], [0.64, 1], [0.32, 1]],
      [[0.68, 0.53], [1, 0.52], [1, 1], [0.66, 1]],
    ],
  },
};

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pointInPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// Hit test: returns panel index at relative point, or -1.
export function hitTestPanel(rx, ry, layoutId) {
  const layout = LAYOUTS[layoutId] || LAYOUTS.hero;
  const polys = layout.panels(1, 1);
  for (let i = polys.length - 1; i >= 0; i--) {
    if (pointInPoly(rx, ry, polys[i])) return i;
  }
  return -1;
}

function drawPhotoCover(ctx, img, box, photo) {
  const scale = (photo && photo.scale) || 1;
  const ox = (photo && photo.ox) || 0;
  const oy = (photo && photo.oy) || 0;
  const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;
  const base = Math.max(box.w / iw, box.h / ih) * scale;
  const dw = iw * base, dh = ih * base;
  const cx = box.x + (box.w - dw) / 2 + ox * box.w * 0.5;
  const cy = box.y + (box.h - dh) / 2 + oy * box.h * 0.5;
  ctx.drawImage(img, cx, cy, dw, dh);
}

function bboxOf(poly, w, h) {
  let minX = 1, minY = 1, maxX = 0, maxY = 0;
  for (const [x, y] of poly) { minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); }
  return { x: minX * w, y: minY * h, w: (maxX - minX) * w, h: (maxY - minY) * h };
}

export function draw(canvas, state) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const theme = THEMES[state.theme] || THEMES.sunset;
  const layout = LAYOUTS[state.layout] || LAYOUTS.hero;
  ctx.save();
  ctx.fillStyle = '#0b0714';
  ctx.fillRect(0, 0, W, H);

  const polys = layout.panels(W, H);
  polys.forEach((rel, i) => {
    const poly = rel.map(([x, y]) => [x * W, y * H]);
    ctx.save();
    ctx.beginPath();
    poly.forEach(([x, y], k) => (k === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.closePath();
    ctx.clip();
    const photoIdx = state.panelPhotos && state.panelPhotos[i] != null ? state.panelPhotos[i] : i;
    const photo = state.photos && state.photos[photoIdx];
    const box = bboxOf(rel, W, H);
    // pad box a touch so slanted edges are fully covered
    const pad = { x: box.x - box.w * 0.08, y: box.y - box.h * 0.08, w: box.w * 1.16, h: box.h * 1.16 };
    if (photo && photo.img) {
      try { ctx.filter = `saturate(${theme.sat}) contrast(${theme.con})`; } catch (e) {}
      drawPhotoCover(ctx, photo.img, pad, photo);
      try { ctx.filter = 'none'; } catch (e) {}
    } else {
      const g = ctx.createLinearGradient(box.x, box.y, box.x + box.w, box.y + box.h);
      g.addColorStop(0, theme.top); g.addColorStop(0.55, theme.mid); g.addColorStop(1, theme.bot);
      ctx.fillStyle = g; ctx.fillRect(pad.x, pad.y, pad.w, pad.h);
    }
    const og = ctx.createLinearGradient(0, box.y, 0, box.y + box.h);
    og.addColorStop(0, theme.tint); og.addColorStop(1, 'rgba(5,2,16,0.34)');
    ctx.fillStyle = og; ctx.fillRect(pad.x, pad.y, pad.w, pad.h);
    ctx.restore();
    // pale gutter line
    ctx.beginPath();
    poly.forEach(([x, y], k) => (k === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.closePath();
    ctx.lineWidth = Math.max(3, W * 0.006);
    ctx.strokeStyle = 'rgba(255,246,230,0.92)';
    ctx.stroke();
    if (state.showSelection && state.selected === i) {
      ctx.lineWidth = Math.max(4, W * 0.009);
      ctx.strokeStyle = '#19e3ff';
      ctx.stroke();
    }
  });

  // bottom shade for type legibility
  const shade = ctx.createLinearGradient(0, H * 0.52, 0, H);
  shade.addColorStop(0, 'rgba(4,2,12,0)');
  shade.addColorStop(1, 'rgba(4,2,12,0.66)');
  ctx.fillStyle = shade; ctx.fillRect(0, H * 0.52, W, H * 0.48);

  drawTitle(ctx, W, H, theme, state);
  drawVignette(ctx, W, H);
  drawGrain(ctx, W, H);
  ctx.restore();
}

function drawTitle(ctx, W, H, theme, state) {
  const title = (state.title || 'NEON HARBOR').toUpperCase();
  const words = title.split(/\s+/).filter(Boolean);
  const base = Math.min(W, H);
  let size = base * 0.155;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const setFont = (s) => { ctx.font = `italic 900 ${s}px "Arial Black", Arial, sans-serif`; };
  setFont(size);
  const widest = Math.max(...words.map((wd) => ctx.measureText(wd).width), 1);
  if (widest > W * 0.92) { size = size * (W * 0.92) / widest; setFont(size); }
  const lineH = size * 0.98;
  const totalH = lineH * words.length;
  let y = H - Math.max(H * 0.07, 18) - totalH + lineH * 0.82;
  const grad = ctx.createLinearGradient(0, y - size, 0, y + totalH * 0.4);
  grad.addColorStop(0, '#fff7e6'); grad.addColorStop(0.45, theme.top); grad.addColorStop(1, theme.mid);
  for (const wd of words) {
    ctx.save();
    ctx.translate(W / 2, y);
    ctx.transform(1, 0, -0.06, 1, 0, 0);
    ctx.lineWidth = size * 0.14; ctx.strokeStyle = '#160a24'; ctx.lineJoin = 'round';
    ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowOffsetX = size * 0.06; ctx.shadowOffsetY = size * 0.08; ctx.shadowBlur = 0;
    ctx.strokeText(wd, 0, 0);
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = grad;
    ctx.fillText(wd, 0, 0);
    ctx.restore();
    y += lineH;
  }
  const tag = (state.tagline || 'SUNSET SYNDICATE').toUpperCase();
  if (tag) {
    const ts = Math.max(13, base * 0.032);
    ctx.font = `700 ${ts}px Arial, sans-serif`;
    try { ctx.letterSpacing = `${Math.round(ts * 0.55)}px`; } catch (e) {}
    ctx.fillStyle = '#ffeecf';
    ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowOffsetY = 2; ctx.shadowBlur = 3;
    ctx.fillText(tag, W / 2, H - Math.max(H * 0.025, 8));
    ctx.shadowColor = 'transparent';
    try { ctx.letterSpacing = '0px'; } catch (e) {}
  }
}

function drawVignette(ctx, W, H) {
  const r = Math.max(W, H) * 0.75;
  const g = ctx.createRadialGradient(W / 2, H / 2, r * 0.45, W / 2, H / 2, r);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(2,0,10,0.42)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

function drawGrain(ctx, W, H) {
  const rand = mulberry32(20261121);
  const n = Math.floor((W * H) / 900);
  for (let i = 0; i < n; i++) {
    const x = rand() * W, y = rand() * H, a = rand() * 0.09;
    ctx.fillStyle = rand() > 0.5 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a})`;
    ctx.fillRect(x, y, 1.4, 1.4);
  }
}

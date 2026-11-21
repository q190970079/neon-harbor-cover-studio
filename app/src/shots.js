// shots.js — screenshot scene staging for Neon Harbor Cover Studio.
// Loaded by studio.js only when the URL carries a ?shot= parameter.
//   ?shot=cover|editor&layout=hero&theme=sunset&title=...&tagline=...
//   &photos=hero,boat,deco,boulevard&size=1920x1080
// In cover mode the chrome is hidden and the canvas fills the viewport,
// so a headless screenshot captures the finished cover and nothing else.
import { applyScene, els } from './studio.js';

async function stage() {
  const q = new URLSearchParams(window.location.search);
  const mode = q.get('shot') || 'cover';
  const photosParam = q.get('photos');
  const scene = {
    layout: q.get('layout') || undefined,
    theme: q.get('theme') || undefined,
    title: q.get('title') !== null ? q.get('title') : undefined,
    tagline: q.get('tagline') !== null ? q.get('tagline') : undefined,
    size: q.get('size') || undefined,
    photos: photosParam ? photosParam.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
  };

  if (mode === 'cover') {
    document.body.classList.add('cover-mode');
    if (els.canvas) els.canvas.classList.add('cover-canvas');
  }

  await applyScene(scene);

  // Fonts and the last photo decode can land a frame late; wait two
  // frames after staging before declaring the shot ready.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      window.__shotReady = true;
    });
  });
}

stage();

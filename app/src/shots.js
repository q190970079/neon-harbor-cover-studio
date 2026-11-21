// Screenshot scene loader: reads URL params, loads sample photos,
// applies the scene, hides controls in cover mode and signals readiness.
export async function initShots(studio) {
  const q = new URLSearchParams(location.search);
  const shot = q.get('shot');
  if (!shot) return false;
  if (q.get('layout')) studio.state.layout = q.get('layout');
  if (q.get('theme')) studio.state.theme = q.get('theme');
  if (q.get('title') != null) studio.state.title = q.get('title');
  if (q.get('tagline') != null) studio.state.tagline = q.get('tagline');
  if (q.get('size')) {
    const [w, h] = q.get('size').split('x').map(Number);
    if (w && h) { studio.state.exportW = w; studio.state.exportH = h; studio.canvas.width = w; studio.canvas.height = h; }
  }
  const names = (q.get('photos') || 'hero.jpg,boat.jpg,boulevard.jpg,deco.jpg')
    .split(',').map((s) => s.trim()).filter(Boolean);
  await studio.loadSamples(names, true);
  studio.syncControls();
  if (shot === 'cover') { document.body.classList.add('cover-mode'); studio.state.showSelection = false; }
  studio.redraw();
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  window.__shotReady = true;
  return true;
}

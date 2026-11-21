// Fixed scenes for screenshots, driven by the ?shot= query the page was opened with.
//   ?shot=cover   — the cover alone, full viewport, at the scene's export size.
//   ?shot=editor  — the whole editor, with the scene's sample photos loaded.
// Scene parameters, all optional:
//   layout   syndicate | strips | banner          (default syndicate)
//   theme    sunset | neon | golden | midnight    (default sunset)
//   title    the cover's title words              (default NEON HARBOR)
//   tagline  the spaced capitals over the title   (default SUNSET SYNDICATE)
//   photos   comma-separated sample names, no extension (default heroine,chase,skyline,boulevard)
//   size     an export size such as 1920x1080     (cover scenes only; default 1080x1080)
// The scene is applied through the helpers main.js passes in, and window.__shotReady is
// set after two animation frames once the images are drawn, so a screenshot tool can
// wait for exactly the moment the scene is on screen.

const DEFAULT_PHOTOS = 'heroine,chase,skyline,boulevard';

export async function runShot(shot, query, helpers) {
  const scene = {
    layout: query.get('layout') ?? 'syndicate',
    theme: query.get('theme') ?? 'sunset',
    title: query.get('title') ?? 'NEON HARBOR',
    tagline: query.get('tagline') ?? 'SUNSET SYNDICATE',
    size: query.get('size') ?? '1080x1080',
  };
  const names = (query.get('photos') ?? DEFAULT_PHOTOS).split(',').map((n) => n.trim()).filter(Boolean);
  const photos = await helpers.loadSamples(names);
  if (shot === 'cover') document.body.classList.add('shot-cover');
  helpers.applyScene(shot, scene, photos);
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}

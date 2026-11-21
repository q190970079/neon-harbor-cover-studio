// shots.js — fixed scenes for screenshots, driven entirely by the URL.
//
// The editor is a live tool, which makes it a poor camera subject; a shot
// scene is the opposite: ?shot=cover or ?shot=editor plus layout, theme,
// title, tagline, photos and size parameters describe one exact frame.
// runShot applies that frame through the editor's own hooks, and once the
// frame has painted twice it raises window.__shotReady so the capture
// script knows the pixels are final.
//
//   ?shot=cover&layout=hero&theme=sunset&photos=hero,boat,deco,boulevard
//     &title=NEON%20HARBOR&tagline=SUNSET%20SYNDICATE&size=1920x1080
//   ?shot=editor&layout=hero&theme=sunset&photos=hero,boat,deco,boulevard

/** Parse a "1920x1080" style size, falling back to the given default. */
function parseSize(text, fallback) {
  const m = /^(\d+)x(\d+)$/.exec(text || '');
  if (!m) return fallback;
  return { w: Number(m[1]), h: Number(m[2]) };
}

/** Resolve after two animation frames: the scene has definitely painted. */
function afterTwoFrames() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });
}

/**
 * Apply the shot scene named in the URL, if there is one.
 * `editor` is the hooks object studio.js builds: its canvas, a sample
 * loader, a state patcher and a redraw. Returns true when a scene ran.
 */
export async function runShot(editor) {
  const params = new URLSearchParams(location.search);
  const shot = params.get('shot');
  if (!shot) return false;

  const names = (params.get('photos') || 'hero,boat,deco,boulevard')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const patch = {};
  if (params.get('layout')) patch.layout = params.get('layout');
  if (params.get('theme')) patch.theme = params.get('theme');
  if (params.get('title')) patch.title = params.get('title');
  if (params.get('tagline')) patch.tagline = params.get('tagline');

  if (shot === 'cover') {
    // The cover alone fills the viewport: the page's cover mode hides
    // every control, and the canvas takes the scene's export size so the
    // capture is the cover at its own aspect, drawn by the app itself.
    document.body.classList.add('shot-cover');
    const size = parseSize(params.get('size'), { w: 1920, h: 1080 });
    editor.canvas.width = size.w;
    editor.canvas.height = size.h;
  }

  await editor.loadSamplePhotos(names);
  if (shot === 'cover') patch.highlight = -1;
  editor.setPatch(patch);
  editor.syncControls();
  editor.redraw();
  await afterTwoFrames();
  window.__shotReady = true;
  return true;
}

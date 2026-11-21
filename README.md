# neon-harbor-cover-studio

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/q190970079/neon-harbor-cover-studio/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/q190970079/neon-harbor-cover-studio/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Neon Harbor Cover Studio is a small offline web app that turns your own
photos into a multi-panel, open-world crime-game style cover for the
fictional game **NEON HARBOR** — tagline *SUNSET SYNDICATE*. Everything
is original: the name, the artwork and the type treatment are made in
the browser with plain canvas code, and nothing is uploaded anywhere.
Drop in holiday snaps, car photos or portraits, arrange them across
slanted collage panels, grade the whole cover with a colour theme, and
export a print-ready PNG.

## Features

- Three slanted multi-panel layouts — Hero + Three, Slanted Stripes and
  Banner + Three — built from clipped polygons with pale seam lines.
- Four colour themes (sunset orange/pink/violet, neon cyan/magenta,
  gold amber, midnight blue/teal) applied as gradient washes plus
  canvas-filter saturation and contrast.
- Your photos, your cover: add multiple images at once, swap which
  photo each panel shows, click a panel to select it and drag directly
  on the canvas to pan its photo, with per-panel zoom and X/Y offset
  sliders.
- Stacked bold-italic title type with a gradient fill, heavy outline
  and offset shadow, plus a letter-spaced uppercase tagline — set in
  system fonts only, so it works fully offline.
- Finishing touches: a vignette and a seeded, deterministic film grain
  that looks identical on every render and every export.
- One-click PNG export at exactly 1080×1080, 1080×1350 or 1920×1080,
  rendered fresh on an offscreen canvas.
- A bundled sample set (a coral-suited driver at sunset, a pier and
  speedboat at blue hour, a pastel deco skyline, plus two kit photos)
  loads on startup, so the preview is never empty.

## Run it

Serve the folder and open the studio:

```
node serve.ts
```

Then visit http://localhost:8080 in a browser. No build step and no
network access are needed — the app is static files under `app/`.

To package the entry the way make.fun expects:

```
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

<sub>Entered on [make.fun](https://make.fun/?ref=k2f0jehz&utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards</sub>

https://make.fun/r/k2f0jehz

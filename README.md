# neon-harbor-cover-studio

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/q190970079/neon-harbor-cover-studio/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/q190970079/neon-harbor-cover-studio/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Neon Harbor Cover Studio is a fully offline web app that turns your own
photographs into a multi-panel, open-world crime-game style cover for the
fictional game **NEON HARBOR — SUNSET SYNDICATE**. Everything runs locally
in the browser: no build step, no network requests, no uploads. Your
photos never leave your machine.

## Features

- Three slanted multi-panel layouts (Hero + Trio, Slanted Stripes,
  Banner + Three) built from clipped polygons with pale gutter lines
- Four colour themes — Sunset, Neon, Gold and Midnight — applied with
  gradient washes plus canvas saturation/contrast grading
- Bring your own photos (multi-file picker) or start from the bundled
  sample set; every panel can be swapped to any loaded photo
- Click a panel on the cover and drag to reframe its photo, with
  per-photo zoom and horizontal/vertical pan sliders
- Stacked bold italic title with gradient fill, dark outline and offset
  shadow, plus a letter-spaced uppercase tagline
- Vignette and deterministic seeded grain, so renders are reproducible
- One-click PNG export at exactly 1080x1080, 1080x1350 or 1920x1080

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in your browser.

To package the app the way make.fun expects:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

<sub>Entered on [make.fun](https://make.fun/?ref=k2f0jehz&utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards</sub>

https://make.fun/r/k2f0jehz

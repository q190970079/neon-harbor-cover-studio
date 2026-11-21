# neon-harbor-cover-studio

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/q190970079/neon-harbor-cover-studio/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/q190970079/neon-harbor-cover-studio/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Neon Harbor Cover Studio is a static, offline web app that turns your own
photos and a caption into multi-panel cover art for an imaginary open-world
crime game — NEON HARBOR, a sunset-soaked harbour city of boulevards,
marinas and deco towers. Everything is original: the panels, the lettering
and the sample photos were all made for this studio, and your photos never
leave your machine.

What it does:

- **Multi-panel poster layouts** — three collages built from polygons with
  diagonal cuts and light gutters: Hero Plus Three, Diagonal Strips, and
  Banner Over Trio.
- **Any photo** — add several photos from your machine (or start from the
  built-in sample set), point each panel at any photo, then frame it:
  click a panel on the cover, drag the photo inside its frame, and fine
  tune with zoom and shift sliders.
- **Four colour grades** — Sunset Vice, Neon Night, Golden Hour and
  Midnight Run, each a mix of canvas-filter saturation/contrast and a
  gradient wash, finished with a vignette and deterministic film grain.
- **Bold lettering** — your title stacked in heavy italic with a gradient
  fill, dark outline and offset shadow, and your tagline spaced above it.
  Both are editable live.
- **Fast export** — one click renders a PNG at 1080 × 1080, 1080 × 1350
  or 1920 × 1080, ready to post.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. There is no build
step and the app makes no network requests: serve the `app/` folder with
any static file server and it just works.

To hand the entry in the way the competition runs it:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

That copies `app/` and `screenshots/` into `out/` and writes the
`dossier.json` summary with the vendored make.fun library.

---
<sub>Entered on [make.fun](https://make.fun/?ref=k2f0jehz&utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards</sub>

Referral: https://make.fun/r/k2f0jehz

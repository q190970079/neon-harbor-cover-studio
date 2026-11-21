# neon-harbor-cover-studio

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/q190970079/neon-harbor-cover-studio/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/q190970079/neon-harbor-cover-studio/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

**Neon Harbor Cover Studio** is a static, offline web app that turns your own photos and a caption into multi-panel cover art for an original open-world crime game — **NEON HARBOR**, tagline *SUNSET SYNDICATE*. Everything is drawn in your browser from your photos; nothing is uploaded, and no artwork, logo or font from any existing game is used.

## What it does

- **Multi-panel poster layouts** with diagonal cuts and white gutters, drawn on canvas:
  - *Syndicate Grid* — a tall hero panel plus three supporting panels
  - *Postcard Strips* — three wide diagonal strips
  - *Hero Banner* — one wide banner over three upright panels
- **Any photo**: add several photos from your own machine; panels cycle through them, and each panel's photo can be swapped from the panel list. Click a panel (or its row) to select it, drag on the cover to pan its photo, and fine-tune with zoom and X/Y sliders.
- **Words & grades**: editable title and tagline, set in stacked, heavy italic lettering with a gradient fill, dark stroke and offset shadow. Four colour grades — Sunset Vice, Neon Night, Golden Hour and Midnight Run — wash every panel, finished with a vignette and deterministic film grain.
- **Fast export**: one button renders an offscreen canvas and downloads a PNG at exactly 1080 × 1080, 1080 × 1350 or 1920 × 1080. The live preview updates on every change.
- **Samples included**: five model-made harbour photos (a pink-blazer driver and her turquoise convertible, a marina chase at dusk, a deco skyline, a boulevard and a pier) load with one click, so the first cover you see is a finished one.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 — pick photos, a layout and a grade, and export your PNG.

The entry is handed in by `main.ts` (Node 22, standard library only), which copies `app/` and `screenshots/` to the output directory and writes the dossier the judges read:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

<sub>Entered on [make.fun](https://make.fun/?ref=k2f0jehz&utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards</sub>

Join via my referral link: https://make.fun/r/k2f0jehz

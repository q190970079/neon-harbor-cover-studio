// Neon Harbor Cover Studio — make.fun entry for gta6-cover-art-01.
//
// The studio is a fully offline, dependency-free web app that turns a
// player's own photographs into a multi-panel open-world crime-game
// style cover: slanted collage panels, four colour-graded themes,
// stacked display type for the NEON HARBOR title and its SUNSET
// SYNDICATE tagline, plus one-click PNG export at poster sizes.
// Everything on the cover is original — no publisher logos, artwork,
// characters or typefaces — and the whole app lives under app/ with
// the staged screenshots under screenshots/.
//
// This packager copies the app (and the screenshots, when present)
// into the output directory and stamps it with a make.fun dossier.
import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });

const shotsDir = join(here, 'screenshots');
if (existsSync(shotsDir)) {
  cpSync(shotsDir, join(out, 'screenshots'), { recursive: true });
}

const dossier = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
});
writeFileSync(join(out, 'dossier.json'), JSON.stringify(dossier, null, 2) + '\n');

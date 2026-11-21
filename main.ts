/**
 * Neon Harbor Cover Studio - make.fun entry point.
 *
 * Neon Harbor Cover Studio is an offline, browser-based cover maker:
 * it arranges your own photographs into slanted multi-panel collages,
 * grades them with sunset / neon / gold / midnight themes, stacks bold
 * display type over the art, and exports a finished PNG cover. This
 * script packages the static app (and its screenshots, when present)
 * into the output directory together with the make.fun dossier.
 */
import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}
const dossier = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
});
writeFileSync(join(out, 'dossier.json'), JSON.stringify(dossier, null, 2) + '\n');

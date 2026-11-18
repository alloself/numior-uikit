import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { kitManifest } from '../../../apps/docs/.vitepress/reference/kit-manifest.ts';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const manifest = kitManifest(root);

writeFileSync(new URL('../dist/manifest.json', import.meta.url), `${JSON.stringify(manifest)}\n`);

console.log(`Kit manifest: ${Object.keys(manifest.components).length} components.`);

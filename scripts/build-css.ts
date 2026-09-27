import { cp, mkdir, readdir, writeFile } from 'node:fs/promises';
import { inlineCss } from './vite-package-assets.ts';

const CSS_WORKSPACES = ['tokens', 'utilities', 'tailwind'];

const name = process.argv[2];

if (name === undefined || !CSS_WORKSPACES.includes(name)) {
  throw new Error('Unknown CSS workspace');
}

const root = new URL(`../packages/${name}/`, import.meta.url);
const source = new URL('src/', root);
const dist = new URL('dist/', root);

await mkdir(dist, { recursive: true });

for (const file of await readdir(source)) {
  if (file.endsWith('.css')) {
    await writeFile(new URL(file, dist), await inlineCss(new URL(file, source)));
  }
}

await cp(new URL('../LICENSE', import.meta.url), new URL('LICENSE', dist));

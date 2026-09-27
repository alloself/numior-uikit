import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildReference } from '../.vitepress/reference/build.ts';
import { loadDocsDir } from '../.vitepress/reference/docs.ts';

const docsDir = fileURLToPath(new URL('../api', import.meta.url));
const root = fileURLToPath(new URL('../../..', import.meta.url));
const outFile = fileURLToPath(new URL('../.reference/bundle.json', import.meta.url));
const check = process.argv.includes('--check');

const { bundle, problems, undocumented } = await buildReference(root, await loadDocsDir(docsDir));

mkdirSync(join(outFile, '..'), { recursive: true });
writeFileSync(outFile, JSON.stringify(bundle));

console.log(
  `Docs reference: ${Object.keys(bundle.components).length} components, ${undocumented.length} without descriptions, ${bundle.declarations.length} declarations, ${bundle.tokens.length} tokens, ${bundle.icons.length} icons.`,
);

if (problems.length > 0) {
  console.error(problems.join('\n'));
  if (check) {
    process.exit(1);
  }
}

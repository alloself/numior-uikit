import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildReference } from '../.vitepress/reference/build.ts';
import { composableCoverage } from '../.vitepress/reference/coverage.ts';
import { loadDocsDir } from '../.vitepress/reference/docs.ts';

const docsDir = fileURLToPath(new URL('../api', import.meta.url));
const root = fileURLToPath(new URL('../../..', import.meta.url));
const pagesRoot = fileURLToPath(new URL('..', import.meta.url));
const outFile = fileURLToPath(new URL('../.reference/bundle.json', import.meta.url));
const check = process.argv.includes('--check');
const SKIPPED_DIRS = new Set(['node_modules', '.reference', '.vitepress', 'examples', 'api']);

const pagesOf = (dir: string): string[] =>
  readdirSync(dir)
    .toSorted()
    .flatMap((name) => {
      const path = join(dir, name);

      if (statSync(path).isDirectory()) {
        return SKIPPED_DIRS.has(name) ? [] : pagesOf(path);
      }
      return name.endsWith('.md') ? [path] : [];
    });

const { bundle, problems, undocumented } = await buildReference(root, await loadDocsDir(docsDir));

const pages = Object.fromEntries(
  pagesOf(pagesRoot).map((file) => [relative(pagesRoot, file), readFileSync(file, 'utf8')]),
);

const allProblems = [...problems, ...composableCoverage(bundle.declarations, pages)];

mkdirSync(join(outFile, '..'), { recursive: true });
writeFileSync(outFile, JSON.stringify(bundle));

console.log(
  `Docs reference: ${Object.keys(bundle.components).length} components, ${undocumented.length} without descriptions, ${bundle.declarations.length} declarations, ${bundle.tokens.length} tokens, ${bundle.icons.length} icons.`,
);

if (allProblems.length > 0) {
  console.error(allProblems.join('\n'));
  if (check) {
    process.exit(1);
  }
}

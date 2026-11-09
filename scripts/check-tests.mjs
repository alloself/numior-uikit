import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const ROOTS = [
  'packages/primitives/test',
  'packages/vue/test',
  'packages/forms/test',
  'packages/table/test',
  'packages/editor-core/test',
  'packages/content/test',
  'packages/editor-vue/test',
  'packages/spreadsheet/test',
  'packages/charts/test',
  'packages/collaboration/test',
];

const RULES = [
  {
    pattern: /await nextTick\(\);\s*await nextTick\(\);/g,
    message: 'two nextTick() calls in a row: remove the render chain in the component instead',
  },
];

const walk = async (dir) => {
  const entries = await readdir(dir, { withFileTypes: true });

  const files = await Promise.all(
    entries.map((entry) => {
      const path = join(dir, entry.name);
      return entry.isDirectory() ? walk(path) : path.endsWith('.ts') ? [path] : [];
    }),
  );

  return files.flat();
};

const lineOf = (source, index) => source.slice(0, index).split('\n').length;

const findings = [];

for (const root of ROOTS) {
  for (const file of await walk(root)) {
    const source = await readFile(file, 'utf8');
    for (const rule of RULES) {
      for (const match of source.matchAll(rule.pattern)) {
        findings.push(`${file}:${lineOf(source, match.index)} ${rule.message}`);
      }
    }
  }
}

if (findings.length > 0) {
  console.error(findings.join('\n'));
  process.exit(1);
}

console.log('tests: one tick per action');

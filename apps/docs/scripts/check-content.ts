import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { checkContent } from '../.vitepress/content/check.ts';
import {
  baselineOf,
  collectGuardProblems,
  parseBaseline,
  settle,
} from '../.vitepress/content/guards.ts';

const docsRoot = fileURLToPath(new URL('..', import.meta.url));
const repoRoot = fileURLToPath(new URL('../../..', import.meta.url));

const baselineFile = fileURLToPath(
  new URL('../.vitepress/content/guard-baseline.json', import.meta.url),
);

const guardProblems = await collectGuardProblems(docsRoot, repoRoot);

if (process.argv.includes('--write-baseline')) {
  writeFileSync(baselineFile, `${JSON.stringify(baselineOf(guardProblems), null, 2)}\n`);
  console.log(`Guard baseline rewritten: ${guardProblems.length} findings stay excused.`);
  process.exit(0);
}

const baseline = parseBaseline(readFileSync(baselineFile, 'utf8'));
const { fresh, stale } = settle(guardProblems, baseline);

const problems = [
  ...checkContent(docsRoot),
  ...fresh.map((problem) => `${problem.file}: ${problem.rule} — ${problem.text}`),
  ...stale.map((entry) => `guard-baseline.json: ${entry} has no findings, remove the entry`),
];

if (problems.length > 0) {
  console.error(problems.join('\n'));
  process.exit(1);
}

const excused = Object.values(baseline).reduce((count, files) => count + files.length, 0);

console.log(
  `Docs content: no style blocks, prose within the writing rule, ${excused} baseline entries left.`,
);

import { fileURLToPath } from 'node:url';
import { checkContent } from '../.vitepress/content/check.ts';
import { collectGuardProblems } from '../.vitepress/content/guards.ts';

const docsRoot = fileURLToPath(new URL('..', import.meta.url));
const repoRoot = fileURLToPath(new URL('../../..', import.meta.url));

const guardProblems = await collectGuardProblems(docsRoot, repoRoot);

const problems = [
  ...checkContent(docsRoot),
  ...guardProblems.map((problem) => `${problem.file}: ${problem.rule} — ${problem.text}`),
];

if (problems.length > 0) {
  console.error(problems.join('\n'));
  process.exit(1);
}

console.log('Docs content: no style blocks, prose and texts within the writing rule.');

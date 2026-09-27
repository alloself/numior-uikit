import { fileURLToPath } from 'node:url';
import { checkDist } from '../.vitepress/content/check.ts';

const problems = checkDist(fileURLToPath(new URL('../.vitepress/dist', import.meta.url)));

if (problems.length > 0) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log('Docs build: every component tag resolved.');

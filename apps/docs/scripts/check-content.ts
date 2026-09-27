import { fileURLToPath } from 'node:url';
import { checkContent } from '../.vitepress/content/check.ts';

const problems = checkContent(fileURLToPath(new URL('..', import.meta.url)));

if (problems.length > 0) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log('Docs content: no style blocks, prose within the writing rule.');

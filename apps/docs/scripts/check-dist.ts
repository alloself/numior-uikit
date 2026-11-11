import { fileURLToPath } from 'node:url';
import { checkDist } from '../.vitepress/content/check.ts';
import { site } from '../.vitepress/theme/site.ts';

const problems = checkDist(fileURLToPath(new URL('../.vitepress/dist', import.meta.url)), site);

if (problems.length > 0) {
  console.error(problems.join('\n'));
  process.exit(1);
}

console.log(
  'Docs build: component tags resolved, pages described, addresses match the site config.',
);

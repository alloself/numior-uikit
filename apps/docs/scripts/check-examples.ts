import { fileURLToPath } from 'node:url';
import { demoRootOf } from '../.vitepress/examples/demo.ts';
import { compareDemo, compareExamples } from '../.vitepress/examples/parity.ts';
import { exampleNames } from '../.vitepress/examples/modules.ts';

const root = fileURLToPath(new URL('../examples', import.meta.url));
const problems = [...compareExamples(root), ...compareDemo(demoRootOf(root))];

if (problems.length > 0) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log(`Docs examples in parity: ${exampleNames(root).ru.length} per locale.`);

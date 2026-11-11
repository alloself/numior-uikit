import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { compile } from '@tailwindcss/node';
import { compareRules, parseAliases, parseRules } from './css-rules';
import type { CssRule } from './css-rules.types';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const THEME = fileURLToPath(new URL('../../packages/tokens/src/theme.css', import.meta.url));
const LAYER = '@layer components';

const entryFor = (file: string): string =>
  [
    "@import 'tailwindcss/theme' layer(theme);",
    "@import 'tailwindcss/utilities' layer(utilities);",
    `@import '${THEME}' layer(theme);`,
    `@import '${ROOT}${file}';`,
  ].join('\n');

const compiled = async (file: string): Promise<string> => {
  const compiler = await compile(entryFor(file), { base: ROOT, onDependency: () => undefined });

  return compiler.build([]);
};

const kitRules = (output: string): CssRule[] => {
  return parseRules(output).reduce<CssRule[]>((rules, rule) => {
    if (rule.context.startsWith(LAYER)) {
      rules.push({ ...rule, context: rule.context.slice(LAYER.length).trim() });
    }
    return rules;
  }, []);
};

const helperIssues = (output: string): string[] => {
  const helpers = new Set(output.match(/--tw-[a-z-]+/g));

  return helpers.size === 0
    ? []
    : [`helper variables introduced: ${Array.from(helpers).join(', ')}`];
};

const check = async (ref: string, file: string, aliases: Map<string, string>): Promise<number> => {
  const before = parseRules(
    execFileSync('git', ['show', `${ref}:${file}`], { cwd: ROOT }).toString(),
  );

  const output = await compiled(file);
  const after = kitRules(output);
  const issues = [...compareRules(before, after, aliases), ...helperIssues(output)];
  const count = after.reduce((total, rule) => total + rule.declarations.length, 0);

  console.log(`${file}: ${after.length} rules, ${count} declarations, ${issues.length} issues`);

  issues.forEach((issue) => {
    console.log(`  ${issue}`);
  });

  return issues.length;
};

const [ref, ...files] = process.argv.slice(2);

if (ref === undefined || files.length === 0) {
  throw new Error('Usage: node tests/parity/css-cli.ts <git ref> <css file> [more files]');
}

const aliases = parseAliases(await readFile(THEME, 'utf8'));
let total = 0;

for (const file of files) {
  total += await check(ref, file, aliases);
}

process.exitCode = total === 0 ? 0 : 1;

import { execFileSync } from 'node:child_process';
import { posix } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compile } from '@tailwindcss/node';
import { readFileSync } from 'node:fs';
import {
  compareRules,
  foldColorMixFallbacks,
  parseAliases,
  parseFixedKeys,
  parseHelpers,
  parseRules,
} from './css-rules.ts';
import type { CssEnvironment, CssRule } from './css-rules.types.ts';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const THEME_FILE = 'packages/tokens/src/theme.css';
const TAILWIND_THEME = 'node_modules/tailwindcss/theme.css';

const SCOPE_FILES = [
  THEME_FILE,
  'packages/tokens/src/accents.css',
  'apps/docs/.vitepress/theme/numior.css',
];

const LAYER = '@layer components';
const FOREIGN_LAYER = /^@layer (?:theme|base|utilities|properties)\b/;
const RELATIVE_IMPORT = /^@import\s+['"](\.{1,2}\/[^'"]+\.css)['"]\s*;\s*$/gm;

const entryOf = (css: string): string =>
  [
    "@import 'tailwindcss/theme' layer(theme);",
    "@import 'tailwindcss/utilities' layer(utilities);",
    `@import '${ROOT}${THEME_FILE}' layer(theme);`,
    css,
  ].join('\n');

const sourceAt = (ref: string, file: string): string => {
  const source = execFileSync('git', ['show', `${ref}:${file}`], { cwd: ROOT }).toString();

  return source.replace(RELATIVE_IMPORT, (_line, specifier: string) =>
    sourceAt(ref, posix.join(posix.dirname(file), specifier)),
  );
};

const compiled = async (css: string): Promise<string> => {
  const compiler = await compile(entryOf(css), { base: ROOT, onDependency: () => undefined });

  return compiler.build([]);
};

const kitRules = (output: string): CssRule[] => {
  return parseRules(output).reduce<CssRule[]>((rules, rule) => {
    if (FOREIGN_LAYER.test(rule.context)) {
      return rules;
    }

    const context = rule.context.startsWith(LAYER)
      ? rule.context.slice(LAYER.length).trim()
      : rule.context;

    rules.push({ ...rule, context });

    return rules;
  }, []);
};

const read = (file: string): string => readFileSync(`${ROOT}${file}`, 'utf8');

const environmentOf = (ref: string, outputs: readonly string[]): CssEnvironment => {
  return {
    aliases: parseAliases(sourceAt(ref, THEME_FILE)),
    fixed: parseFixedKeys([read(TAILWIND_THEME), read(THEME_FILE)], SCOPE_FILES.map(read)),
    helpers: new Map(outputs.flatMap((output) => Array.from(parseHelpers(output)))),
  };
};

const check = async (ref: string, file: string): Promise<number> => {
  const previous = await compiled(sourceAt(ref, file));
  const output = await compiled(`@import '${ROOT}${file}';`);
  const { rules: before } = foldColorMixFallbacks(kitRules(previous));
  const { rules: after, fallbacks } = foldColorMixFallbacks(kitRules(output));
  const { issues, resets } = compareRules(before, after, environmentOf(ref, [previous, output]));
  const count = after.reduce((total, rule) => total + rule.declarations.length, 0);

  console.log(
    `${file}: ${after.length} rules, ${count} declarations, ${fallbacks} color-mix fallbacks, ${issues.length} issues, ${resets.length} dropped resets`,
  );

  for (const issue of issues) {
    console.log(`  ${issue}`);
  }

  for (const { rule, properties } of resets) {
    console.log(`  resets dropped by ${rule}: ${properties.join(', ')}`);
  }

  return issues.length;
};

const [ref, ...files] = process.argv.slice(2);

if (ref === undefined || files.length === 0) {
  throw new Error('Usage: node tests/parity/css-cli.ts <git ref> <css file> [more files]');
}

let total = 0;

for (const file of files) {
  total += await check(ref, file);
}

process.exitCode = total === 0 ? 0 : 1;

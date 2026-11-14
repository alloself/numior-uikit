import { execFileSync } from 'node:child_process';
import { posix } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compile } from '@tailwindcss/node';
import { compareRules, foldColorMixFallbacks, parseAliases, parseRules } from './css-rules.ts';
import type { CssRule } from './css-rules.types.ts';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const THEME_FILE = 'packages/tokens/src/theme.css';
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

const helperIssues = (output: string): string[] => {
  const helpers = new Set(output.match(/--tw-[a-z-]+/g));

  return helpers.size === 0
    ? []
    : [`helper variables introduced: ${Array.from(helpers).join(', ')}`];
};

const check = async (ref: string, file: string, aliases: Map<string, string>): Promise<number> => {
  const { rules: before } = foldColorMixFallbacks(kitRules(await compiled(sourceAt(ref, file))));

  const output = await compiled(`@import '${ROOT}${file}';`);
  const { rules: after, fallbacks } = foldColorMixFallbacks(kitRules(output));
  const issues = [...compareRules(before, after, aliases), ...helperIssues(output)];
  const count = after.reduce((total, rule) => total + rule.declarations.length, 0);

  console.log(
    `${file}: ${after.length} rules, ${count} declarations, ${fallbacks} color-mix fallbacks, ${issues.length} issues`,
  );

  issues.forEach((issue) => {
    console.log(`  ${issue}`);
  });

  return issues.length;
};

const [ref, ...files] = process.argv.slice(2);

if (ref === undefined || files.length === 0) {
  throw new Error('Usage: node tests/parity/css-cli.ts <git ref> <css file> [more files]');
}

const aliases = parseAliases(sourceAt(ref, THEME_FILE));
let total = 0;

for (const file of files) {
  total += await check(ref, file, aliases);
}

process.exitCode = total === 0 ? 0 : 1;

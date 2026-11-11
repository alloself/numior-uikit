import { fileURLToPath } from 'node:url';
import { compile } from '@tailwindcss/node';

const ROOT = fileURLToPath(new URL('../../../../', import.meta.url));
const LAYER = '@layer components {';
const RELATIVE_IMPORT = /^@import\s+['"]\.{1,2}\/[^'"]+['"]\s*;\s*$/gm;

export const THEME_FILE = fileURLToPath(
  new URL('../../../../packages/tokens/src/theme.css', import.meta.url),
);

const closingOf = (css: string, from: number): number => {
  let depth = 1;
  let at = from;

  while (depth > 0 && at < css.length) {
    depth += css[at] === '{' ? 1 : 0;
    depth -= css[at] === '}' ? 1 : 0;
    at += 1;
  }

  return at;
};

const componentsOf = (css: string): string => {
  const parts: string[] = [];
  let start = css.indexOf(LAYER);

  while (start !== -1) {
    const end = closingOf(css, start + LAYER.length);

    parts.push(css.slice(start + LAYER.length, end - 1));
    start = css.indexOf(LAYER, end);
  }

  return parts.join('\n');
};

export const isLayered = (css: string): boolean => css.includes(LAYER);

export const compiledKitCss = async (css: string): Promise<string> => {
  const own = css.replace(RELATIVE_IMPORT, '');

  const compiler = await compile(`@import '${THEME_FILE}' layer(theme);\n${own}`, {
    base: ROOT,
    onDependency: () => undefined,
  });

  return componentsOf(compiler.build([]));
};

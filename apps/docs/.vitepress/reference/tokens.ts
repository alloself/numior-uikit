import type { TokenReference } from './reference.types.ts';

const THEME_BLOCK_RE = /@theme(?:\s+[a-z]+)*\s*\{([^}]*)\}/g;
const DECLARATION_RE = /--([a-z0-9-]+):\s*([^;]+);/g;
const LIGHT_DARK_RE = /^light-dark\((.*)\)$/s;
const SPACE_RE = /\s+/g;
const OPEN_SPACE_RE = /\(\s+/g;
const CLOSE_SPACE_RE = /\s+\)/g;

const compact = (value: string): string =>
  value.replace(SPACE_RE, ' ').replace(OPEN_SPACE_RE, '(').replace(CLOSE_SPACE_RE, ')').trim();

const splitTopLevel = (value: string): string[] => {
  const parts: string[] = [];
  let depth = 0;
  let current = '';

  for (const char of value) {
    if (char === '(') {
      depth += 1;
    } else if (char === ')') {
      depth -= 1;
    }
    if (char === ',' && depth === 0) {
      parts.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  parts.push(current.trim());
  return parts;
};

const tokenOf = (name: string, value: string): TokenReference => {
  const inner = LIGHT_DARK_RE.exec(value.trim())?.[1];
  const [light, dark] = inner === undefined ? [value.trim()] : splitTopLevel(inner);

  return { name: `--${name}`, group: name.split('-')[0] ?? name, light: light ?? '', dark };
};

const themeBodiesOf = (css: string): string =>
  Array.from(css.matchAll(THEME_BLOCK_RE), ([, body = '']) => body).join('\n');

export const parseThemeTokens = (css: string): TokenReference[] => {
  const tokens = new Map<string, TokenReference>();

  for (const match of themeBodiesOf(css).matchAll(DECLARATION_RE)) {
    const [, name, value] = match;

    if (name === undefined || value === undefined || tokens.has(name)) {
      continue;
    }

    tokens.set(name, tokenOf(name, compact(value)));
  }
  return [...tokens.values()];
};

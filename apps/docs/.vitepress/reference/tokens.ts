import type { TokenReference } from './reference.types.ts';

const DECLARATION_RE = /--nui-([a-z0-9-]+):\s*([^;]+);/g;
const LIGHT_DARK_RE = /^light-dark\((.*)\)$/s;

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

  return { name: `--nui-${name}`, group: name.split('-')[0] ?? name, light: light ?? '', dark };
};

export const parseThemeTokens = (css: string): TokenReference[] => {
  const tokens = new Map<string, TokenReference>();

  for (const match of css.matchAll(DECLARATION_RE)) {
    const [, name, value] = match;

    if (name === undefined || value === undefined || tokens.has(name)) {
      continue;
    }

    tokens.set(name, tokenOf(name, value));
  }
  return [...tokens.values()];
};

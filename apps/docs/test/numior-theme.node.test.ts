import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vite-plus/test';
import { DocsAccent } from '../.vitepress/theme/theme.types';
import { contrastOf, mixColors, parseColor, type Oklab } from './support/color';

type Scheme = 'light' | 'dark';
type Tokens = ReadonlyMap<string, string>;

interface Pair {
  readonly text: string;
  readonly surface: string;
  readonly ratio: number;
}

const AA = 4.5;
const SCHEMES: readonly Scheme[] = ['light', 'dark'];
const ROLES = ['primary', 'secondary', 'success', 'warning', 'error', 'info', 'neutral'];
const TEXTS = ['text', 'text-muted', 'text-subtle', 'primary', 'code-inline'];

const SURFACES = [
  'surface',
  'surface-muted',
  'surface-elevated',
  'surface-overlay',
  'surface-code',
];

const CODE_SURFACES = ['surface-code', 'syntax-highlight'];
const DECLARATION_RE = /(--[a-z0-9-]+|[a-z-]+):\s*([^;{}]+);/gu;
const LIGHT_DARK_RE = /^light-dark\((.+)\)$/su;
const VAR_RE = /^var\(--nui-([a-z0-9-]+)\)$/u;

const SOFT_RE =
  /^oklab\(\s*from color-mix\(in oklab, var\(--nui-([a-z]+)\) (\d+)%, var\(--nui-layer-surface\)\)\s+max\(l, var\(--nui-soft-min-lightness\)\) a b\s*\)$/u;

const MIX_RE = /^color-mix\(in oklab, var\(--nui-([a-z-]+)\) (\d+)%, var\(--nui-([a-z-]+)\)\)$/u;

const BLOCK_RE = /([^{}]+)\{([^{}]*)\}/gu;
const LAYER_RE = /--nui-layer-surface:\s*([^;]+);/gu;

const read = (path: string): string =>
  readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8');

const kitTheme = read('../../../packages/tokens/src/theme.css');
const builtInAccents = read('../../../packages/tokens/src/accents.css');
const numior = read('../.vitepress/theme/numior.css');

const schemeValue = (value: string, scheme: Scheme): string => {
  const inner = LIGHT_DARK_RE.exec(value.trim())?.[1];

  if (inner === undefined) {
    return value.trim();
  }

  const comma = inner.startsWith('oklch') ? inner.indexOf('),') + 1 : inner.indexOf(',');
  const [light, dark] = [inner.slice(0, comma).trim(), inner.slice(comma + 1).trim()];

  return scheme === 'light' ? light : dark;
};

const tokensOf = (css: string, scheme: Scheme, into = new Map<string, string>()): Tokens =>
  [...css.matchAll(DECLARATION_RE)].reduce((tokens, [, name = '', value = '']) => {
    if (name.startsWith('--nui-')) {
      tokens.set(name.slice('--nui-'.length), schemeValue(value, scheme));
    }
    return tokens;
  }, into);

const accentCss = (accent: DocsAccent): string =>
  [...builtInAccents.matchAll(BLOCK_RE)].reduce(
    (css, [, selector = '', body = '']) =>
      selector.includes(`'${accent}'`) ? `${css}\n${body}` : css,
    '',
  );

const colorOf = (tokens: Tokens, name: string): Oklab => {
  const value = tokens.get(name);

  if (value === undefined) {
    throw new Error(`No token ${name}`);
  }

  const reference = VAR_RE.exec(value)?.[1];

  if (reference !== undefined) {
    return colorOf(tokens, reference);
  }

  const [, color, share, base] = MIX_RE.exec(value) ?? [];

  if (color === undefined || base === undefined) {
    return parseColor(value);
  }

  return mixColors(colorOf(tokens, color), colorOf(tokens, base), Number(share) / 100);
};

const softOf = (tokens: Tokens, role: string, layer: string): Oklab => {
  const share = SOFT_RE.exec(tokens.get(`${role}-soft`) ?? '')?.[2];

  if (share === undefined) {
    throw new Error(`No soft mix for ${role}`);
  }

  const [lightness, a, b] = mixColors(
    colorOf(tokens, role),
    colorOf(tokens, layer),
    Number(share) / 100,
  );

  return [Math.max(lightness, Number(tokens.get('soft-min-lightness'))), a, b];
};

const layersOf = (scheme: Scheme): string[] =>
  [...kitTheme.matchAll(LAYER_RE)].map(
    ([, value = '']) => VAR_RE.exec(schemeValue(value, scheme))?.[1] ?? value,
  );

const rolePairs = (tokens: Tokens, roles: readonly string[], scheme: Scheme): Pair[] => [
  ...roles.map((role) => ({
    text: `${role}-foreground`,
    surface: role,
    ratio: contrastOf(colorOf(tokens, `${role}-foreground`), colorOf(tokens, role)),
  })),
  ...roles.flatMap((role) =>
    layersOf(scheme).map((layer) => ({
      text: `${role}-soft-foreground`,
      surface: `${role}-soft on ${layer}`,
      ratio: contrastOf(colorOf(tokens, `${role}-soft-foreground`), softOf(tokens, role, layer)),
    })),
  ),
];

const textPairs = (tokens: Tokens, texts: readonly string[]): Pair[] =>
  texts.flatMap((text) =>
    SURFACES.map((surface) => ({
      text,
      surface,
      ratio: contrastOf(colorOf(tokens, text), colorOf(tokens, surface)),
    })),
  );

const syntaxPairs = (tokens: Tokens): Pair[] =>
  [...tokens.keys()].reduce<Pair[]>((pairs, name) => {
    if (name === 'syntax-highlight' || !/^(?:syntax-|text-subtle$)/u.test(name)) {
      return pairs;
    }

    CODE_SURFACES.forEach((surface) => {
      pairs.push({
        text: name,
        surface,
        ratio: contrastOf(colorOf(tokens, name), colorOf(tokens, surface)),
      });
    });

    return pairs;
  }, []);

const failing = (pairs: readonly Pair[]): string[] =>
  pairs.reduce<string[]>((lines, pair) => {
    if (pair.ratio < AA) {
      lines.push(`${pair.text} on ${pair.surface}: ${pair.ratio.toFixed(2)}`);
    }
    return lines;
  }, []);

describe('Numior theme of the docs site', () => {
  it('holds nothing but kit custom properties on the theme scopes', () => {
    const blocks = [...numior.matchAll(BLOCK_RE)];

    const selectors = blocks.map(([, selector = '']) => selector.trim().replaceAll(/\s+/gu, ' '));

    const properties = blocks.flatMap(([, , body = '']) =>
      [...body.matchAll(DECLARATION_RE)].map(([, name = '']) => name),
    );

    expect(selectors).toEqual([
      ':root:not([data-nui-accent]), [data-nui-theme]:not([data-nui-accent], [data-nui-accent] *)',
    ]);

    expect(properties.filter((name) => !name.startsWith('--nui-'))).toEqual([]);
  });

  it('overrides only tokens that the kit theme declares', () => {
    const known = tokensOf(kitTheme, 'light');
    const own = [...tokensOf(numior, 'light').keys()];

    expect(own.filter((name) => !known.has(name))).toEqual([]);
  });

  it('keeps every text readable on its surface in both schemes', () => {
    const failures = SCHEMES.flatMap((scheme) => {
      const tokens = tokensOf(numior, scheme, new Map(tokensOf(kitTheme, scheme)));

      return failing([
        ...textPairs(tokens, TEXTS),
        ...rolePairs(tokens, ROLES, scheme),
        ...syntaxPairs(tokens),
      ]).map((line) => `${scheme}: ${line}`);
    });

    expect(failures).toEqual([]);
  });

  it('keeps the kit palette readable under every accent of the palette menu', () => {
    const failures = SCHEMES.flatMap((scheme) =>
      Object.values(DocsAccent).flatMap((accent) => {
        const tokens = tokensOf(accentCss(accent), scheme, new Map(tokensOf(kitTheme, scheme)));

        return failing([
          ...textPairs(tokens, ['primary']),
          ...rolePairs(tokens, ['primary'], scheme),
        ]).map((line) => `${accent} ${scheme}: ${line}`);
      }),
    );

    expect(failures).toEqual([]);
  });
});

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

const TEXTS = [
  'color-foreground',
  'color-muted-foreground',
  'color-subtle-foreground',
  'color-primary',
  'color-code-inline',
];

const SURFACES = [
  'color-surface',
  'color-surface-muted',
  'color-surface-elevated',
  'color-surface-overlay',
  'color-surface-code',
];

const CODE_SURFACES = ['color-surface-code', 'color-syntax-highlight'];

const PANELS = [
  'color-surface',
  'color-surface-muted',
  'color-surface-elevated',
  'color-surface-overlay',
];

const DARK_LIFT = 0.03;
const SITE_SCOPE = '.docs-theme--numior';
const HOOK_PREFIX = '--color-theme-';
const UNSET = 'initial';
const DECLARATION_RE = /(--[a-z0-9-]+|[a-z-]+):\s*([^;{}]+);/gu;
const LIGHT_DARK_RE = /^light-dark\((.+)\)$/su;
const VAR_RE = /^var\(--([a-z0-9-]+)(?:,\s*(.+))?\)$/su;

const SOFT_RE =
  /^oklab\(\s*from color-mix\(in oklab, var\(--color-([a-z]+)\) (\d+)%, var\(--color-surface\)\)\s+max\(l, var\(--soft-min-lightness\)\) a b\s*\)$/u;

const MIX_RE = /^color-mix\(in oklab, var\(--([a-z-]+)\) (\d+)%, var\(--([a-z-]+)\)\)$/u;
const BLOCK_RE = /([^{}]+)\{([^{}]*)\}/gu;
const THEME_BLOCK_RE = /@theme(?:\s+[a-z]+)*\s*\{([^}]*)\}/gu;
const HOOK_RE = /^(--[a-z0-9-]+):\s*var\((--color-theme-[a-z0-9-]+),/u;

const read = (path: string): string =>
  readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8');

const kitTheme = read('../../../packages/tokens/src/theme.css');
const builtInAccents = read('../../../packages/tokens/src/accents.css');
const numior = read('../.vitepress/theme/numior.css');
const printed = read('../guide/snippets/numior-theme.css');

const squash = (value: string): string =>
  value.replaceAll(/\s+/gu, ' ').replaceAll(/\(\s+/gu, '(').replaceAll(/\s+\)/gu, ')').trim();

const declared = (css: string): string[] =>
  [...css.matchAll(DECLARATION_RE)].map(([, name = '', value = '']) => `${name}: ${squash(value)}`);

const themeBlocksOf = (css: string): string =>
  [...css.matchAll(THEME_BLOCK_RE)].map(([, body = '']) => body).join('\n');

const hookedKeys: ReadonlyMap<string, string> = new Map(
  declared(themeBlocksOf(kitTheme)).reduce<[string, string][]>((pairs, line) => {
    const [, key, hook] = HOOK_RE.exec(line) ?? [];

    if (key !== undefined && hook !== undefined) {
      pairs.push([hook, key]);
    }
    return pairs;
  }, []),
);

const asThemeKeys = (lines: readonly string[]): string[] =>
  lines.map((line) => {
    const name = line.slice(0, line.indexOf(':'));

    return `${hookedKeys.get(name) ?? name}${line.slice(name.length)}`;
  });

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
    if (name.startsWith('--')) {
      tokens.set(name.slice('--'.length), schemeValue(squash(value), scheme));
    }
    return tokens;
  }, into);

const kitTokens = (scheme: Scheme): Map<string, string> =>
  new Map(tokensOf(themeBlocksOf(kitTheme), scheme));

const accentCss = (accent: DocsAccent): string =>
  [...builtInAccents.matchAll(BLOCK_RE)].reduce(
    (css, [, selector = '', body = '']) =>
      selector.trim() === `.nui-theme--accent-${accent}` ? `${css}\n${body}` : css,
    '',
  );

const withFallback = (tokens: Tokens, name: string, fallback: string | undefined): Tokens => {
  const value = tokens.get(name);
  const unset = value === undefined || value === UNSET;

  return unset && fallback !== undefined ? new Map([...tokens, [name, fallback]]) : tokens;
};

const colorOf = (tokens: Tokens, name: string): Oklab => {
  const value = tokens.get(name);

  if (value === undefined) {
    throw new Error(`No token ${name}`);
  }

  const [, reference, fallback] = VAR_RE.exec(value) ?? [];

  if (reference !== undefined) {
    return colorOf(withFallback(tokens, reference, fallback), reference);
  }

  const [, color, share, base] = MIX_RE.exec(value) ?? [];

  if (color === undefined || base === undefined) {
    return parseColor(value);
  }

  return mixColors(colorOf(tokens, color), colorOf(tokens, base), Number(share) / 100);
};

const softOf = (tokens: Tokens, role: string): Oklab => {
  const share = SOFT_RE.exec(tokens.get(`color-${role}-soft`) ?? '')?.[2];

  if (share === undefined) {
    throw new Error(`No soft mix for ${role}`);
  }

  const [lightness, a, b] = mixColors(
    colorOf(tokens, `color-${role}`),
    colorOf(tokens, 'color-surface'),
    Number(share) / 100,
  );

  return [Math.max(lightness, Number(tokens.get('soft-min-lightness'))), a, b];
};

const rolePairs = (tokens: Tokens, roles: readonly string[]): Pair[] => [
  ...roles.map((role) => ({
    text: `color-${role}-foreground`,
    surface: `color-${role}`,
    ratio: contrastOf(
      colorOf(tokens, `color-${role}-foreground`),
      colorOf(tokens, `color-${role}`),
    ),
  })),
  ...roles.map((role) => ({
    text: `color-${role}-soft-foreground`,
    surface: `color-${role}-soft`,
    ratio: contrastOf(colorOf(tokens, `color-${role}-soft-foreground`), softOf(tokens, role)),
  })),
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
    if (name === 'color-syntax-highlight' || !/^color-(?:syntax-|subtle-foreground$)/u.test(name)) {
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

const blendingSoft = (tokens: Tokens, roles: readonly string[], scheme: Scheme): string[] =>
  roles.flatMap((role) => {
    const [soft] = softOf(tokens, role);

    return PANELS.reduce<string[]>((lines, panel) => {
      const [surface] = colorOf(tokens, panel);
      const apart = scheme === 'dark' ? soft - surface >= DARK_LIFT : soft < surface;

      if (apart) {
        return lines;
      }
      lines.push(`${role}-soft ${soft.toFixed(3)} on ${panel} ${surface.toFixed(3)}`);
      return lines;
    }, []);
  });

const failing = (pairs: readonly Pair[]): string[] =>
  pairs.reduce<string[]>((lines, pair) => {
    if (pair.ratio < AA) {
      lines.push(`${pair.text} on ${pair.surface}: ${pair.ratio.toFixed(2)}`);
    }
    return lines;
  }, []);

describe('Numior theme of the docs site', () => {
  it('holds theme keys and docs hooks on one class scope', () => {
    const blocks = [...numior.matchAll(BLOCK_RE)];

    const selectors = blocks.map(([, selector = '']) => selector.trim().replaceAll(/\s+/gu, ' '));

    const properties = blocks.flatMap(([, , body = '']) =>
      [...body.matchAll(DECLARATION_RE)].map(([, name = '']) => name),
    );

    expect(selectors).toEqual([SITE_SCOPE]);
    expect(properties.filter((name) => !name.startsWith('--'))).toEqual([]);
  });

  it('lets every built-in accent drop the own soft text and highlight of a theme', () => {
    const accents = [...builtInAccents.matchAll(BLOCK_RE)].map(([, , body = '']) => declared(body));

    const resets = [...hookedKeys.keys()].map((hook) => `${hook}: ${UNSET}`);

    expect(hookedKeys.size).toBe(2);
    expect(accents.filter((lines) => resets.some((line) => !lines.includes(line)))).toEqual([]);
  });

  it('prints in the guide the same values under the theme keys', () => {
    expect(declared(themeBlocksOf(printed))).toEqual(asThemeKeys(declared(numior)));
  });

  it('overrides only base keys of the kit and hooks that the docs theme reads', () => {
    const known = tokensOf(kitTheme, 'light');
    const own = [...tokensOf(numior, 'light').keys()].map((name) => `--${name}`);

    expect(
      own.filter((name) => !name.startsWith(HOOK_PREFIX) && !known.has(name.slice(2))),
    ).toEqual([]);

    expect(own.filter((name) => name.startsWith(HOOK_PREFIX) && !hookedKeys.has(name))).toEqual([]);
  });

  it('keeps every text readable on its surface in both schemes', () => {
    const failures = SCHEMES.flatMap((scheme) => {
      const tokens = tokensOf(numior, scheme, kitTokens(scheme));

      return failing([
        ...textPairs(tokens, TEXTS),
        ...rolePairs(tokens, ROLES),
        ...syntaxPairs(tokens),
      ]).map((line) => `${scheme}: ${line}`);
    });

    expect(failures).toEqual([]);
  });

  it('fills a choice with one soft colour that stands apart from every panel it sits on', () => {
    const failures = SCHEMES.flatMap((scheme) => {
      const kit = kitTokens(scheme);
      const site = tokensOf(numior, scheme, kitTokens(scheme));

      const accents = Object.values(DocsAccent).flatMap((accent) =>
        blendingSoft(
          tokensOf(accentCss(accent), scheme, kitTokens(scheme)),
          ['primary'],
          scheme,
        ).map((line) => `${accent}: ${line}`),
      );

      return [
        ...blendingSoft(kit, ROLES, scheme).map((line) => `kit: ${line}`),
        ...blendingSoft(site, ROLES, scheme).map((line) => `numior: ${line}`),
        ...accents,
      ].map((line) => `${scheme} ${line}`);
    });

    expect(failures).toEqual([]);
  });

  it('keeps the kit palette readable under every accent of the palette menu', () => {
    const failures = SCHEMES.flatMap((scheme) =>
      Object.values(DocsAccent).flatMap((accent) => {
        const tokens = tokensOf(accentCss(accent), scheme, kitTokens(scheme));

        return failing([
          ...textPairs(tokens, ['color-primary']),
          ...rolePairs(tokens, ['primary']),
        ]).map((line) => `${accent} ${scheme}: ${line}`);
      }),
    );

    expect(failures).toEqual([]);
  });
});

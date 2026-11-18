import { sortBy } from 'lodash-es';
import type { TokenReference } from '../reference/reference.types';
import {
  TokenDerivationKind,
  TokenSample,
  TokenSection,
  type TokenDerivation,
  type TokenLine,
  type TokenRow,
} from './theme.types.ts';

interface SectionRule {
  readonly section: TokenSection;
  readonly pattern: RegExp;
}

interface SampleRule {
  readonly sample: TokenSample;
  readonly pattern: RegExp;
}

const SECTION_RULES: readonly SectionRule[] = [
  {
    section: TokenSection.Code,
    pattern: /^(?:color-surface-code|color-syntax-|color-code-|color-chart-)/,
  },
  {
    section: TokenSection.Surfaces,
    pattern: /^color-(?:surface|backdrop|foreground|muted-foreground|subtle-foreground|border)/,
  },
  {
    section: TokenSection.Tones,
    pattern:
      /^(?:color-(?:primary|secondary|success|warning|error|info|neutral)|soft-|neutral-muted-mix$)/,
  },
  {
    section: TokenSection.States,
    pattern:
      /^(?:color-ring$|focus-|field-ring|opacity-disabled|state-|color-hover$|color-pressed$)/,
  },
  { section: TokenSection.Shape, pattern: /^radius/ },
  { section: TokenSection.Sizes, pattern: /^(?:spacing|text-control)/ },
  {
    section: TokenSection.Type,
    pattern: /^(?:font|text-|leading-|tracking-|caption-|prose-|color-prose-|container-prose)/,
  },
  {
    section: TokenSection.Effects,
    pattern: /^(?:shadow|transition-duration-|ease-|default-transition-|z-index-)/,
  },
];

const SAMPLE_RULES: readonly SampleRule[] = [
  { sample: TokenSample.Radius, pattern: /^radius/ },
  { sample: TokenSample.Shadow, pattern: /^shadow/ },
  { sample: TokenSample.FontWeight, pattern: /^font-weight/ },
  { sample: TokenSample.FontSize, pattern: /^text-(?!.*--)/ },
  { sample: TokenSample.Font, pattern: /^font-/ },
  { sample: TokenSample.Size, pattern: /^spacing/ },
];

const TONE_RE =
  /^color-(primary|secondary|success|warning|error|info|neutral)(|-foreground|-soft|-soft-foreground|-muted|-muted-foreground)$/;

const TONE_ORDER = ['primary', 'secondary', 'success', 'warning', 'error', 'info', 'neutral'];
const TONE_PARTS = ['', '-foreground', '-soft', '-soft-foreground', '-muted', '-muted-foreground'];

const COLOR_VALUE_RE = /^(?:oklch|oklab|rgb|hsl|color-mix|light-dark|#)/;
const VAR_NAME_RE = /var\(\s*(--[\w-]+)/gu;
const ALIAS_RE = /^var\(\s*(--[\w-]+)\s*\)$/u;
const MIX_RE = /^color-mix\(in oklab,\s*var\((--[\w-]+)\)\s+([^,]+),\s*(.+)\)$/u;
const RELATIVE_PREFIX = 'oklab(from ';
const TRANSPARENT = 'transparent';
const PERCENT = '%';
const PREFIX = '--';
const LINE_HEIGHT_SUFFIX = '--line-height';

const shortName = (token: TokenReference): string => token.name.slice(PREFIX.length);

const sampleOf = (token: TokenReference, value: string): TokenSample => {
  if (COLOR_VALUE_RE.test(value)) {
    return TokenSample.Color;
  }
  const name = shortName(token);

  return SAMPLE_RULES.find((rule) => rule.pattern.test(name))?.sample ?? TokenSample.None;
};

export const tokenSectionOf = (token: TokenReference): TokenSection | undefined => {
  const name = shortName(token);

  return SECTION_RULES.find((rule) => rule.pattern.test(name))?.section;
};

const toneRank = (token: TokenReference): number => {
  const match = TONE_RE.exec(shortName(token));

  if (match === null) {
    return TONE_ORDER.length * TONE_PARTS.length;
  }

  const [, tone = '', part = ''] = match;

  return TONE_ORDER.indexOf(tone) * TONE_PARTS.length + TONE_PARTS.indexOf(part);
};

const VAR_OPEN = 'var(';
const EXPANSION_DEPTH = 8;

const DEPTH_STEP: Readonly<Record<string, number>> = { '(': 1, ')': -1 };

const closingOf = (text: string, open: number): number => {
  let depth = 0;
  let at = open;

  do {
    depth += DEPTH_STEP[text.charAt(at)] ?? 0;
    at += 1;
  } while (depth > 0 && at < text.length);

  return at - 1;
};

const fullValueOf = (token: TokenReference): string =>
  token.dark === undefined ? token.light : `light-dark(${token.light}, ${token.dark})`;

const expanded = (
  value: string,
  byName: ReadonlyMap<string, TokenReference>,
  depth: number,
): string => {
  const start = value.indexOf(VAR_OPEN);

  if (start === -1 || depth === 0) {
    return value;
  }

  const end = closingOf(value, start + VAR_OPEN.length - 1);
  const inner = value.slice(start + VAR_OPEN.length, end);
  const comma = inner.indexOf(',');
  const name = (comma === -1 ? inner : inner.slice(0, comma)).trim();
  const token = byName.get(name);
  const fallback = comma === -1 ? undefined : inner.slice(comma + 1).trim();
  const known = token === undefined ? fallback : fullValueOf(token);

  const replacement =
    known === undefined ? value.slice(start, end + 1) : expanded(known, byName, depth - 1);

  return `${value.slice(0, start)}${replacement}${expanded(value.slice(end + 1), byName, depth)}`;
};

const knownNameIn = (
  value: string,
  byName: ReadonlyMap<string, TokenReference>,
): string | undefined =>
  Array.from(value.matchAll(VAR_NAME_RE), ([, name = '']) => name).find((name) => byName.has(name));

const fallbackOf = (value: string, byName: ReadonlyMap<string, TokenReference>): string => {
  const whole =
    value.startsWith(VAR_OPEN) && closingOf(value, VAR_OPEN.length - 1) === value.length - 1;

  if (!whole) {
    return value;
  }

  const inner = value.slice(VAR_OPEN.length, -1);
  const comma = inner.indexOf(',');
  const hook = comma !== -1 && !byName.has(inner.slice(0, comma).trim());

  return hook ? fallbackOf(inner.slice(comma + 1).trim(), byName) : value;
};

const mixCallOf = (value: string): string => {
  if (!value.startsWith(RELATIVE_PREFIX)) {
    return value;
  }

  const open = value.indexOf('(', RELATIVE_PREFIX.length);

  return value.slice(RELATIVE_PREFIX.length, closingOf(value, open) + 1);
};

const mixOf = (
  value: string,
  byName: ReadonlyMap<string, TokenReference>,
): TokenDerivation | undefined => {
  const mix = MIX_RE.exec(value);

  if (mix === null) {
    return undefined;
  }

  const [, source = '', share = '', base = ''] = mix;

  return {
    kind: TokenDerivationKind.Mix,
    source,
    share: expanded(share.trim(), byName, EXPANSION_DEPTH).replace(PERCENT, ''),
    over: base.trim() === TRANSPARENT ? undefined : knownNameIn(base, byName),
  };
};

const derivationOf = (
  token: TokenReference,
  sample: TokenSample,
  byName: ReadonlyMap<string, TokenReference>,
): TokenDerivation | undefined => {
  if (sample !== TokenSample.Color) {
    return undefined;
  }

  const value = mixCallOf(fallbackOf(token.light.trim(), byName));
  const [, alias = ''] = ALIAS_RE.exec(value) ?? [];

  return byName.has(alias)
    ? { kind: TokenDerivationKind.Alias, source: alias }
    : mixOf(value, byName);
};

const isLineHeight = (token: TokenReference, byName: ReadonlyMap<string, TokenReference>) =>
  token.name.endsWith(LINE_HEIGHT_SUFFIX) &&
  byName.has(token.name.slice(0, -LINE_HEIGHT_SUFFIX.length));

const lineHeightOf = (
  token: TokenReference,
  byName: ReadonlyMap<string, TokenReference>,
): TokenLine | undefined => {
  const line = byName.get(`${token.name}${LINE_HEIGHT_SUFFIX}`);

  return line === undefined
    ? undefined
    : { ...line, value: expanded(fullValueOf(line), byName, EXPANSION_DEPTH) };
};

export const tokenRowsOf = (
  tokens: readonly TokenReference[],
  section: TokenSection,
): TokenRow[] => {
  const byName = new Map(tokens.map((token) => [token.name, token]));

  const rows = tokens.reduce<TokenRow[]>((found, token) => {
    const skipped = tokenSectionOf(token) !== section || isLineHeight(token, byName);

    if (skipped) {
      return found;
    }

    const value = expanded(fullValueOf(token), byName, EXPANSION_DEPTH);
    const sample = sampleOf(token, value);

    found.push({
      ...token,
      sample,
      value,
      derivation: derivationOf(token, sample, byName),
      lineHeight: lineHeightOf(token, byName),
    });

    return found;
  }, []);

  return section === TokenSection.Tones ? sortBy(rows, toneRank) : rows;
};

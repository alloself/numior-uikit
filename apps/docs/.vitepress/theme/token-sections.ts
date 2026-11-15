import { sortBy } from 'lodash-es';
import type { TokenReference } from '../reference/reference.types';
import { TokenSample, TokenSection, type TokenRow } from './theme.types.ts';

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
    pattern: /^(?:color-(?:primary|secondary|success|warning|error|info|neutral)|soft-)/,
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
  /^color-(primary|secondary|success|warning|error|info|neutral)(|-foreground|-soft|-soft-foreground)$/;

const TONE_ORDER = ['primary', 'secondary', 'success', 'warning', 'error', 'info', 'neutral'];
const TONE_PARTS = ['', '-foreground', '-soft', '-soft-foreground'];

const COLOR_VALUE_RE = /^(?:oklch|oklab|rgb|hsl|color-mix|light-dark|#)/;
const PREFIX = '--';

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

export const tokenRowsOf = (
  tokens: readonly TokenReference[],
  section: TokenSection,
): TokenRow[] => {
  const byName = new Map(tokens.map((token) => [token.name, token]));

  const rows = tokens.reduce<TokenRow[]>((found, token) => {
    if (tokenSectionOf(token) !== section) {
      return found;
    }

    const value = expanded(fullValueOf(token), byName, EXPANSION_DEPTH);

    found.push({ ...token, sample: sampleOf(token, value), value });

    return found;
  }, []);

  return section === TokenSection.Tones ? sortBy(rows, toneRank) : rows;
};

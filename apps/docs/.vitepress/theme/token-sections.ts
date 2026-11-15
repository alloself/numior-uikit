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
  { section: TokenSection.Code, pattern: /^(?:surface-code|syntax-|code-|chart-)/ },
  { section: TokenSection.Surfaces, pattern: /^(?:surface|ring$|backdrop|text|border)/ },
  {
    section: TokenSection.Tones,
    pattern: /^(?:primary|secondary|success|warning|error|info|neutral|soft-)/,
  },
  {
    section: TokenSection.States,
    pattern: /^(?:focus|field-ring|disabled|state-|hover$|pressed$)/,
  },
  { section: TokenSection.Shape, pattern: /^radius/ },
  {
    section: TokenSection.Sizes,
    pattern: /^(?:space-|control-|field-padding|icon-size|layout-)/,
  },
  {
    section: TokenSection.Type,
    pattern: /^(?:font|line-height|tracking|caption|prose|measure)/,
  },
  { section: TokenSection.Effects, pattern: /^(?:shadow|duration|easing|z-)/ },
];

const SAMPLE_RULES: readonly SampleRule[] = [
  { sample: TokenSample.Radius, pattern: /^radius/ },
  { sample: TokenSample.Shadow, pattern: /^shadow/ },
  { sample: TokenSample.FontWeight, pattern: /^font-weight/ },
  { sample: TokenSample.FontSize, pattern: /font-size/ },
  { sample: TokenSample.Font, pattern: /^font/ },
  {
    sample: TokenSample.Size,
    pattern: /^(?:space-|control-(?:height|padding)|field-padding|icon-size|layout-)/,
  },
];

const TONE_RE =
  /^(primary|secondary|success|warning|error|info|neutral)(|-foreground|-soft|-soft-foreground)$/;

const TONE_ORDER = ['primary', 'secondary', 'success', 'warning', 'error', 'info', 'neutral'];
const TONE_PARTS = ['', '-foreground', '-soft', '-soft-foreground'];

const COLOR_VALUE_RE = /^(?:oklch|oklab|rgb|hsl|color-mix|#)/;
const REFERENCE_RE = /^var\((--nui-[a-z0-9-]+)\)$/;
const PREFIX = '--nui-';

const shortName = (token: TokenReference): string => token.name.slice(PREFIX.length);

const isColor = (
  token: TokenReference | undefined,
  byName: ReadonlyMap<string, TokenReference>,
): boolean => {
  if (token === undefined) {
    return false;
  }
  const target = REFERENCE_RE.exec(token.light)?.[1];

  return target === undefined
    ? token.dark !== undefined || COLOR_VALUE_RE.test(token.light)
    : isColor(byName.get(target), byName);
};

const sampleOf = (
  token: TokenReference,
  byName: ReadonlyMap<string, TokenReference>,
): TokenSample => {
  if (isColor(token, byName)) {
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

export const tokenRowsOf = (
  tokens: readonly TokenReference[],
  section: TokenSection,
): TokenRow[] => {
  const byName = new Map(tokens.map((token) => [token.name, token]));

  const rows = tokens.reduce<TokenRow[]>((found, token) => {
    if (tokenSectionOf(token) === section) {
      found.push({ ...token, sample: sampleOf(token, byName) });
    }
    return found;
  }, []);

  return section === TokenSection.Tones ? sortBy(rows, toneRank) : rows;
};

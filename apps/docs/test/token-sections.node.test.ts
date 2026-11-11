import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vite-plus/test';
import { parseThemeTokens } from '../.vitepress/reference/tokens';
import { TokenSample, TokenSection } from '../.vitepress/theme/theme.types';
import { tokenRowsOf, tokenSectionOf } from '../.vitepress/theme/token-sections';

const THEME = parseThemeTokens(
  readFileSync(
    fileURLToPath(new URL('../../../packages/tokens/src/theme.css', import.meta.url)),
    'utf8',
  ),
);

const namesOf = (section: TokenSection): string[] =>
  tokenRowsOf(THEME, section).map((row) => row.name);

const samplesOf = (section: TokenSection): Record<string, TokenSample> =>
  Object.fromEntries(tokenRowsOf(THEME, section).map((row) => [row.name, row.sample]));

describe('token sections', () => {
  it('gives every token of the theme a section of the tokens page', () => {
    expect(THEME.length).toBeGreaterThan(100);
    expect(THEME.filter((token) => tokenSectionOf(token) === undefined)).toEqual([]);
  });

  it('lists a tone as its fill, the text on it, the soft fill and the text on the soft fill', () => {
    expect(namesOf(TokenSection.Tones).slice(0, 5)).toEqual([
      '--nui-primary',
      '--nui-primary-foreground',
      '--nui-primary-soft',
      '--nui-primary-soft-foreground',
      '--nui-secondary',
    ]);
  });

  it('keeps code colours out of the surfaces and the field ring with the states', () => {
    expect(namesOf(TokenSection.Surfaces)).not.toContain('--nui-surface-code');
    expect(namesOf(TokenSection.Code)).toContain('--nui-surface-code');
    expect(namesOf(TokenSection.States)).toContain('--nui-field-ring-width');
    expect(namesOf(TokenSection.Sizes)).toContain('--nui-field-padding-md');
  });

  it('follows a reference to know that a token is a colour', () => {
    const states = samplesOf(TokenSection.States);

    expect(states['--nui-focus']).toBe(TokenSample.Color);
    expect(states['--nui-hover']).toBe(TokenSample.Color);
    expect(states['--nui-focus-ring-width']).toBe(TokenSample.None);
    expect(samplesOf(TokenSection.Type)['--nui-prose-marker-color']).toBe(TokenSample.Color);
  });

  it('picks the sample of shape, size, shadow and type tokens by their names', () => {
    const type = samplesOf(TokenSection.Type);
    const sizes = samplesOf(TokenSection.Sizes);

    expect(samplesOf(TokenSection.Shape)['--nui-radius-lg']).toBe(TokenSample.Radius);
    expect(samplesOf(TokenSection.Effects)['--nui-shadow-md']).toBe(TokenSample.Shadow);
    expect(sizes['--nui-control-height-md']).toBe(TokenSample.Size);
    expect(sizes['--nui-control-font-size-md']).toBe(TokenSample.FontSize);
    expect(type['--nui-font-mono']).toBe(TokenSample.Font);
    expect(type['--nui-font-weight-bold']).toBe(TokenSample.FontWeight);
    expect(type['--nui-line-height']).toBe(TokenSample.None);
  });
});

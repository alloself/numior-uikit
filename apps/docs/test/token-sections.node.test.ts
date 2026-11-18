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

const rowOf = (section: TokenSection, name: string) =>
  tokenRowsOf(THEME, section).find((row) => row.name === name);

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
      '--color-primary',
      '--color-primary-foreground',
      '--color-primary-soft',
      '--color-primary-soft-foreground',
      '--color-secondary',
    ]);

    expect(namesOf(TokenSection.Tones).at(-1)).toBe('--soft-min-lightness');
  });

  it('keeps code colours out of the surfaces and the field ring with the states', () => {
    expect(namesOf(TokenSection.Surfaces)).not.toContain('--color-surface-code');
    expect(namesOf(TokenSection.Code)).toContain('--color-surface-code');
    expect(namesOf(TokenSection.States)).toContain('--field-ring-width');
    expect(namesOf(TokenSection.Sizes)).toContain('--spacing-field-pad-md');
  });

  it('follows a reference to know that a token is a colour', () => {
    const states = samplesOf(TokenSection.States);

    expect(states['--color-ring']).toBe(TokenSample.Color);
    expect(states['--color-hover']).toBe(TokenSample.Color);
    expect(states['--focus-ring-width']).toBe(TokenSample.None);
    expect(samplesOf(TokenSection.Type)['--color-prose-marker']).toBe(TokenSample.Color);
  });

  it('takes the fallback of a theme hook to know that a token is a colour', () => {
    const soft = rowOf(TokenSection.Tones, '--color-primary-soft-foreground');
    const highlight = rowOf(TokenSection.Code, '--color-syntax-highlight');

    expect(soft?.light).toContain('var(--color-theme-soft-foreground,');
    expect(soft?.sample).toBe(TokenSample.Color);
    expect(soft?.value).toBe(rowOf(TokenSection.Tones, '--color-primary')?.value);
    expect(highlight?.light).toContain('var(--color-theme-syntax-highlight,');
    expect(highlight?.sample).toBe(TokenSample.Color);
  });

  it('picks the sample of shape, size, shadow and type tokens by their names', () => {
    const type = samplesOf(TokenSection.Type);
    const sizes = samplesOf(TokenSection.Sizes);

    expect(samplesOf(TokenSection.Shape)['--radius-lg']).toBe(TokenSample.Radius);
    expect(samplesOf(TokenSection.Effects)['--shadow-md']).toBe(TokenSample.Shadow);
    expect(sizes['--spacing-control-md']).toBe(TokenSample.Size);
    expect(sizes['--text-control-md']).toBe(TokenSample.FontSize);
    expect(type['--font-mono']).toBe(TokenSample.Font);
    expect(type['--font-weight-bold']).toBe(TokenSample.FontWeight);
    expect(type['--leading-normal']).toBe(TokenSample.None);
  });

  it('reads how a derived colour is made: a share of a token over a surface or a plain reference', () => {
    expect(rowOf(TokenSection.Tones, '--color-primary-soft')?.derivation).toEqual({
      kind: 'mix',
      source: '--color-primary',
      share: '14',
      over: '--color-surface',
    });

    expect(rowOf(TokenSection.Tones, '--color-neutral-muted')?.derivation).toEqual({
      kind: 'mix',
      source: '--color-neutral',
      share: '65',
      over: '--color-surface',
    });

    expect(rowOf(TokenSection.States, '--color-hover')?.derivation).toEqual({
      kind: 'mix',
      source: '--color-foreground',
      share: '8',
      over: undefined,
    });

    expect(rowOf(TokenSection.Code, '--color-syntax-highlight')?.derivation).toEqual({
      kind: 'mix',
      source: '--color-primary',
      share: '6',
      over: '--color-surface-code',
    });

    expect(rowOf(TokenSection.Tones, '--color-primary-soft-foreground')?.derivation).toEqual({
      kind: 'alias',
      source: '--color-primary',
    });

    expect(rowOf(TokenSection.Tones, '--color-primary')?.derivation).toBeUndefined();
    expect(rowOf(TokenSection.Shape, '--radius-sm')?.derivation).toBeUndefined();
  });

  it('puts in words every colour of the theme that is made from another token', () => {
    const rows = Object.values(TokenSection).flatMap((section) => tokenRowsOf(THEME, section));

    const unread = rows.reduce<string[]>((names, row) => {
      const made = row.sample === TokenSample.Color && row.light.includes('var(');

      if (made && row.derivation === undefined) {
        names.push(row.name);
      }

      return names;
    }, []);

    expect(unread).toEqual([]);
  });

  it('carries the line height of a text size in the row of that size', () => {
    expect(rowOf(TokenSection.Type, '--text-xs')?.lineHeight).toMatchObject({
      name: '--text-xs--line-height',
      value: '1.5',
    });

    expect(rowOf(TokenSection.Type, '--text-4xl')?.lineHeight?.value).toBe('1.25');
    expect(namesOf(TokenSection.Type).filter((name) => name.endsWith('--line-height'))).toEqual([]);

    expect(rowOf(TokenSection.Type, '--leading-normal')?.lineHeight).toBeUndefined();
  });

  it('shows a derived token with the base values of the kit, wherever the page is themed', () => {
    expect(rowOf(TokenSection.States, '--color-ring')?.value).toBe(
      rowOf(TokenSection.Tones, '--color-primary')?.value,
    );

    expect(rowOf(TokenSection.Tones, '--color-primary-soft')?.value).not.toContain('var(--');
    expect(rowOf(TokenSection.Shape, '--radius-sm')?.value).toBe('calc(0.5rem / 2)');
  });
});

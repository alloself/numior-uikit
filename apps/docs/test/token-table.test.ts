import { describe, expect, it } from 'vite-plus/test';
import { TokenSection } from '../.vitepress/theme/theme.types';
import { themeToken, TokenTableDriver } from './drivers/token-table';

const TOKENS = [
  themeToken('color-surface', 'oklch(1 0 0)', 'oklch(0.21 0.006 285.89)'),
  themeToken('color-surface-ring', 'var(--color-surface)'),
  themeToken('radius-base', '0.5rem'),
  themeToken('radius-sm', 'calc(var(--radius-base) / 2)'),
  themeToken('spacing-control-sm', '2rem'),
  themeToken('text-lg', '1.125rem'),
  themeToken('transition-duration-fast', '120ms'),
];

describe('TokenTable', () => {
  it('shows a colour in both schemes with the value of the kit and marks a value shared by the schemes', () => {
    const table = TokenTableDriver.mount(TOKENS, TokenSection.Surfaces);

    expect(table.headers).toEqual(['Образец', 'Токен', 'Значение', 'В тёмной схеме']);

    expect(table.rows).toEqual([
      ['', '--color-surface', 'oklch(1 0 0)', 'oklch(0.21 0.006 285.89)'],
      ['', '--color-surface-ring', 'var(--color-surface)', '—'],
    ]);

    expect(table.swatchSchemes('color-surface')).toEqual(['light', 'dark']);
    expect(table.swatchSchemes('color-surface-ring')).toEqual(['light', 'dark']);

    expect(table.sampleStyle('color-surface-ring')).toContain(
      'light-dark(oklch(1 0 0), oklch(0.21 0.006 285.89))',
    );

    table.unmount();
  });

  it('drops the dark column where no token depends on the scheme', () => {
    const table = TokenTableDriver.mount(TOKENS, TokenSection.Shape);

    expect(table.headers).toEqual(['Образец', 'Токен', 'Значение']);

    expect(table.rows).toEqual([
      ['', '--radius-base', '0.5rem'],
      ['', '--radius-sm', 'calc(var(--radius-base) / 2)'],
    ]);

    expect(table.sampleStyle('radius-sm')).toContain('border-radius: calc(0.25rem)');

    table.unmount();
  });

  it('draws the sample by the kind of the token and leaves plain numbers without one', () => {
    const sizes = TokenTableDriver.mount(TOKENS, TokenSection.Sizes);
    const type = TokenTableDriver.mount(TOKENS, TokenSection.Type);
    const effects = TokenTableDriver.mount(TOKENS, TokenSection.Effects);

    expect(sizes.sampleStyle('spacing-control-sm')).toContain('inline-size: 2rem');
    expect(type.rows).toEqual([['Aa', '--text-lg', '1.125rem']]);
    expect(type.sampleStyle('text-lg')).toContain('font-size: 1.125rem');
    expect(effects.rows).toEqual([['', '--transition-duration-fast', '120ms']]);
    expect(effects.sampleStyle('transition-duration-fast')).toBe('');

    sizes.unmount();
    type.unmount();
    effects.unmount();
  });

  it('puts the values under the name on a narrow screen, so the table fits the phone', async () => {
    const table = await TokenTableDriver.mountNarrow(TOKENS, TokenSection.Surfaces);

    expect(table.headers).toEqual(['Образец', 'Токен']);

    expect(table.rows).toEqual([
      [
        '',
        ['--color-surface', 'oklch(1 0 0)', 'В тёмной схеме: oklch(0.21 0.006 285.89)'].join(''),
      ],
      ['', ['--color-surface-ring', 'var(--color-surface)'].join('')],
    ]);

    table.unmount();
  });
});

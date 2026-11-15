import { describe, expect, it } from 'vite-plus/test';
import { TokenSection } from '../.vitepress/theme/theme.types';
import { themeToken, TokenTableDriver } from './drivers/token-table';

const TOKENS = [
  themeToken('surface', 'oklch(1 0 0)', 'oklch(0.21 0.006 285.89)'),
  themeToken('surface-elevated', 'var(--nui-surface)'),
  themeToken('radius-base', '0.5rem'),
  themeToken('radius', 'var(--nui-radius-base)'),
  themeToken('space-2', '0.5rem'),
  themeToken('font-size-lg', '1.125rem'),
  themeToken('duration-fast', '120ms'),
];

describe('TokenTable', () => {
  it('shows a colour in both schemes and marks a value shared by the schemes', () => {
    const table = TokenTableDriver.mount(TOKENS, TokenSection.Surfaces);

    expect(table.headers).toEqual(['Образец', 'Токен', 'Значение', 'В тёмной схеме']);

    expect(table.rows).toEqual([
      ['', '--nui-surface', 'oklch(1 0 0)', 'oklch(0.21 0.006 285.89)'],
      ['', '--nui-surface-elevated', 'var(--nui-surface)', '—'],
    ]);

    expect(table.swatchSchemes('surface')).toEqual(['light', 'dark']);
    expect(table.swatchSchemes('surface-elevated')).toEqual(['light', 'dark']);
    expect(table.sampleStyle('surface-elevated')).toContain('var(--nui-surface-elevated)');

    table.unmount();
  });

  it('drops the dark column where no token depends on the scheme', () => {
    const table = TokenTableDriver.mount(TOKENS, TokenSection.Shape);

    expect(table.headers).toEqual(['Образец', 'Токен', 'Значение']);

    expect(table.rows).toEqual([
      ['', '--nui-radius-base', '0.5rem'],
      ['', '--nui-radius', 'var(--nui-radius-base)'],
    ]);

    expect(table.sampleStyle('radius')).toContain('border-radius: var(--nui-radius)');

    table.unmount();
  });

  it('draws the sample by the kind of the token and leaves plain numbers without one', () => {
    const sizes = TokenTableDriver.mount(TOKENS, TokenSection.Sizes);
    const type = TokenTableDriver.mount(TOKENS, TokenSection.Type);
    const effects = TokenTableDriver.mount(TOKENS, TokenSection.Effects);

    expect(sizes.sampleStyle('space-2')).toContain('inline-size: var(--nui-space-2)');
    expect(type.rows).toEqual([['Aa', '--nui-font-size-lg', '1.125rem']]);
    expect(type.sampleStyle('font-size-lg')).toContain('font-size: var(--nui-font-size-lg)');
    expect(effects.rows).toEqual([['', '--nui-duration-fast', '120ms']]);
    expect(effects.sampleStyle('duration-fast')).toBe('');

    sizes.unmount();
    type.unmount();
    effects.unmount();
  });
});

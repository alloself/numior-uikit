import { describe, expect, it, vi } from 'vite-plus/test';
import { themeModel } from '../.vitepress/theme/theme-sources';
import { ru } from '../.vitepress/theme/texts';
import { DocsAccent } from '../.vitepress/theme/theme.types';
import { HomeScreenDriver } from './drivers/home-screen';

vi.mock('../.vitepress/theme/theme-sources', async () => {
  const { readFileSync } = await import('node:fs');
  const { createThemeModel } = await import('../.vitepress/theme/theme-builder');

  const read = (path: string): string => readFileSync(new URL(path, import.meta.url), 'utf8');

  return {
    themeModel: createThemeModel({
      kit: read('../../../packages/tokens/src/theme.css'),
      accents: read('../../../packages/tokens/src/accents.css'),
      site: read('../.vitepress/theme/numior.css'),
    }),
  };
});

const NUMIOR = themeModel.preview(themeModel.presets.numior);
const VIOLET = themeModel.preview({ ...themeModel.presets.base, palette: DocsAccent.Violet });

describe('HomeScreen', () => {
  it('shows the back office on the page in the scheme of the site and the Numior palette', () => {
    const home = HomeScreenDriver.mount();

    expect(home.screen.text()).toBe('Кнопка');
    expect(home.schemes).toEqual([]);
    expect(home.shownIn(ru.theme)).toEqual([ru.light]);
    expect(home.direction).toBe('ltr');
    expect(home.accent).toBe('Numior');
    expect(home.themeKey('--color-primary')).toBe(NUMIOR['--color-primary']);
    expect(home.themeKey('--font-sans')).toBe(NUMIOR['--font-sans']);

    home.unmount();
  });

  it('changes the scheme and the direction of the screen and leaves the site alone', async () => {
    const home = HomeScreenDriver.mount();

    await home.choose(ru.theme, ru.dark);
    expect(home.schemes).toEqual(['nui-theme--dark']);

    await home.choose(ru.rtl, ru.rtl);
    expect(home.direction).toBe('rtl');
    expect(document.documentElement.classList.contains('nui-theme--dark')).toBe(false);
    expect(document.documentElement.getAttribute('dir')).not.toBe('rtl');

    home.unmount();
  });

  it('paints the screen in the base theme with a picked accent and returns it to Numior', async () => {
    const home = HomeScreenDriver.mount();

    await home.pickAccent(ru.accents.violet);
    expect(home.accent).toBe(ru.accents.violet);
    expect(home.themeKey('--color-primary')).toBe(VIOLET['--color-primary']);
    expect(home.themeKey('--radius-base')).toBe(VIOLET['--radius-base']);
    expect(home.themeKey('--color-surface')).toBe(VIOLET['--color-surface']);

    await home.pickAccent('Numior');
    expect(home.themeKey('--color-primary')).toBe(NUMIOR['--color-primary']);
    expect(home.themeKey('--radius-base')).toBe('0.25rem');

    home.unmount();
  });
});

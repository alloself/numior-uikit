import { describe, expect, it } from 'vite-plus/test';
import { NUMIOR_PALETTE } from '../.vitepress/theme/composables/use-accent';
import { applyFrameTheme, screenTheme } from '../.vitepress/theme/frame-theme';
import { ru } from '../.vitepress/theme/texts';
import { HomeScreenDriver } from './drivers/home-screen';

describe('theme of a framed screen', () => {
  it('names the scheme, the site palette and the direction', () => {
    expect(screenTheme({ scheme: 'dark', accent: NUMIOR_PALETTE, rtl: false })).toEqual({
      classes: ['nui-theme--dark', 'docs-theme--numior'],
      dir: 'ltr',
    });
  });

  it('names a picked accent and turns the screen right to left', () => {
    expect(screenTheme({ scheme: 'light', accent: 'violet', rtl: true })).toEqual({
      classes: ['nui-theme--light', 'nui-theme--accent-violet'],
      dir: 'rtl',
    });
  });

  it('replaces the theme classes of a page and keeps its own classes', () => {
    const page = document.createElement('html');

    page.className = 'page nui-theme--light nui-theme--accent-indigo';
    applyFrameTheme(page, { classes: ['nui-theme--dark', 'docs-theme--numior'], dir: 'rtl' });

    expect(page.className).toBe('page nui-theme--dark docs-theme--numior');
    expect(page.getAttribute('dir')).toBe('rtl');
    expect(() => applyFrameTheme(null, { classes: [], dir: 'rtl' })).not.toThrow();
  });
});

describe('HomeScreen', () => {
  it('shows the block page under the name of the screen', () => {
    const home = HomeScreenDriver.mount();

    expect(home.screen.attributes('src')).toBe('/blocks/view/AppShell');
    expect(home.screen.attributes('title')).toBe(ru.homeScreen);
    expect(home.accent).toBe('Numior');

    home.unmount();
  });

  it('changes the scheme and the direction of the screen and leaves the site alone', async () => {
    const home = HomeScreenDriver.mount();

    await home.choose(ru.theme, ru.dark);
    expect(home.themeClasses).toContain('nui-theme--dark');

    await home.choose(ru.rtl, ru.rtl);
    expect(home.attribute('dir')).toBe('rtl');
    expect(document.documentElement.classList.contains('nui-theme--dark')).toBe(false);
    expect(document.documentElement.getAttribute('dir')).not.toBe('rtl');

    home.unmount();
  });

  it('paints the screen with a picked accent and returns it to the Numior palette', async () => {
    const home = HomeScreenDriver.mount();

    await home.pickAccent(ru.accents.violet);
    expect(home.themeClasses).toEqual(['nui-theme--light', 'nui-theme--accent-violet']);
    expect(home.accent).toBe(ru.accents.violet);

    await home.pickAccent('Numior');
    expect(home.themeClasses).toEqual(['nui-theme--light', 'docs-theme--numior']);

    home.unmount();
  });
});

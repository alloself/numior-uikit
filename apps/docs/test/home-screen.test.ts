import { describe, expect, it } from 'vite-plus/test';
import { NUMIOR_PALETTE } from '../.vitepress/theme/composables/use-accent';
import { applyAttributes, screenAttributes } from '../.vitepress/theme/frame-attributes';
import { ru } from '../.vitepress/theme/texts';
import { HomeScreenDriver } from './drivers/home-screen';

describe('attributes of a framed screen', () => {
  it('names the scheme and the direction and leaves out the palette of the site', () => {
    const plain = screenAttributes({
      scheme: 'dark',
      accent: NUMIOR_PALETTE,
      rtl: false,
    });

    expect(plain).toEqual({
      'data-nui-theme': 'dark',
      'data-nui-accent': null,
      dir: 'ltr',
    });
  });

  it('names a picked accent and turns the screen right to left', () => {
    const picked = screenAttributes({
      scheme: 'light',
      accent: 'violet',
      rtl: true,
    });

    expect(picked).toEqual({
      'data-nui-theme': 'light',
      'data-nui-accent': 'violet',
      dir: 'rtl',
    });
  });

  it('sets the named attributes on a page and removes the ones that are dropped', () => {
    const page = document.createElement('html');

    page.setAttribute('data-nui-accent', 'indigo');
    applyAttributes(page, { 'data-nui-theme': 'dark', 'data-nui-accent': null });

    expect(page.getAttribute('data-nui-theme')).toBe('dark');
    expect(page.hasAttribute('data-nui-accent')).toBe(false);
    expect(() => applyAttributes(null, { dir: 'rtl' })).not.toThrow();
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
    expect(home.attribute('data-nui-theme')).toBe('dark');

    await home.choose(ru.rtl, ru.rtl);
    expect(home.attribute('dir')).toBe('rtl');
    expect(document.documentElement.getAttribute('data-nui-theme')).not.toBe('dark');
    expect(document.documentElement.getAttribute('dir')).not.toBe('rtl');

    home.unmount();
  });

  it('paints the screen with a picked accent and returns it to the Numior palette', async () => {
    const home = HomeScreenDriver.mount();

    await home.pickAccent(ru.accents.violet);
    expect(home.attribute('data-nui-accent')).toBe('violet');
    expect(home.accent).toBe(ru.accents.violet);

    await home.pickAccent('Numior');
    expect(home.attribute('data-nui-accent')).toBeNull();

    home.unmount();
  });
});

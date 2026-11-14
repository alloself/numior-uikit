import { describe, expect, it } from 'vite-plus/test';
import { ru } from '../.vitepress/theme/texts';
import { exampleFile } from './drivers/example-frame';
import { ThemeCompareDriver } from './drivers/theme-compare';

const FILES = [
  exampleFile('Theme.vue', '<template>\n  <NuiButton>Подтвердить заказ</NuiButton>\n</template>'),
];

describe('ThemeCompare', () => {
  it('shows one example in the base theme and in the Numior theme side by side', () => {
    const compare = ThemeCompareDriver.mount(FILES);

    expect(compare.captions).toEqual([ru.baseTheme, ru.siteTheme]);
    expect(compare.screen(ru.baseTheme).attributes('src')).toBe('/blocks/view/GuideTheme');
    expect(compare.screen(ru.siteTheme).attributes('src')).toBe('/blocks/view/GuideTheme');

    compare.unmount();
  });

  it('gives both screens the scheme of the site and only one of them the Numior palette', async () => {
    const compare = ThemeCompareDriver.mount(FILES, 'about:blank');

    await compare.siteTheme('nui-theme--dark nui-theme--accent-violet');
    await compare.load(ru.baseTheme);
    await compare.load(ru.siteTheme);

    expect(compare.themeOf(ru.baseTheme)).toEqual(['nui-theme--dark']);
    expect(compare.themeOf(ru.siteTheme)).toEqual(['docs-theme--numior', 'nui-theme--dark']);

    await compare.siteTheme('nui-theme--light docs-theme--numior');

    expect(compare.themeOf(ru.baseTheme)).toEqual(['nui-theme--light']);
    expect(compare.themeOf(ru.siteTheme)).toEqual(['docs-theme--numior', 'nui-theme--light']);

    compare.unmount();
  });

  it('copies the source of the example', async () => {
    const compare = ThemeCompareDriver.mount(FILES);

    await compare.copy();

    expect(compare.copied).toEqual([
      '<template>\n  <NuiButton>Подтвердить заказ</NuiButton>\n</template>',
    ]);

    compare.unmount();
  });
});

import { describe, expect, it } from 'vite-plus/test';
import { applyThemeClasses, themeClassesOf } from '../.vitepress/theme/frame-theme';
import { ru } from '../.vitepress/theme/texts';
import { BlockFrameDriver } from './drivers/block-frame';
import { exampleFile } from './drivers/example-frame';

const FILES = [
  exampleFile('index.vue', '<template>\n  <NuiForm />\n</template>'),
  exampleFile('team.ts', 'export const team = [];'),
];

describe('theme of a block page', () => {
  it('follows the theme classes of the site and drops the ones the site has dropped', () => {
    const site = document.createElement('html');
    const screen = document.createElement('html');

    site.className = 'site nui-theme--dark docs-theme--numior';
    screen.className = 'nui-theme--light nui-theme--accent-indigo';
    applyThemeClasses(screen, themeClassesOf(site));

    expect(screen.className).toBe('nui-theme--dark docs-theme--numior');
    expect(() => applyThemeClasses(null, ['nui-theme--dark'])).not.toThrow();
  });
});

describe('BlockFrame', () => {
  it('shows the block page in a screen and narrows it to a tablet and a phone', async () => {
    const block = BlockFrameDriver.mount(FILES);

    expect(block.screen.attributes('src')).toBe('/blocks/view/SignIn');
    expect(block.screen.attributes('title')).toBe(`${ru.preview}: SignIn`);
    expect(block.openLink).toBe('/blocks/view/SignIn');
    expect(block.screenWidth).toBe('100%');

    await block.resize(ru.viewportPhone);
    expect(block.screenWidth).toBe('24.375rem');

    await block.resize(ru.viewportTablet);
    expect(block.screenWidth).toBe('48rem');

    block.unmount();
  });

  it('grows the screen to the height its page reports and keeps the least height', async () => {
    const block = BlockFrameDriver.mount(FILES);

    expect(block.screenHeight).toBe('600px');

    await block.report(900);
    expect(block.screenHeight).toBe('900px');

    await block.report(420);
    expect(block.screenHeight).toBe('600px');

    await block.report(1200, window);
    expect(block.screenHeight).toBe('600px');

    block.unmount();
  });

  it('themes a block page that loaded before the page came alive', () => {
    const block = BlockFrameDriver.mountOnSite('nui-theme--dark docs-theme--numior', FILES);

    expect(block.themeClasses).toEqual(['docs-theme--numior', 'nui-theme--dark']);

    block.unmount();
  });

  it('lists the files of the block and copies the one on screen', async () => {
    const block = BlockFrameDriver.mount(FILES);

    await block.showCode();
    expect(block.fileNames).toEqual(['index.vue', 'team.ts']);

    await block.copy();
    expect(block.copied).toEqual(['<template>\n  <NuiForm />\n</template>']);

    block.unmount();
  });
});

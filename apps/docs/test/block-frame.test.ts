import { describe, expect, it } from 'vite-plus/test';
import { mirrorAttributes } from '../.vitepress/theme/mirror-attributes';
import { ru } from '../.vitepress/theme/texts';
import { BlockFrameDriver } from './drivers/block-frame';
import { exampleFile } from './drivers/example-frame';

const FILES = [
  exampleFile('index.vue', '<template>\n  <NuiForm />\n</template>'),
  exampleFile('team.ts', 'export const team = [];'),
];

describe('theme of a block page', () => {
  it('follows the attributes of the site and drops the ones the site has dropped', () => {
    const site = document.createElement('html');
    const screen = document.createElement('html');

    site.setAttribute('data-nui-theme', 'dark');
    screen.setAttribute('data-nui-accent', 'indigo');
    mirrorAttributes(site, screen, ['data-nui-theme', 'data-nui-accent']);

    expect(screen.getAttribute('data-nui-theme')).toBe('dark');
    expect(screen.hasAttribute('data-nui-accent')).toBe(false);
    expect(() => mirrorAttributes(site, null, ['data-nui-theme'])).not.toThrow();
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

  it('lists the files of the block and copies the one on screen', async () => {
    const block = BlockFrameDriver.mount(FILES);

    await block.showCode();
    expect(block.fileNames).toEqual(['index.vue', 'team.ts']);

    await block.copy();
    expect(block.copied).toEqual(['<template>\n  <NuiForm />\n</template>']);

    block.unmount();
  });
});

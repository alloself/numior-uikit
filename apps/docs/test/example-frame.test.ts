import { describe, expect, it } from 'vite-plus/test';
import { exampleFile, ExampleFrameDriver } from './drivers/example-frame';

const SINGLE = [
  exampleFile('Basic.vue', '<template>\n  <NuiButton>Сохранить</NuiButton>\n</template>'),
];

const MULTI = [
  exampleFile('index.vue', '<template>\n  <ul />\n</template>'),
  exampleFile('data.ts', 'export const rows = [];'),
];

describe('ExampleFrame', () => {
  it('shows the preview first and switches to the code of the example', async () => {
    const frame = ExampleFrameDriver.mount(SINGLE);

    expect(frame.previewVisible).toBe(true);
    expect(frame.preview.find('.sample').text()).toBe('Кнопка');
    expect(frame.codeVisible).toBe(false);
    await frame.showCode();
    expect(frame.codeVisible).toBe(true);
    expect(frame.previewVisible).toBe(false);
    expect(frame.codeText).toContain('<NuiButton>Сохранить</NuiButton>');
    await frame.showPreview();
    expect(frame.previewVisible).toBe(true);
    frame.unmount();
  });

  it('inverts the preview theme against the resolved scheme and flips the direction', async () => {
    const frame = ExampleFrameDriver.mount(SINGLE);

    expect(frame.previewTheme).toBeUndefined();
    await frame.toggleTheme();
    expect(frame.previewTheme).toBe('dark');
    await frame.toggleDirection();
    expect(frame.previewDirection).toBe('rtl');
    await frame.toggleTheme();
    expect(frame.previewTheme).toBeUndefined();
    expect(frame.previewDirection).toBe('rtl');
    frame.unmount();
  });

  it('copies the source of the current file', async () => {
    const frame = ExampleFrameDriver.mount(MULTI);

    await frame.copy();
    expect(frame.copied).toEqual(['<template>\n  <ul />\n</template>']);
    await frame.showCode();
    await frame.selectFile('data.ts');
    await frame.copy();
    expect(frame.copied.at(-1)).toBe('export const rows = [];');
    frame.unmount();
  });

  it('lists the files of a multi-file example as tabs', async () => {
    const frame = ExampleFrameDriver.mount(MULTI);

    await frame.showCode();
    expect(frame.fileTabs).toEqual(['index.vue', 'data.ts']);
    expect(frame.codeText).toContain('<ul />');
    await frame.selectFile('data.ts');
    expect(frame.codeText).toBe('export const rows = [];');
    frame.unmount();
  });
});

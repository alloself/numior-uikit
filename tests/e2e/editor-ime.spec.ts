import { expect, test, type Page } from '@playwright/test';
import { PlaygroundPage } from './pages/playground';

const openEditor = async (page: Page): Promise<PlaygroundPage> => {
  const playground = new PlaygroundPage(page);

  await playground.emulate({ reducedMotion: 'reduce' });
  await playground.open();
  await playground.editor.root.scrollIntoViewIfNeeded();
  await playground.editor.clear();
  return playground;
};

test.describe('editor input methods', () => {
  test('composes Cyrillic and CJK words through the Chromium IME', async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== 'chromium', 'The IME protocol exists only in Chromium');
    const { editor } = await openEditor(page);

    await editor.composeThroughCdp('привет');
    await expect.poll(() => editor.blockTexts()).toEqual(['привет']);
    await editor.composeThroughCdp(' 你好');
    await expect.poll(() => editor.previewTexts()).toEqual(['привет 你好']);
    await page.keyboard.press('ControlOrMeta+z');
    await expect.poll(() => editor.previewTexts()).not.toEqual(['привет 你好']);
  });

  test('catches the model up after composition events and after DOM edits without them', async ({
    page,
  }) => {
    const { editor } = await openEditor(page);

    await page.keyboard.type('ab');
    await editor.composeSynthetically('вг');
    await expect.poll(() => editor.previewTexts()).toEqual(['abвг']);
    await expect.poll(() => editor.blockTexts()).toEqual(['abвг']);
    await editor.editWithoutEvents('ab', 'xy');
    await expect.poll(() => editor.previewTexts()).toEqual(['xyвг']);
    await page.keyboard.type('!');
    await expect.poll(() => editor.previewTexts()).toEqual(['xyвг!']);
  });
});

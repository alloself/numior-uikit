import { expect, test } from './fixtures';

test.beforeEach(async ({ playground, editor }) => {
  await playground.emulate({ reducedMotion: 'reduce' });
  await playground.open();
  await editor.root.scrollIntoViewIfNeeded();
  await editor.clear();
});

test.describe('editor input methods', () => {
  test('composes Cyrillic and CJK words through the Chromium IME', async ({
    editor,
    page,
    browserName,
  }) => {
    test.skip(browserName !== 'chromium', 'The IME protocol exists only in Chromium');
    await editor.composeThroughCdp('привет');
    await expect.poll(() => editor.blockTexts()).toEqual(['привет']);

    await editor.composeThroughCdp(' 你好');
    await expect.poll(() => editor.previewTexts()).toEqual(['привет 你好']);

    await page.keyboard.press('ControlOrMeta+z');
    await expect.poll(() => editor.previewTexts()).not.toEqual(['привет 你好']);
  });

  test('catches the model up after composition events and after DOM edits without them', async ({
    editor,
    page,
  }) => {
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

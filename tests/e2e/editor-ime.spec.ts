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
    browserName,
  }) => {
    test.skip(browserName !== 'chromium', 'The IME protocol exists only in Chromium');
    await editor.composeThroughCdp('привет');
    await expect.poll(() => editor.blockTexts()).toEqual(['привет']);

    await editor.composeThroughCdp(' 你好');
    await expect.poll(() => editor.previewTexts()).toEqual(['привет 你好']);

    await editor.undo();
    await expect.poll(() => editor.previewTexts()).not.toEqual(['привет 你好']);
  });

  test('puts a word composed over a selected divider or over everything in its place, as typing does', async ({
    editor,
    browserName,
  }) => {
    test.skip(browserName !== 'chromium', 'The IME protocol exists only in Chromium');
    await editor.typeText('ab');
    await editor.pressEnter();
    await editor.typeText('/');
    await editor.slashMenu().getByRole('option', { name: 'Разделитель' }).click();
    await expect.poll(() => editor.blockTags()).toEqual(['p', 'hr', 'p']);

    await editor.divider().click();
    await expect(editor.selectedAtoms()).toHaveClass(/nui-content__divider/u);

    await editor.composeThroughCdp('か');
    await expect.poll(() => editor.blockTags()).toEqual(['p', 'p', 'p']);
    await expect.poll(() => editor.blockTexts()).toEqual(['ab', 'か', '']);

    await editor.selectAll();
    await editor.composeThroughCdp('日本');
    await expect.poll(() => editor.blockTexts()).toEqual(['日本']);
  });

  test('catches the model up after composition events and after DOM edits without them', async ({
    editor,
  }) => {
    await editor.typeText('ab');
    await editor.composeSynthetically('вг');
    await expect.poll(() => editor.previewTexts()).toEqual(['abвг']);
    await expect.poll(() => editor.blockTexts()).toEqual(['abвг']);

    await editor.editWithoutEvents('ab', 'xy');
    await expect.poll(() => editor.previewTexts()).toEqual(['xyвг']);

    await editor.typeText('!');
    await expect.poll(() => editor.previewTexts()).toEqual(['xyвг!']);
  });
});

import { expect, test } from './fixtures';
import { boxOf } from './helpers/geometry';

test.beforeEach(async ({ playground }) => {
  await playground.emulate({ reducedMotion: 'reduce' });
  await playground.open();
  await playground.setDirection('rtl');
  await playground.editor.root.scrollIntoViewIfNeeded();
});

test.describe('editor right to left', () => {
  test('wraps text around a picture from the right and writes beside blocks on the reading side', async ({
    editor,
    page,
  }) => {
    const image = editor.image('="/media/sunrise.svg"');
    const line = image.locator('xpath=..');
    const bookmark = editor.bookmark('numior.test');
    const file = editor.file('Заметки к релизу');

    await image.scrollIntoViewIfNeeded();

    const [picture, row] = await Promise.all([boxOf(image), boxOf(line)]);

    expect(Math.abs(picture.x + picture.width - row.x - row.width)).toBeLessThan(2);

    await editor.clickBeside(bookmark, 'end');
    await expect(bookmark).toHaveClass(/nui-editor__gap/u);

    await page.keyboard.type('before');
    await expect(bookmark.locator('xpath=preceding-sibling::*[1]')).toHaveText('before');

    await file.click();
    await expect(file).toHaveClass(/nui-editor__selected/u);

    await page.keyboard.press('ArrowLeft');
    await page.keyboard.type(' ok');
    await expect(file.locator('xpath=..')).toContainText(' ok — прочитайте');
  });

  test('puts the block handle on the right of the block it moves', async ({ editor, page }) => {
    test.skip(
      !(await page.evaluate(() => matchMedia('(hover: hover) and (pointer: fine)').matches)),
      'the handle follows a mouse',
    );

    await editor.hoverStart(editor.block(0));
    await expect(editor.grip()).toBeVisible();

    const [grip, block] = await Promise.all([boxOf(editor.grip()), boxOf(editor.block(0))]);

    expect(grip.x + grip.width / 2).toBeGreaterThan(block.x + block.width / 2);
  });
});

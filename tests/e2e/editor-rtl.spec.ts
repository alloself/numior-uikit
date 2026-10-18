import { expect, test, type Page } from '@playwright/test';
import { PlaygroundPage } from './pages/playground';

const openEditor = async (page: Page): Promise<PlaygroundPage> => {
  const playground = new PlaygroundPage(page);

  await playground.emulate({ reducedMotion: 'reduce' });
  await playground.open();
  await playground.setDirection('rtl');
  await playground.editor.root.scrollIntoViewIfNeeded();
  return playground;
};

test.describe('editor right to left', () => {
  test('wraps text around a picture from the right and writes beside blocks on the reading side', async ({
    page,
  }) => {
    const { editor } = await openEditor(page);
    const image = editor.image('="/media/sunrise.svg"');
    const line = image.locator('xpath=..');
    const bookmark = editor.bookmark('numior.test');
    const file = editor.file('Заметки к релизу');

    await image.scrollIntoViewIfNeeded();

    const [picture, row] = await Promise.all([image.boundingBox(), line.boundingBox()]);

    expect(
      Math.abs((picture?.x ?? 0) + (picture?.width ?? 0) - (row?.x ?? 0) - (row?.width ?? 0)),
    ).toBeLessThan(2);

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

  test('puts the block handle on the right of the block it moves', async ({ page }) => {
    const { editor } = await openEditor(page);

    test.skip(
      !(await page.evaluate(() => matchMedia('(hover: hover) and (pointer: fine)').matches)),
      'the handle follows a mouse',
    );

    await editor.hoverStart(editor.block(0));
    await expect(editor.grip()).toBeVisible();

    const [grip, block] = await Promise.all([
      editor.grip().boundingBox(),
      editor.block(0).boundingBox(),
    ]);

    expect((grip?.x ?? 0) + (grip?.width ?? 0) / 2).toBeGreaterThan(
      (block?.x ?? 0) + (block?.width ?? 0) / 2,
    );
  });
});

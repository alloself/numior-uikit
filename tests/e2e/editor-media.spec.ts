import { expect, test, type Locator, type Page } from '@playwright/test';
import { PlaygroundPage } from './pages/playground';

const openEditor = async (page: Page): Promise<PlaygroundPage> => {
  const playground = new PlaygroundPage(page);

  await playground.emulate({ reducedMotion: 'reduce' });
  await playground.open();
  await playground.editor.root.scrollIntoViewIfNeeded();
  return playground;
};

const SAMPLE = '="/media/sunrise.svg"';

const UPLOADED = '^="blob:"';

const widthOf = async (figure: Locator): Promise<number> =>
  Number.parseFloat((await figure.getAttribute('style'))?.replace(/[^\d.]/gu, '') ?? 'NaN');

test.describe('editor media', () => {
  test('uploads pasted files beside the text and publishes them once they arrive', async ({
    page,
  }) => {
    const { editor } = await openEditor(page);

    await editor.placeAtEnd();

    await editor.pasteFiles([
      { name: 'cover.png', type: 'image/png' },
      { name: 'notes.pdf', type: 'application/pdf' },
    ]);

    await expect(editor.uploadCards()).toHaveCount(2);
    await expect(editor.uploadCards().first()).toContainText('cover.png');
    await expect(editor.uploadCards().first().locator('progress')).toBeVisible();
    await expect(editor.uploadCards()).toHaveCount(0, { timeout: 10_000 });
    await expect(editor.image(UPLOADED)).toBeVisible();

    await editor.image(UPLOADED).evaluate((figure) => {
      figure.nextElementSibling?.scrollIntoView({ block: 'center' });
    });

    await expect(editor.file('notes.pdf')).toBeVisible();
    await expect(editor.publishedImage(UPLOADED)).toBeVisible();
  });

  test('cancels an upload and retries one the server refused', async ({ page }) => {
    const { editor } = await openEditor(page);
    const failing = page.getByTestId('editor-upload-fail');

    await editor.placeAtEnd();
    await editor.pasteFiles([{ name: 'draft.txt', type: 'text/plain' }]);

    await editor
      .uploadCards()
      .getByRole('button', { name: /draft\.txt/u })
      .click();

    await expect(editor.uploadCards()).toHaveCount(0);
    await expect(editor.file('draft.txt')).toHaveCount(0);

    await failing.click();
    await editor.placeAtEnd();
    await editor.pasteFiles([{ name: 'broken.txt', type: 'text/plain' }]);
    await expect(editor.uploadCards()).toContainText('Сервер не ответил', { timeout: 10_000 });
    await failing.click();
    await editor.uploadCards().getByRole('button', { name: 'Повторить' }).click();
    await expect(editor.uploadCards()).toHaveCount(0, { timeout: 10_000 });
    await expect(editor.file('broken.txt')).toBeVisible();
  });

  test('picks an image from the slash menu and inserts files by link', async ({ page }) => {
    const { editor } = await openEditor(page);

    await editor.placeAtEnd();
    await page.keyboard.press('Enter');
    await page.keyboard.type('/ima');
    await page.keyboard.press('Enter');
    await expect(editor.mediaPanel()).toBeVisible();
    await expect(editor.mediaPanel().getByRole('tab')).toHaveText(['Загрузить', 'По ссылке']);

    await editor
      .mediaPanel()
      .locator('input[type="file"]')
      .setInputFiles({
        name: 'cat.png',
        mimeType: 'image/png',
        buffer: Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
          'base64',
        ),
      });

    await expect(editor.mediaPanel()).toBeHidden();
    await expect(editor.uploadCards()).toHaveCount(1);
    await expect(editor.uploadCards()).toHaveCount(0, { timeout: 10_000 });
    await expect(editor.image(UPLOADED)).toBeVisible();

    await page.getByTestId('editor-uploads').click();
    await editor.placeAtEnd();
    await editor.showCaret();
    await page.keyboard.press('Enter');
    await page.keyboard.type('/fil');
    await page.keyboard.press('Enter');
    await expect(editor.mediaPanel().getByRole('tab')).toHaveCount(0);
    await editor.mediaPanel().getByRole('textbox').fill('https://numior.test/Price%20list.pdf');
    await editor.mediaPanel().getByRole('button', { name: 'Вставить' }).click();
    await expect(editor.file('Price list.pdf')).toBeVisible();
  });

  test('resizes, aligns and captions an image and opens it full screen when published', async ({
    page,
  }) => {
    const { editor } = await openEditor(page);
    const image = editor.image(SAMPLE);

    await image.scrollIntoViewIfNeeded();
    expect(await widthOf(image)).toBe(60);

    await editor.dragGrip(image, 'end', -40);
    await expect.poll(() => widthOf(image)).toBeLessThan(60);

    const dragged = await widthOf(image);
    const grip = image.locator('[role="slider"]').first();

    await grip.focus();
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => widthOf(image)).toBeCloseTo(dragged + 5, 0);

    await image.locator('img').click();
    await image.getByRole('radio', { name: 'К концу строки' }).click();
    await expect(image).toHaveClass(/nui-content__image--align-end/u);

    const caption = image.getByRole('textbox', { name: 'Добавьте подпись' });

    await caption.fill('Рассвет над морем');
    await caption.press('Enter');
    await page.keyboard.type('Дальше текст');

    await expect(editor.publishedImage(SAMPLE).locator('figcaption')).toHaveText(
      'Рассвет над морем',
    );

    await expect(image.locator('xpath=following-sibling::*[1]')).toHaveText('Дальше текст');

    const zoom = editor.publishedImage(SAMPLE).getByRole('button');

    await zoom.click();
    await expect(editor.imageViewer()).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(editor.imageViewer()).toBeHidden();
    await expect(zoom).toBeFocused();
  });

  test('passes axe with the media panel, the image bar and the image viewer open', async ({
    page,
  }) => {
    const playground = await openEditor(page);
    const { editor } = playground;
    const section = 'section[aria-labelledby="editor-title"]';

    await editor.image(SAMPLE).locator('img').click();
    await expect(editor.image(SAMPLE).locator('.nui-editor-image__bar')).toBeVisible();
    expect(await playground.wcagViolations(section)).toEqual([]);

    await editor.placeAtEnd();
    await page.keyboard.press('Enter');
    await page.keyboard.type('/ima');
    await page.keyboard.press('Enter');
    await expect(editor.mediaPanel()).toBeVisible();
    expect(await playground.wcagViolations('.nui-editor-media')).toEqual([]);
    await page.keyboard.press('Escape');

    await editor.publishedImage(SAMPLE).getByRole('button').click();
    await expect(editor.imageViewer()).toBeVisible();
    expect(await playground.wcagViolations('.nui-content__viewer')).toEqual([]);
  });
});

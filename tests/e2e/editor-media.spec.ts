import { type Locator } from '@playwright/test';
import { expect, test } from './fixtures';

test.beforeEach(async ({ playground, editor }) => {
  await playground.emulate({ reducedMotion: 'reduce' });
  await playground.open();
  await editor.root.scrollIntoViewIfNeeded();
});

const SAMPLE = '="/media/sunrise.svg"';

const UPLOADED = '^="data:image/"';

const widthOf = async (figure: Locator): Promise<number> =>
  Number.parseFloat((await figure.getAttribute('style'))?.replace(/[^\d.]/gu, '') ?? 'NaN');

test.describe('editor media', () => {
  test('uploads pasted files beside the text and publishes them once they arrive', async ({
    editor,
  }) => {
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

  test('cancels an upload and retries one the server refused', async ({ editor }) => {
    const failing = editor.uploadFailSwitch;

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

  test('keeps the picture and says why in a toast when the replacement does not fit', async ({
    editor,
    feedback,
  }) => {
    const image = editor.image(SAMPLE);

    await image.scrollIntoViewIfNeeded();
    await editor.replaceImage(image, { name: 'scan.pdf', type: 'application/pdf' });

    await expect(feedback.toastByText('scan.pdf: такой тип файла не принимается')).toBeVisible();
    await expect(feedback.toaster).toHaveAttribute('aria-live', 'polite');
    await expect(editor.announcement()).toHaveText('');
    await expect(image).toBeVisible();
    await expect(image.locator('.nui-editor-image__busy')).toHaveCount(0);
  });

  test('picks an image from the slash menu and inserts files by link', async ({ editor }) => {
    const hint = editor.content.locator('p', { hasText: 'Наберите' });

    await editor.caretAtEndOf(hint);
    await editor.pressEnter();
    await editor.typeText('/ima');
    await editor.pressEnter();
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

    await editor.uploadsSwitch.click();
    await editor.caretAtEndOf(hint);
    await editor.showCaret();
    await editor.pressEnter();
    await editor.typeText('/fil');
    await editor.pressEnter();
    await expect(editor.mediaPanel().getByRole('tab')).toHaveCount(0);

    await editor.mediaPanel().getByRole('textbox').fill('https://numior.test/Price%20list.pdf');
    await editor.mediaPanel().getByRole('button', { name: 'Вставить' }).click();
    await expect(editor.file('Price list.pdf')).toBeVisible();
  });

  test('resizes, aligns and captions an image and opens it full screen when published', async ({
    editor,
  }) => {
    const image = editor.image(SAMPLE);

    await image.scrollIntoViewIfNeeded();
    expect(await widthOf(image)).toBe(45);

    await editor.dragGrip(image, 'bottom-end', -40, 0);
    await expect.poll(() => widthOf(image)).toBeLessThan(45);

    const dragged = await widthOf(image);
    const grip = image.locator('[role="slider"]').first();

    await grip.focus();
    await editor.moveCaret('right');
    await expect.poll(() => widthOf(image)).toBeCloseTo(dragged + 5, 0);

    const keyed = await widthOf(image);
    const aspect = await editor.imageAspect(image);

    await editor.dragGrip(image, 'bottom-end', 0, 40);
    await expect.poll(() => widthOf(image)).toBeGreaterThan(keyed);
    expect(await editor.imageAspect(image)).toBeCloseTo(aspect, 1);

    await image.locator('img').click();
    await image.getByRole('radio', { name: 'К концу строки' }).click();
    await expect(image).toHaveClass(/nui-content__image--align-end/u);

    await image.getByRole('radio', { name: 'В тексте' }).click();
    await expect(image).toHaveClass(/nui-content__image--wrap-inline/u);
    await expect(image.getByRole('textbox', { name: 'Добавьте подпись' })).toHaveCount(0);

    await image.getByRole('radio', { name: 'Отдельной строкой' }).click();
    await expect(image).toHaveClass(/nui-content__image--wrap-break/u);

    const caption = image.getByRole('textbox', { name: 'Добавьте подпись' });

    await caption.fill('Рассвет над морем');
    await caption.press('Enter');
    await editor.typeText('Дальше текст');

    await expect(editor.publishedImage(SAMPLE).locator('.nui-content__caption')).toHaveText(
      'Рассвет над морем',
    );

    await expect(image.locator('xpath=../following-sibling::*[1]')).toHaveText('Дальше текст');

    const zoom = editor.publishedImage(SAMPLE).getByRole('button');

    await zoom.click();
    await expect(editor.imageViewer()).toBeVisible();

    await editor.pressEscape();
    await expect(editor.imageViewer()).toBeHidden();
    await expect(zoom).toBeFocused();
  });

  test('passes axe with the media panel, the image bar and the image viewer open', async ({
    playground,
    editor,
  }) => {
    const section = 'section[aria-labelledby="editor-title"]';

    await editor.image(SAMPLE).locator('img').click();
    await expect(editor.image(SAMPLE).locator('.nui-editor-image__bar')).toBeVisible();
    expect(await playground.wcagViolations(section)).toEqual([]);

    await editor.placeAtEnd();
    await editor.pressEnter();
    await editor.typeText('/ima');
    await editor.pressEnter();
    await expect(editor.mediaPanel()).toBeVisible();
    expect(await playground.wcagViolations('.nui-editor-media')).toEqual([]);

    await editor.pressEscape();

    await editor.publishedImage(SAMPLE).getByRole('button').click();
    await expect(editor.imageViewer()).toBeVisible();
    expect(await playground.wcagViolations('.nui-content__viewer')).toEqual([]);
  });
});

import { expect, test } from '@playwright/test';
import { PlaygroundPage } from './pages/playground';

const PDF = { name: 'contract.pdf', mimeType: 'application/pdf', size: 2048 };
const TEXT = { name: 'notes.txt', mimeType: 'text/plain', size: 512 };
const BIG = { name: 'scan.pdf', mimeType: 'application/pdf', size: 1024 * 1024 + 1 };
const VIDEO = { name: 'clip.mp4', mimeType: 'video/mp4', size: 64 };

test.describe('upload', () => {
  test('uploads chosen files with progress, keeps existing files and removes them', async ({
    page,
  }) => {
    const playground = new PlaygroundPage(page);
    await playground.open();
    const { upload } = playground;
    await upload.documents.scrollIntoViewIfNeeded();
    await expect(upload.row(upload.documents, 'brief.pdf')).toContainText(/340 (kB|кБ)/);
    await upload.choose(upload.documents, PDF, TEXT);
    await expect(upload.row(upload.documents, 'contract.pdf').locator('progress')).toBeVisible();

    await expect
      .poll(async () => (await upload.readOutput()).documents.map((d) => d.status))
      .toEqual(['done', 'done', 'done']);

    const output = await upload.readOutput();
    expect(output.documents[1]?.result).toBe('https://files.example/contract.pdf');
    await expect(upload.description(upload.documents, 'notes.txt')).toHaveText(/512 (byte|Б)/);
    await upload.action(upload.documents, 'brief.pdf', 'Удалить').click();
    await expect(upload.row(upload.documents, 'brief.pdf')).toHaveCount(0);
    await expect.poll(async () => (await upload.readOutput()).documents).toHaveLength(2);
  });

  test('lists or drops rejected files, retries a failed upload and cancels a running one', async ({
    page,
  }) => {
    const playground = new PlaygroundPage(page);
    await playground.open();
    const { upload } = playground;
    await upload.documents.scrollIntoViewIfNeeded();
    await upload.drop(upload.documents, BIG, VIDEO);
    await expect(upload.description(upload.documents, 'scan.pdf')).toHaveText('Файл больше 1 МБ');

    await expect(upload.description(upload.documents, 'clip.mp4')).toHaveText(
      'Неподдерживаемый тип файла',
    );

    await expect(upload.action(upload.documents, 'scan.pdf', 'Повторить')).toHaveCount(0);
    await upload.action(upload.documents, 'scan.pdf', 'Удалить').click();
    await upload.action(upload.documents, 'clip.mp4', 'Удалить').click();
    await upload.dropToggle.check();
    await upload.drop(upload.documents, VIDEO);
    await expect(upload.row(upload.documents, 'clip.mp4')).toHaveCount(0);

    await expect
      .poll(async () => (await upload.readOutput()).rejections)
      .toEqual(['scan.pdf', 'clip.mp4', 'clip.mp4']);

    await upload.failToggle.check();
    await upload.choose(upload.documents, { ...TEXT, name: 'report.txt' });

    await expect(upload.description(upload.documents, 'report.txt')).toHaveText(
      'Сервер не принял файл',
    );

    await upload.action(upload.documents, 'report.txt', 'Повторить').click();

    await expect
      .poll(
        async () =>
          (await upload.readOutput()).documents.find((d) => d.name === 'report.txt')?.status,
      )
      .toBe('done');

    await upload.choose(upload.documents, { ...TEXT, name: 'slow.txt' });
    await upload.action(upload.documents, 'slow.txt', 'Отменить загрузку').click();
    await expect(upload.row(upload.documents, 'slow.txt')).toHaveCount(0);
  });

  test('shows image thumbnails in the grid and highlights the zone while dragging', async ({
    page,
  }) => {
    const playground = new PlaygroundPage(page);
    await playground.open();
    const { upload } = playground;
    await upload.images.scrollIntoViewIfNeeded();
    await upload.dragOver(upload.images);
    await expect(upload.images).toHaveClass(/nui-upload--dragging/);
    await upload.dragLeave(upload.images);
    await expect(upload.images).not.toHaveClass(/nui-upload--dragging/);
    await upload.choose(upload.images, { name: 'photo.png', mimeType: 'image/png', size: 128 });
    await expect(upload.thumbnail(upload.images, 'photo.png')).toHaveAttribute('src', /^blob:/);

    await expect
      .poll(async () => (await upload.readOutput()).images)
      .toEqual([{ name: 'photo.png', status: 'done' }]);
  });

  test('opens the file dialog from the button with the keyboard and from the zone with a click', async ({
    page,
    isMobile,
  }) => {
    const playground = new PlaygroundPage(page);
    await playground.open();
    const { upload } = playground;
    await upload.documents.scrollIntoViewIfNeeded();
    const fromZone = page.waitForEvent('filechooser');
    await upload.zone(upload.documents).click({ position: { x: 10, y: 10 } });
    expect((await fromZone).isMultiple()).toBe(true);
    if (isMobile) {
      return;
    }
    await upload.browse(upload.documents).focus();
    const fromKeyboard = page.waitForEvent('filechooser');
    await page.keyboard.press('Enter');
    await fromKeyboard;
  });

  test('upload has no automatically detectable WCAG AA violations', async ({ page }) => {
    const playground = new PlaygroundPage(page);
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    const { upload } = playground;
    await upload.documents.scrollIntoViewIfNeeded();
    await upload.failToggle.check();
    await upload.choose(upload.documents, { ...TEXT, name: 'broken.txt' });

    await expect(upload.description(upload.documents, 'broken.txt')).toHaveText(
      'Сервер не принял файл',
    );

    for (const theme of ['light', 'dark'] as const) {
      await playground.setTheme(theme);
      expect(await playground.wcagViolations()).toEqual([]);
    }
  });
});

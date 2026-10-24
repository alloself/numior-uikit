import { expect, test } from '@playwright/test';
import { ordersXlsx } from './helpers/xlsx';
import { PlaygroundPage } from './pages/playground';

test.describe('book', () => {
  test('shows the sheet with letters, numbers, formats, merged title and frozen panes', async ({
    page,
  }) => {
    const playground = new PlaygroundPage(page);
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    const { book } = playground;
    await book.sheet.scrollIntoViewIfNeeded();
    await expect(book.grid).toHaveAccessibleName('Книга');
    await expect(book.columnHeader('A')).toBeVisible();
    await expect(book.cell('1', 0)).toHaveText('Бюджет на первое полугодие, тыс. ₽');
    expect(await book.merged('1', 0)).toBe(true);
    await expect(book.cell('4', 1)).toHaveText('-610');
    await expect(book.cell('3', 2)).toHaveText(/^1\s325$/u);
    await book.scrollBody(400);
    await expect(book.cell('2', 0)).toBeInViewport();
    await expect(book.cell('3', 0)).not.toBeInViewport();
    expect(await book.bordered()).toBe(true);
  });

  test('switches to a sheet without gridlines and opens an xlsx file', async ({ page }) => {
    const playground = new PlaygroundPage(page);
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    const { book } = playground;
    await book.sheet.scrollIntoViewIfNeeded();
    await book.chooseSheet('Заметки');
    await expect(book.cell('1', 0)).toHaveText('Второй лист без сетки');
    expect(await book.bordered()).toBe(false);
    await book.openFile(await ordersXlsx());
    await expect(book.cell('2', 1)).toHaveText(/^1\s250,50$/u);
    await expect(book.cell('1', 0)).toHaveText('Order');
  });

  test('book has no automatically detectable WCAG AA violations', async ({ page }) => {
    const playground = new PlaygroundPage(page);
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    for (const theme of ['light', 'dark'] as const) {
      await playground.setTheme(theme);
      expect(await playground.wcagViolations('section[aria-labelledby="book-title"]')).toEqual([]);
    }
  });
});

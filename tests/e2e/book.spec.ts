import { expect, test } from './fixtures';
import { ordersXlsx } from './helpers/xlsx';

test.describe('book', () => {
  test('shows the sheet with letters, numbers, formats, merged title and frozen panes', async ({
    playground,
    book,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
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

  test('switches to a sheet without gridlines and opens an xlsx file', async ({
    playground,
    book,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await book.sheet.scrollIntoViewIfNeeded();
    await book.chooseSheet('Заметки');
    await expect(book.cell('1', 0)).toHaveText('Второй лист без сетки');
    expect(await book.bordered()).toBe(false);

    await book.openFile(await ordersXlsx());
    await expect(book.cell('2', 1)).toHaveText(/^1\s250,50$/u);
    await expect(book.cell('1', 0)).toHaveText('Order');
  });

  test('edits a cell, recalculates the formula totals and undoes the edit', async ({
    playground,
    book,
    page,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await book.sheet.scrollIntoViewIfNeeded();
    await expect(book.cell('8', 1)).toHaveText('85');

    await book.enter('3', 1, '2000');

    await expect(book.cell('3', 1)).toHaveText(/^2\s000$/u);
    await expect(book.cell('8', 1)).toHaveText('845');
    await expect(book.changes).toHaveText('Правок: 1');

    await book.startEdit('8', 1);

    await expect(book.editor).toHaveValue('=СУММ(B3:B7)');

    await page.keyboard.press('Escape');
    await page.keyboard.press('Control+z');

    await expect(book.cell('3', 1)).toHaveText(/^1\s240$/u);
    await expect(book.cell('8', 1)).toHaveText('85');
    await expect(book.changes).toHaveText('Правок: 2');
  });

  test('book has no automatically detectable WCAG AA violations', async ({ playground }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();

    for (const theme of ['light', 'dark'] as const) {
      await playground.setTheme(theme);
      expect(await playground.wcagViolations('section[aria-labelledby="book-title"]')).toEqual([]);
    }
  });
});

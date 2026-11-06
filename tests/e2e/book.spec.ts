import { expect, test } from './fixtures';
import { boxOf } from './helpers/geometry';
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

  test('shows the formula of the active cell, edits it from the formula bar and goes to a typed address', async ({
    playground,
    book,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await book.sheet.scrollIntoViewIfNeeded();
    await book.cell('8', 1).click();

    await expect(book.nameBox).toHaveValue('B8');
    await expect(book.formula).toHaveValue('=СУММ(B3:B7)');

    await book.enterInFormulaBar('3', 1, '2000');

    await expect(book.cell('8', 1)).toHaveText('845');
    await expect(book.cell('4', 1)).toBeFocused();
    await expect(book.changes).toHaveText('Правок: 1');

    await book.goTo('g7');

    await expect(book.cell('7', 6)).toBeFocused();
    await expect(book.nameBox).toHaveValue('G7');

    await book.expand.click();

    await expect(book.expand).toHaveAttribute('aria-expanded', 'true');
  });

  test('picks references with clicks and drags, paints them like their frames and anchors them with F4', async ({
    playground,
    book,
    page,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await book.sheet.scrollIntoViewIfNeeded();
    await book.cell('9', 1).click();
    await page.keyboard.type('=СУММ(');
    await book.cell('3', 1).click();

    await expect(book.editor).toHaveValue('=СУММ(B3');
    await expect(book.referenceFrames).toHaveCount(1);

    await book.dragAcross({ row: '3', col: 1 }, { row: '5', col: 1 });
    await page.keyboard.press('F4');

    await expect(book.editor).toHaveValue('=СУММ($B$3:$B$5');
    await expect(book.formula).toHaveValue('=СУММ($B$3:$B$5');
    await expect(book.paintedReferences).toHaveText(['$B$3:$B$5']);

    await page.keyboard.type(')');
    await page.keyboard.press('Enter');

    await expect(book.cell('9', 1)).toHaveText('490');
    await expect(book.referenceFrames).toHaveCount(0);
  });

  test('moves a reference by the edge of its frame and resizes it by a corner', async ({
    playground,
    book,
    page,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await book.sheet.scrollIntoViewIfNeeded();
    await book.cell('9', 1).click();
    await page.keyboard.type('=СУММ(B3:B4');
    await book.dragGrip('top', { row: '4', col: 0 });

    await expect(book.editor).toHaveValue('=СУММ(A4:A5');
    await expect(book.formula).toHaveValue('=СУММ(A4:A5');

    await book.dragGrip('bottom-end', { row: '6', col: 1 });

    await expect(book.editor).toHaveValue('=СУММ(A4:B6');
    await expect(book.editor).toBeFocused();

    await page.keyboard.press('Escape');

    await expect(book.referenceFrames).toHaveCount(0);
    await expect(book.changes).toHaveText('Правок: 0');
  });

  test('suggests functions for a typed name and hints the argument being typed', async ({
    playground,
    book,
    page,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await book.sheet.scrollIntoViewIfNeeded();
    await book.cell('9', 1).click();
    await page.keyboard.type('=СУ');

    await expect(book.functions).toBeVisible();
    await expect(book.functions.getByRole('option').first()).toContainText('СУММ');

    await expect(book.functions.getByRole('option').first()).toContainText(
      'Суммирует числа и диапазоны.',
    );

    await page.keyboard.press('Tab');

    await expect(book.editor).toHaveValue('=СУММ(');
    await expect(book.functions).toBeHidden();
    await expect(book.hint).toHaveText('СУММ(число1; [число2]; …)');
    await expect(book.currentArgument).toHaveText('число1');

    await page.keyboard.type('B3:B7;');

    await expect(book.currentArgument).toHaveText('[число2]');

    await page.keyboard.press('Backspace');
    await page.keyboard.type(')');
    await page.keyboard.press('Enter');

    await expect(book.hint).toBeHidden();
    await expect(book.cell('9', 1)).toHaveText('85');
  });

  test('opens an existing formula with its frames and uncut text from the cell, a double click and the bar', async ({
    playground,
    book,
    page,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await book.sheet.scrollIntoViewIfNeeded();
    await book.cell('8', 1).click();

    await expect(book.formula).toHaveValue('=СУММ(B3:B7)');
    await expect(book.referenceFrames).toHaveCount(0);

    await page.keyboard.press('F2');

    await expect(book.editor).toHaveValue('=СУММ(B3:B7)');
    await expect(book.referenceFrames).toHaveCount(1);
    await expect(book.paintedReferences).toHaveText(['B3:B7']);
    expect(await book.editorCutsTextShort()).toBe(false);

    await page.keyboard.press('Escape');
    await book.cell('8', 1).dblclick();

    await expect(book.editor).toHaveValue('=СУММ(B3:B7)');
    await expect(book.referenceFrames).toHaveCount(1);
    expect(await book.editorCutsTextShort()).toBe(false);

    await page.keyboard.press('Escape');
    await book.formula.click();

    await expect(book.referenceFrames).toHaveCount(1);
    await expect(book.paintedReferences).toHaveText(['B3:B7']);

    await page.keyboard.press('Escape');

    await expect(book.referenceFrames).toHaveCount(0);
    await expect(book.changes).toHaveText('Правок: 0');
  });

  test('grows the cell editor with its text up to the edge of the sheet', async ({
    playground,
    book,
    page,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await book.sheet.scrollIntoViewIfNeeded();
    await book.cell('9', 1).click();
    await page.keyboard.type('=B3+B4');

    const cell = await boxOf(book.cell('9', 1));
    const short = await book.editorBox();

    expect(short.width).toBeLessThanOrEqual(cell.width);

    await page.keyboard.type('+B5+B6+B7+C3+C4+C5+C6+C7+D3+D4+D5+D6+D7+E3+E4+E5+E6+E7+F3+F4+F5');

    const visible = await book.viewportBox();
    const long = await book.editorBox();

    expect(long.width).toBeGreaterThan(cell.width);
    expect(long.x).toBeCloseTo(short.x, 0);
    expect(long.x + long.width).toBeLessThanOrEqual(visible.x + visible.width);

    await page.keyboard.press('Escape');

    await expect(book.changes).toHaveText('Правок: 0');
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

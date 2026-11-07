import { expect, test } from './fixtures';
import { rgbDelta, type Rgb } from './helpers/color';
import { boxOf } from './helpers/geometry';
import { ordersXlsx, pricesXlsx } from './helpers/xlsx';

const PINK: Rgb = [255, 199, 206];

const TWO_FIFTHS_GREEN: Rgb = [193, 229, 202];

const WHITE: Rgb = [255, 255, 255];

const firstRowOf = (formula: string): number => Number(/[A-Z]+(\d+)/u.exec(formula)?.[1] ?? 0);

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

  test('paints conditional formats and repaints them after an edit', async ({
    playground,
    book,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await book.sheet.scrollIntoViewIfNeeded();

    expect(rgbDelta(await book.fillAt('3', 1), WHITE)).toBeLessThan(8);
    expect(rgbDelta(await book.fillAt('3', 3), TWO_FIFTHS_GREEN)).toBeLessThan(8);
    expect(rgbDelta(await book.fillAt('4', 3), PINK)).toBeLessThan(8);
    expect(rgbDelta(await book.fillAt('4', 1), PINK)).toBeGreaterThan(30);

    await book.enter('4', 1, '-800');

    await expect.poll(async () => rgbDelta(await book.fillAt('4', 1), PINK)).toBeLessThan(8);
  });

  test('draws data bars behind the values and arrows before the totals', async ({
    playground,
    book,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await book.sheet.scrollIntoViewIfNeeded();

    expect(await book.barShare('5', 1)).toBeLessThan(0.15);
    expect(await book.barShare('5', 3)).toBeGreaterThan(0.35);

    const [red, green, blue] = await book.barRgb('5', 3);

    expect(blue - red).toBeGreaterThan(30);
    expect(blue - green).toBeGreaterThan(15);

    await expect.poll(() => book.iconGlyph('8', 1)).toContain('lucide-arrow-down');

    expect(await book.iconGlyph('8', 3)).toContain('lucide-arrow-right');
    await expect(book.cell('8', 1)).toContainText('85');
  });

  test('hides the fill handle together with the active cell when focus leaves the sheet', async ({
    playground,
    book,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await book.sheet.scrollIntoViewIfNeeded();
    await book.cell('4', 1).click();

    await expect(book.fillGrip).toBeVisible();

    await book.leaveSheet();

    await expect(book.fillGrip).toBeHidden();

    await book.cell('4', 1).click();

    await expect(book.fillGrip).toBeVisible();
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

  test('reports values saved in an opened file and recalculates them on request', async ({
    playground,
    book,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await book.sheet.scrollIntoViewIfNeeded();

    await expect(book.report).toHaveCount(0);

    await book.openFile(await pricesXlsx());
    await expect(book.cell('2', 1)).toHaveText('42');

    await expect(book.report.locator('.nui-alert__title')).toHaveText(
      '1 формула показывает значение, сохранённое в файле',
    );

    await book.recalculateReport();
    await expect(book.report).toHaveCount(0);
    await expect(book.cell('2', 1)).toHaveText('42');
  });

  test('adds, renames and deletes sheets from the tabs and undoes it', async ({
    playground,
    book,
    page,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await book.sheet.scrollIntoViewIfNeeded();
    await book.addSheetButton.click();
    await expect(book.sheetTab('Лист3')).toHaveAttribute('aria-selected', 'true');
    await expect(book.cell('1', 0)).toHaveText('');

    await book.renameSheet('Лист3', 'Заметки');
    await expect(book.sheetNameField).toHaveAccessibleDescription('Это имя уже занято');

    await page.keyboard.press('Escape');
    await book.renameSheet('Лист3', 'План');
    await expect(book.sheetTab('План')).toBeVisible();

    await book.sheetMenu('Заметки', 'Удалить');
    await expect(book.sheetTab('Заметки')).toHaveCount(0);

    await book.sheetTab('План').press('Control+z');
    await expect(book.sheetTab('Заметки')).toBeVisible();

    await book.chooseSheet('Заметки');
    await expect(book.cell('1', 0)).toHaveText('Второй лист без сетки');
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

  test('copies a formula with shifted references, moves a cut cell and undoes the move', async ({
    playground,
    book,
    page,
  }) => {
    await book.stubClipboard();
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await book.sheet.scrollIntoViewIfNeeded();
    await book.cell('8', 1).click();
    await page.keyboard.press('Control+c');

    await expect(book.clipFrame).toBeVisible();

    await book.goTo('H8');
    await book.paste(await book.lastCopy());

    await expect(book.formula).toHaveValue('=СУММ(H3:H7)');
    await expect(book.cell('8', 7)).toHaveText('0');

    await page.keyboard.press('Escape');

    await expect(book.clipFrame).toHaveCount(0);

    await book.goTo('A10');
    await page.keyboard.press('Control+x');
    await expect.poll(() => book.lastCopy()).toContain('Цифры условные');

    await book.goTo('A12');
    await book.paste(await book.lastCopy());

    await expect(book.cell('12', 0)).toContainText('Цифры условные');
    await expect(book.cell('10', 0)).toHaveText('');

    await page.keyboard.press('Control+z');

    await expect(book.cell('10', 0)).toContainText('Цифры условные');
    await expect(book.cell('12', 0)).toHaveText('');
  });

  test('scrolls the sheet while a reference frame or the fill handle is held at its edge', async ({
    playground,
    book,
    page,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await book.sheet.scrollIntoViewIfNeeded();
    await book.cell('9', 1).click();
    await page.keyboard.type('=СУММ(B4:B5');

    await expect(book.cellReferences).toHaveText(['B4:B5']);

    await book.holdPastBottom(
      book.referenceFrames.first().locator('.nui-spreadsheet__grip--top'),
      async () => firstRowOf(await book.formula.inputValue()) > 40,
    );

    expect(firstRowOf(await book.formula.inputValue())).toBeGreaterThan(40);

    await page.keyboard.press('Escape');
    await book.scrollBody(0);
    await book.enter('12', 0, '1');
    await book.enter('13', 0, '2');
    await book.dragAcross({ row: '12', col: 0 }, { row: '13', col: 0 });
    await book.holdPastBottom(book.fillGrip, async () => (await book.scrollTop()) > 800);
    await book.goTo('A40');

    await expect(book.cell('40', 0)).toHaveText('29');
  });

  test('keeps the grips of a frame on the first row and column within reach', async ({
    playground,
    book,
    page,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await book.sheet.scrollIntoViewIfNeeded();
    await book.cell('9', 1).click();
    await page.keyboard.type('=A1+1');

    await expect(book.referenceFrames).toHaveCount(1);
    expect(await book.gripReachable('top-start')).toBe(true);
    expect(await book.gripReachable('top')).toBe(true);
    expect(await book.gripReachable('bottom-end')).toBe(true);

    await page.keyboard.press('Escape');
  });

  test('lays the formula bar out by the page direction and the grid by the sheet', async ({
    playground,
    book,
  }) => {
    await playground.open();
    await playground.setDirection('rtl');
    await book.sheet.scrollIntoViewIfNeeded();

    const name = await boxOf(book.nameBox);
    const formula = await boxOf(book.formula);
    const first = await boxOf(book.cell('3', 0));
    const second = await boxOf(book.cell('3', 1));

    expect(name.x).toBeGreaterThan(formula.x);
    expect(first.x).toBeLessThan(second.x);
  });

  test('continues a series with the fill handle, copies with Ctrl+D and undoes the fill', async ({
    playground,
    book,
    page,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await book.sheet.scrollIntoViewIfNeeded();
    await book.enter('12', 0, '1');
    await book.enter('13', 0, '2');
    await book.dragAcross({ row: '12', col: 0 }, { row: '13', col: 0 });
    await book.dragFill({ row: '16', col: 0 });

    await expect(book.cell('14', 0)).toHaveText('3');
    await expect(book.cell('16', 0)).toHaveText('5');

    await page.keyboard.press('Control+z');

    await expect(book.cell('14', 0)).toHaveText('');

    await book.dragAcross({ row: '12', col: 0 }, { row: '15', col: 0 });
    await page.keyboard.press('Control+d');

    await expect(book.cell('15', 0)).toHaveText('1');
  });

  test('clears the cells the fill handle is dragged back over and shrinks the selection', async ({
    playground,
    book,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await book.sheet.scrollIntoViewIfNeeded();
    await book.enter('12', 0, '1');
    await book.enter('13', 0, '2');
    await book.dragAcross({ row: '12', col: 0 }, { row: '13', col: 0 });
    await book.dragFill({ row: '16', col: 0 });

    await expect(book.cell('16', 0)).toHaveText('5');

    await book.holdFill({ row: '13', col: 0 });

    await expect(book.fillClear).toBeVisible();

    await book.releaseFill();

    await expect(book.cell('13', 0)).toHaveText('2');
    await expect(book.cell('14', 0)).toHaveText('');
    await expect(book.cell('16', 0)).toHaveText('');
    await expect(book.fillClear).toHaveCount(0);
    await expect.poll(() => book.fillGripBelow({ row: '13', col: 0 })).toBe(true);

    await book.dragAcross({ row: '13', col: 0 }, { row: '15', col: 0 });
    await book.dragFill({ row: '13', col: 0 });

    await expect.poll(() => book.fillGripBelow({ row: '13', col: 0 })).toBe(true);
  });

  test('keeps the fill handle whole on the edge of the frozen rows', async ({
    playground,
    book,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await book.sheet.scrollIntoViewIfNeeded();
    await book.cell('2', 1).click();

    await expect.poll(() => book.fillGripWhole()).toBe(true);
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
    await expect(book.signature).toHaveText('СУММ(число1; [число2]; …)');
    await expect(book.summary).toHaveText('Суммирует числа и диапазоны.');
    await expect(book.currentArgument).toHaveText('число1');

    await page.keyboard.type('B3:B7;');

    await expect(book.currentArgument).toHaveText('[число2]');

    await page.keyboard.press('Backspace');
    await page.keyboard.type(')');
    await page.keyboard.press('Enter');

    await expect(book.hint).toBeHidden();
    await expect(book.cell('9', 1)).toHaveText('85');
  });

  test('frames the ranges of a selected formula and lets them be moved once it is edited', async ({
    playground,
    book,
    page,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await book.sheet.scrollIntoViewIfNeeded();
    await book.cell('8', 1).click();

    await expect(book.formula).toHaveValue('=СУММ(B3:B7)');
    await expect(book.referenceFrames).toHaveCount(1);
    await expect(book.frameGrips).toHaveCount(0);
    await expect(book.paintedReferences).toHaveText(['B3:B7']);

    await book.cell('8', 2).click();

    await expect(book.formula).toHaveValue('=СУММ(C3:C7)');
    await expect(book.referenceFrames).toHaveCount(1);

    await book.cell('8', 1).click();
    await page.keyboard.press('F2');

    await expect(book.editor).toHaveValue('=СУММ(B3:B7)');
    await expect(book.referenceFrames).toHaveCount(1);
    await expect(book.frameGrips).toHaveCount(8);
    expect(await book.editorCutsTextShort()).toBe(false);

    await page.keyboard.press('Escape');

    await expect(book.frameGrips).toHaveCount(0);

    await book.cell('8', 1).dblclick();

    await expect(book.editor).toHaveValue('=СУММ(B3:B7)');
    await expect(book.frameGrips).toHaveCount(8);
    expect(await book.editorCutsTextShort()).toBe(false);

    await page.keyboard.press('Escape');
    await book.formula.click();

    await expect(book.frameGrips).toHaveCount(8);
    await expect(book.paintedReferences).toHaveText(['B3:B7']);

    await page.keyboard.press('Escape');
    await book.cell('3', 0).click();

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

  test('picks references with the arrows in the cell editor and starts again after an operator', async ({
    playground,
    book,
    page,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await book.sheet.scrollIntoViewIfNeeded();
    await book.cell('9', 2).click();
    await page.keyboard.type('=');
    await page.keyboard.press('ArrowUp');

    await expect(book.editor).toHaveValue('=C8');

    await page.keyboard.press('ArrowLeft');

    await expect(book.editor).toHaveValue('=B8');

    await page.keyboard.press('Shift+ArrowUp');

    await expect(book.editor).toHaveValue('=B7:B8');

    await page.keyboard.type('+');
    await page.keyboard.press('ArrowLeft');

    await expect(book.editor).toHaveValue('=B7:B8+B9');
    await expect(book.referenceFrames).toHaveCount(2);

    await page.keyboard.press('Escape');

    await expect(book.cell('9', 2)).toHaveText('');
    await expect(book.referenceFrames).toHaveCount(0);
  });

  test('picks a reference with a tap on a phone', async ({ playground, book, page, isMobile }) => {
    test.skip(!isMobile, 'touch only');
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await book.sheet.scrollIntoViewIfNeeded();
    await book.cell('9', 1).tap();
    await book.formula.tap();
    await book.formula.fill('=');
    await book.cell('3', 1).tap();

    await expect(book.formula).toHaveValue('=B3');
    await expect(book.formula).toBeFocused();
    await expect(book.referenceFrames).toHaveCount(1);

    await page.keyboard.press('Escape');

    await expect(book.cell('9', 1)).toHaveText('');
    await expect(book.changes).toHaveText('Правок: 0');
  });

  test('keeps the frames of a formula under the frozen rows while the sheet scrolls', async ({
    playground,
    book,
    isMobile,
  }) => {
    test.skip(isMobile, 'the probe reads cells outside the narrow sheet');
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await book.sheet.scrollIntoViewIfNeeded();
    await book.enter('9', 1, '=СУММ(D3:D4)');
    await book.cell('9', 1).click();

    await expect(book.cell('9', 1)).toHaveText('736');
    await expect(book.referenceFrames).toHaveCount(1);

    expect(await book.tintOver(book.referenceFrames.first(), book.cell('3', 7), 8)).toBeGreaterThan(
      5,
    );

    await book.scrollBody(72);

    await expect
      .poll(() => book.tintOver(book.referenceFrames.first(), book.columnHeader('E'), 40))
      .toBeLessThanOrEqual(3);
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

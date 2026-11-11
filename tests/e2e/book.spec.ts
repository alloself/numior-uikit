import { expect, test } from './fixtures';
import { rgbDelta, type Rgb } from './helpers/color';
import { boxOf } from './helpers/geometry';
import { ordersXlsx, pricesXlsx } from './helpers/xlsx';
import type { Theme } from './pages/playground';

const PINK: Rgb = [255, 199, 206];

const TWO_FIFTHS_GREEN: Rgb = [193, 229, 202];

const WHITE: Rgb = [255, 255, 255];

const COLUMN_DRAG = 40;

const DEFAULT_COLUMN = 64;

const LONG_FIELD = 300;

const LISTED_ITEMS = 100;

const citiesBlock = (count: number): string =>
  [
    'Город\tСумма',
    ...Array.from({ length: count }, (_, at) => `Город ${String(at + 1)}\t${String(at + 1)}`),
  ].join('\n');

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
    expect(await book.gridlines()).toBe(true);
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

  test('keeps the grid lines of filled cells in the theme colour in the dark theme', async ({
    playground,
    book,
  }) => {
    await playground.open();
    await playground.setTheme('dark');
    await book.sheet.scrollIntoViewIfNeeded();

    const plain = await book.lineColor('6', 2);

    expect(await book.lineColor('2', 1)).toBe(plain);
    expect(await book.lineColor('3', 3)).toBe(plain);
    expect(await book.lineColor('4', 3)).toBe(plain);
    expect(await book.lineColor('5', 3)).toBe(plain);
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

  test('lists, lights, reorders and deletes conditional rules in a popover at the cell', async ({
    playground,
    book,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await book.sheet.scrollIntoViewIfNeeded();
    await book.openRules('4', 1);

    await expect(book.rules).toBeVisible();

    const popover = await boxOf(book.rules);
    const anchor = await boxOf(book.cell('4', 1));

    expect(
      popover.y >= anchor.y + anchor.height - 1 || popover.y + popover.height <= anchor.y + 1,
    ).toBe(true);

    await expect(book.ruleTitles).toHaveText([
      'Значение меньше -650',
      'Цветовая шкала из 2 цветов',
      'Гистограммы',
      'Набор значков',
    ]);

    await book.ruleItems.nth(2).hover();

    await expect(book.litFrames).toHaveCount(1);

    const lit = await boxOf(book.litFrames);
    const marketing = await boxOf(book.cell('5', 1));

    expect(Math.abs(lit.y - marketing.y)).toBeLessThan(3);

    await book.dragRule(0, 1);

    await expect(book.ruleTitles.first()).toHaveText('Цветовая шкала из 2 цветов');

    await book.deleteRule(0);

    await expect(book.ruleItems).toHaveCount(3);
    await expect.poll(async () => rgbDelta(await book.fillAt('3', 3), WHITE)).toBeLessThan(8);

    await book.page.keyboard.press('Escape');

    await expect(book.rules).toBeHidden();
    await expect(book.litFrames).toHaveCount(0);
    await expect(book.cell('4', 1)).toBeFocused();
  });

  test('closes the rules popover on a click outside it', async ({ playground, book }) => {
    await playground.open();
    await book.sheet.scrollIntoViewIfNeeded();
    await book.openRules('4', 1);
    await book.ruleItems.nth(2).hover();

    await expect(book.litFrames).toHaveCount(1);

    await book.cell('12', 1).click();

    await expect(book.rules).toBeHidden();
    await expect(book.litFrames).toHaveCount(0);
    await expect(book.cell('12', 1)).toBeFocused();
  });

  test('adds a rule from the selection and edits it in the rules popover', async ({
    playground,
    book,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await book.sheet.scrollIntoViewIfNeeded();
    await book.openRules('6', 1);
    await book.addRule();

    await expect(book.ruleField('Применить к')).toBeFocused();
    await expect(book.ruleField('Применить к')).toHaveValue('B6');

    await book.ruleField('Применить к').fill('B6:G6');
    await book.saveRule();

    await expect(book.ruleField('Значение')).toBeFocused();
    await expect(book.ruleEditor.getByText('Введите число или формулу')).toBeVisible();

    await book.ruleField('Значение').fill('-100');
    await book.saveRule();

    await expect(book.ruleEditor).toBeHidden();
    await expect(book.ruleTitles.first()).toHaveText('Значение больше -100');
    await expect(book.ruleItems.first().getByRole('button', { name: /^Изменить/ })).toBeFocused();
    await expect(book.litFrames).toHaveCount(1);

    await book.page.keyboard.press('Escape');

    await expect(book.litFrames).toHaveCount(0);
    await expect.poll(async () => rgbDelta(await book.fillAt('6', 2), PINK)).toBeLessThan(8);

    await book.openRules('6', 1);
    await book.editRule(0);

    await expect(book.ruleField('Значение')).toHaveValue('-100');

    await book.ruleEditor.getByRole('combobox', { name: 'Условие' }).click();
    await book.page.keyboard.press('Escape');

    await expect(book.ruleEditor.getByRole('listbox')).toBeHidden();
    await expect(book.ruleEditor).toBeVisible();

    await book.ruleField('Значение').fill('-90');
    await book.page.keyboard.press('Enter');

    await expect(book.ruleTitles.first()).toHaveText('Значение больше -90');

    await book.page.keyboard.press('Escape');

    await expect(book.rules).toBeHidden();
    await expect(book.litFrames).toHaveCount(0);
    await expect.poll(async () => rgbDelta(await book.fillAt('6', 2), WHITE)).toBeLessThan(8);
  });

  for (const theme of ['light', 'dark'] satisfies readonly Theme[]) {
    test(`passes axe with the rules panel open in the ${theme} theme`, async ({
      playground,
      book,
    }) => {
      await playground.open();
      await playground.setTheme(theme);
      await book.sheet.scrollIntoViewIfNeeded();
      await book.openRules('4', 1);

      await expect(book.ruleItems).toHaveCount(4);
      expect(await playground.wcagViolations('section[aria-labelledby="book-title"]')).toEqual([]);

      await book.editRule(0);

      await expect(book.ruleEditor).toBeVisible();
      expect(await playground.wcagViolations('section[aria-labelledby="book-title"]')).toEqual([]);
    });
  }

  test('switches to a sheet without gridlines and opens an xlsx file', async ({
    playground,
    book,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await book.sheet.scrollIntoViewIfNeeded();
    await book.chooseSheet('Заметки');
    await expect(book.cell('1', 0)).toHaveText('Второй лист без сетки');
    expect(await book.gridlines()).toBe(false);

    await book.openFile(await ordersXlsx());
    await expect(book.cell('2', 1)).toHaveText(/^1\s250,50$/u);
    await expect(book.cell('1', 0)).toHaveText('Order');
  });

  test('saves an edited book and opens the saved file again', async ({ playground, book }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await book.sheet.scrollIntoViewIfNeeded();
    await book.enter('1', 0, 'Сохранённый текст');
    await expect(book.fileEdited).toBeVisible();
    expect(await book.fileNameWidth()).toBeGreaterThan(40);

    const saved = await book.saveFile();

    await expect(book.fileEdited).toHaveCount(0);
    expect(saved.name).toBe('Образец.xlsx');

    await book.enter('1', 0, 'Лишняя правка');
    await book.openFile(saved);

    await expect(book.fileDialog.locator('.nui-dialog__title')).toHaveText(
      'Отменить несохранённые правки?',
    );

    await book.confirmFileDialog('Открыть файл');
    await expect(book.cell('1', 0)).toHaveText('Сохранённый текст');
    await expect(book.fileName).toHaveText('Образец.xlsx');
    await expect(book.fileEdited).toHaveCount(0);
  });

  test('names the reason when a chosen file is not a book', async ({ playground, book }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await book.sheet.scrollIntoViewIfNeeded();

    await book.openFile({
      name: 'notes.xlsx',
      mimeType: 'text/plain',
      buffer: Buffer.from('plain text'),
    });

    await expect(book.fileFailure).toHaveText('Этот файл не является книгой XLSX');
    await expect(book.cell('1', 0)).not.toHaveText('plain text');
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
    await expect(book.sheetTab('Лист4')).toHaveAttribute('aria-selected', 'true');
    await expect(book.cell('1', 0)).toHaveText('');

    await book.renameSheet('Лист4', 'Заметки');
    await expect(book.sheetNameField).toHaveAccessibleDescription('Это имя уже занято');

    await page.keyboard.press('Escape');
    await book.renameSheet('Лист4', 'План');
    await expect(book.sheetTab('План')).toBeVisible();

    await book.sheetMenu('Заметки', 'Удалить');
    await expect(book.sheetTab('Заметки')).toHaveCount(0);

    await book.sheetTab('План').press('Control+z');
    await expect(book.sheetTab('Заметки')).toBeVisible();

    await book.chooseSheet('Заметки');
    await expect(book.cell('1', 0)).toHaveText('Второй лист без сетки');
  });

  test('keeps the width of a dragged column on its sheet, undoes it and resets it by a double click', async ({
    playground,
    book,
    page,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await book.sheet.scrollIntoViewIfNeeded();
    await book.chooseSheet('Заметки');

    const elsewhere = await book.columnWidth('B');

    await book.chooseSheet('Продажи');

    const before = await book.columnWidth('B');

    await book.dragColumnEdge('B', COLUMN_DRAG);
    await expect.poll(() => book.columnWidth('B')).toBe(before + COLUMN_DRAG);

    await book.chooseSheet('Заметки');
    await expect.poll(() => book.columnWidth('B')).toBe(elsewhere);

    await book.chooseSheet('Продажи');
    await expect.poll(() => book.columnWidth('B')).toBe(before + COLUMN_DRAG);

    await book.cell('2', 0).click();
    await page.keyboard.press('Control+z');
    await expect.poll(() => book.columnWidth('B')).toBe(before);

    await page.keyboard.press('Control+y');
    await book.columnEdge('B').dblclick();
    await expect.poll(() => book.columnWidth('B')).toBe(DEFAULT_COLUMN);
  });

  test('shows the sheet under the tab menu and leaves the focus on the shown sheet', async ({
    playground,
    book,
    page,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await book.sheet.scrollIntoViewIfNeeded();
    await book.chooseSheet('Продажи');

    await book.sheetMenu('Бюджет', 'Удалить');
    await expect(book.sheetTab('Бюджет')).toHaveCount(0);
    await expect(book.sheetTab('Заметки')).toHaveAttribute('aria-selected', 'true');
    await expect(book.sheetTab('Заметки')).toBeFocused();

    await page.keyboard.press('Control+z');
    await expect(book.sheetTab('Бюджет')).toBeVisible();
    await expect(book.sheetTab('Заметки')).toHaveAttribute('aria-selected', 'true');
    await expect(book.sheetTab('Заметки')).toBeFocused();

    await book.sheetMenu('Продажи', 'Вставить лист');
    await expect(book.sheetTab('Лист4')).toHaveAttribute('aria-selected', 'true');
    await expect(book.sheetTab('Лист4')).toBeFocused();

    await book.openSheetMenu('Продажи');
    await page.keyboard.press('Escape');
    await expect(book.sheetTab('Продажи')).toHaveAttribute('aria-selected', 'true');
    await expect(book.sheetTab('Продажи')).toBeFocused();
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

  test('takes the merged title apart under a pasted block and merges it back on undo', async ({
    playground,
    book,
    page,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await book.sheet.scrollIntoViewIfNeeded();
    await book.cell('1', 0).click();
    await book.paste('Раз\tДва');

    await expect(book.cell('1', 0)).toHaveText('Раз');
    await expect(book.cell('1', 1)).toHaveText('Два');
    await expect.poll(() => book.merged('1', 0)).toBe(false);

    await page.keyboard.press('Control+z');

    await expect(book.cell('1', 0)).toHaveText('Бюджет на первое полугодие, тыс. ₽');
    await expect.poll(() => book.merged('1', 0)).toBe(true);
  });

  for (const theme of ['light', 'dark'] satisfies readonly Theme[]) {
    test(`shows why a fill over the merged title did nothing in the ${theme} theme`, async ({
      playground,
      book,
      page,
    }) => {
      await playground.emulate({ reducedMotion: 'reduce' });
      await playground.open();
      await playground.setTheme(theme);
      await book.sheet.scrollIntoViewIfNeeded();
      await book.dragAcross({ row: '3', col: 0 }, { row: '1', col: 0 });
      await page.keyboard.press('Control+d');

      await expect(book.note).toHaveText('Нельзя заполнить: в диапазоне есть объединённые ячейки');
      await expect(book.cell('1', 0)).toHaveText('Бюджет на первое полугодие, тыс. ₽');
      expect(await playground.wcagViolations('section[aria-labelledby="book-title"]')).toEqual([]);

      await book.enter('12', 0, '1');

      await expect(book.note).toBeHidden();
    });
  }

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
    await page.keyboard.press('End');

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
    await page.keyboard.type('=B3');

    const cell = await boxOf(book.cell('9', 1));
    const short = await book.editorBox();

    expect(short.width).toBeLessThanOrEqual(cell.width);

    await page.keyboard.type('+B4+B5+B6+B7+C3+C4+C5+C6+C7+D3+D4+D5+D6+D7+E3+E4+E5+E6+E7+F3+F4+F5');

    const visible = await book.viewportBox();
    const long = await book.editorBox();

    expect(long.width).toBeGreaterThan(cell.width);
    expect(long.x).toBeCloseTo(short.x, 0);
    expect(long.x + long.width).toBeLessThanOrEqual(visible.x + visible.width);

    await page.keyboard.press('Escape');

    await expect(book.changes).toHaveText('Правок: 0');
  });

  test('draws the cell editor as the selected cell and grows it by whole columns', async ({
    playground,
    book,
    page,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await book.sheet.scrollIntoViewIfNeeded();

    const fill = await book.fillAt('2', 0);

    await book.cell('2', 0).dblclick();

    const head = await boxOf(book.cell('2', 0));
    const framed = await book.editorFrame();

    expect(framed.x).toBeCloseTo(head.x, 0);
    expect(framed.y).toBeCloseTo(head.y, 0);
    expect(framed.width).toBeCloseTo(head.width - 1, 0);
    expect(framed.height).toBeCloseTo(head.height - 1, 0);
    expect(rgbDelta(await book.fillAt('2', 0), fill)).toBeLessThan(4);

    await page.keyboard.press('Escape');
    await book.cell('3', 1).click();
    await book.formula.click();

    const cell = await boxOf(book.cell('3', 1));
    const idle = await book.editorFrame();

    expect(idle.x).toBeCloseTo(cell.x, 0);
    expect(idle.width).toBeCloseTo(cell.width - 1, 0);

    await page.keyboard.type('23456');

    const before = await boxOf(book.cell('3', 0));
    const grown = await book.editorFrame();

    expect(grown.x).toBeCloseTo(before.x, 0);
    expect(grown.x + grown.width).toBeCloseTo(idle.x + idle.width, 0);

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

  test('inserts a pivot table from the sales sheet and builds it from checked fields', async ({
    playground,
    book,
    page,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await book.sheet.scrollIntoViewIfNeeded();
    await book.chooseSheet('Продажи');
    await book.cellMenu('2', 0, 'Вставить сводную таблицу');

    await expect(book.sheetTab('Сводная 1')).toHaveAttribute('aria-selected', 'true');
    await expect(book.pivot.dialog).toBeVisible();
    await expect(book.pivot.field('Регион')).toBeFocused();

    await book.pivot.check('Регион');
    await book.pivot.check('Сумма');

    await expect(book.pivot.chips('Строки')).toHaveText(['Регион']);
    await expect(book.pivot.chips('Значения')).toHaveText(['Сумма по полю Сумма']);
    await expect(book.cell('3', 0)).toHaveText('Названия строк');
    await expect(book.cell('4', 0)).toHaveText('Северо-Запад');
    await expect(book.cell('4', 1)).toHaveText(/^4\s?855$/u);
    await expect(book.cell('6', 0)).toHaveText('Центр');
    await expect(book.cell('6', 1)).toHaveText(/^4\s?495$/u);
    await expect(book.cell('7', 0)).toHaveText('Общий итог');
    await expect(book.cell('7', 1)).toHaveText(/^13\s?980$/u);

    await page.keyboard.press('Escape');
    await expect(book.pivot.dialog).toBeHidden();
    await expect(book.cell('3', 0)).toBeFocused();
  });

  test('drags pivot fields between areas and moves them from the chip menu', async ({
    playground,
    book,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await book.sheet.scrollIntoViewIfNeeded();
    await book.chooseSheet('Продажи');
    await book.cellMenu('2', 0, 'Вставить сводную таблицу');
    await book.pivot.check('Регион');
    await book.pivot.check('Сумма');
    await book.pivot.dragField('Квартал', 'Столбцы');

    await expect(book.pivot.chips('Столбцы')).toHaveText(['Квартал']);
    await expect(book.cell('4', 1)).toHaveText('I кв.');

    await book.pivot.dragChip('Столбцы', 'Квартал', 'Фильтры');

    await expect(book.pivot.chips('Фильтры')).toHaveText(['Квартал']);
    await expect(book.pivot.chips('Столбцы')).toHaveCount(0);

    await book.pivot.chooseAction('Строки', 'Регион', 'Переместить в столбцы');

    await expect(book.pivot.chips('Столбцы')).toHaveText(['Регион']);
    await expect(book.pivot.focusedChip).toHaveText('Регион');
  });

  test('refreshes a pivot table from its menu after the source changes', async ({
    playground,
    book,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await book.sheet.scrollIntoViewIfNeeded();
    await book.chooseSheet('Продажи');
    await book.cellMenu('2', 0, 'Вставить сводную таблицу');
    await book.pivot.check('Регион');
    await book.pivot.check('Сумма');
    await book.page.keyboard.press('Escape');
    await book.chooseSheet('Продажи');
    await book.enterAt('E2', '1320');
    await book.goTo('A1');
    await book.chooseSheet('Сводная 1');

    await expect(book.cell('6', 1)).toHaveText(/^4\s?495$/u);

    await book.cellMenu('4', 1, 'Обновить');

    await expect(book.cell('6', 1)).toHaveText(/^5\s?495$/u);

    await book.cellMenu('4', 1, 'Поля сводной таблицы…');

    await expect(book.pivot.chips('Строки')).toHaveText(['Регион']);
  });

  test('removes a pivot table from its menu and brings it back on undo', async ({
    playground,
    book,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await book.sheet.scrollIntoViewIfNeeded();
    await book.chooseSheet('Продажи');
    await book.cellMenu('2', 0, 'Вставить сводную таблицу');
    await book.pivot.check('Регион');
    await book.pivot.check('Сумма');
    await book.page.keyboard.press('Escape');

    await expect(book.cell('6', 1)).toHaveText(/^4\s?495$/u);

    await book.cellMenu('4', 1, 'Удалить сводную таблицу');

    await expect(book.cell('6', 1)).toHaveText('');
    await expect(book.cell('3', 0)).toHaveText('');

    await book.page.keyboard.press('Control+z');

    await expect(book.cell('6', 1)).toHaveText(/^4\s?495$/u);
  });

  test('lists the first items of a long pivot field and finds the rest by search', async ({
    playground,
    book,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await book.sheet.scrollIntoViewIfNeeded();
    await book.chooseSheet('Заметки');
    await book.cell('3', 0).click();
    await book.paste(citiesBlock(LONG_FIELD));

    await expect(book.cell('4', 0)).toHaveText('Город 1');

    await book.cellMenu('4', 0, 'Вставить сводную таблицу');
    await book.pivot.check('Город');
    await book.pivot.check('Сумма');
    await book.pivot.chooseAction('Строки', 'Город', 'Фильтр и сортировка…');

    await expect(book.pivot.items).toHaveCount(LISTED_ITEMS);

    await expect(book.pivot.itemsNote).toHaveText(
      'Показаны первые 100 элементов из 300. Остальные найдёт поиск.',
    );

    await book.pivot.item('(Выделить все)').uncheck();
    await book.pivot.search.fill('Город 299');

    await expect(book.pivot.items).toHaveText(['Город 299']);
    await expect(book.pivot.itemsNote).toBeHidden();

    await book.pivot.item('Город 299').check();
    await book.pivot.apply();

    await expect(book.cell('4', 0)).toHaveText('Город 299');
    await expect(book.cell('5', 0)).toHaveText('Общий итог');
  });

  test('filters and sorts a pivot row field and changes how its value is summarised', async ({
    playground,
    book,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await book.sheet.scrollIntoViewIfNeeded();
    await book.chooseSheet('Продажи');
    await book.cellMenu('2', 0, 'Вставить сводную таблицу');
    await book.pivot.check('Регион');
    await book.pivot.check('Сумма');
    await book.pivot.chooseAction('Строки', 'Регион', 'Фильтр и сортировка…');

    await expect(book.pivot.search).toBeFocused();
    await expect(book.pivot.items).toHaveText(['Северо-Запад', 'Урал', 'Центр']);

    await book.pivot.sortBy('По убыванию (от Я до А)');
    await book.pivot.item('Урал').uncheck();

    await expect(book.pivot.item('(Выделить все)')).toHaveJSProperty('indeterminate', true);

    await book.pivot.apply();

    await expect(book.pivot.focusedChip).toHaveText('Регион');
    await expect(book.cell('4', 0)).toHaveText('Центр');
    await expect(book.cell('5', 0)).toHaveText('Северо-Запад');
    await expect(book.cell('6', 1)).toHaveText(/^9\s?350$/u);

    await book.pivot.chooseAction('Значения', 'Сумма по полю Сумма', 'Параметры полей значений…');

    await expect(book.pivot.input('Имя')).toBeFocused();

    await book.pivot.choose('Операция', 'Максимум');

    await expect(book.pivot.input('Имя')).toHaveValue('Максимум по полю Сумма');

    await book.pivot.choose('Числовой формат', /^#,##0\.00/u);
    await book.pivot.apply();

    await expect(book.pivot.chips('Значения')).toHaveText(['Максимум по полю Сумма']);
    await expect(book.cell('3', 1)).toHaveText('Максимум по полю Сумма');
    await expect(book.cell('4', 1)).toHaveText(/^\d[\d\s]*,\d{2}$/u);
  });

  test('changes the pivot layout, its grand totals and column autofit from the options menu', async ({
    playground,
    book,
  }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await book.sheet.scrollIntoViewIfNeeded();
    await book.chooseSheet('Продажи');
    await book.cellMenu('2', 0, 'Вставить сводную таблицу');
    await book.pivot.check('Регион');
    await book.pivot.check('Сумма');

    expect((await boxOf(book.columnHeader('B'))).width).toBeGreaterThan(120);

    await book.pivot.chooseOption('Табличная форма');

    await expect(book.cell('3', 0)).toHaveText('Регион');
    await expect(book.pivot.options).toBeFocused();

    await book.pivot.dragField('Квартал', 'Столбцы');

    await expect(book.cell('8', 0)).toHaveText('Общий итог');

    await book.scrollAcross(150);

    await expect(book.cell('4', 5)).toHaveText('Общий итог');

    await book.pivot.chooseOption('Общие итоги для строк');

    await expect(book.cell('4', 5)).toHaveText('');

    await book.scrollAcross(0);

    await expect(book.cell('8', 0)).toHaveText('Общий итог');

    await book.pivot.chooseOption('Общие итоги для столбцов');

    await expect(book.cell('8', 0)).toHaveText('');

    await book.pivot.openOptions();

    await expect(book.pivot.option('Табличная форма')).toHaveAttribute('aria-checked', 'true');

    await expect(book.pivot.option('Общие итоги для строк')).toHaveAttribute(
      'aria-checked',
      'false',
    );

    await expect(book.pivot.option('Автоподбор ширины столбцов')).toHaveAttribute(
      'aria-checked',
      'true',
    );

    expect(await playground.wcagViolations('.nui-menu')).toEqual([]);
  });

  test('keeps the pivot fields panel accessible in both themes', async ({ playground, book }) => {
    await playground.emulate({ reducedMotion: 'reduce' });
    await playground.open();
    await playground.setTheme('light');
    await book.sheet.scrollIntoViewIfNeeded();
    await book.chooseSheet('Продажи');
    await book.cellMenu('2', 0, 'Вставить сводную таблицу');
    await book.pivot.check('Регион');
    await book.pivot.check('Сумма');

    expect(await playground.wcagViolations('.nui-spreadsheet-pivot')).toEqual([]);

    await playground.setTheme('dark');
    await book.cellMenu('3', 0, 'Поля сводной таблицы…');

    await expect(book.pivot.dialog).toBeVisible();
    expect(await playground.wcagViolations('.nui-spreadsheet-pivot')).toEqual([]);

    await book.pivot.chooseAction('Строки', 'Регион', 'Фильтр и сортировка…');

    expect(await playground.wcagViolations('.nui-spreadsheet-pivot')).toEqual([]);

    await book.page.keyboard.press('Escape');
    await book.pivot.chooseAction('Значения', 'Сумма по полю Сумма', 'Параметры полей значений…');

    expect(await playground.wcagViolations('.nui-spreadsheet-pivot')).toEqual([]);
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

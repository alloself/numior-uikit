import { afterEach, describe, expect, it } from 'vite-plus/test';
import {
  RU_LOCALE,
  createCalculator,
  createWorkbook,
  numberValue,
  textValue,
  type SheetView,
  type Workbook,
} from '../src/core';
import { SpreadsheetDriver } from './drivers/spreadsheet';

const mounted: SpreadsheetDriver[] = [];

const salesBook = (view: Partial<SheetView> = { frozenRows: 1 }): Workbook => {
  const book = createWorkbook();
  const sales = book.addSheet('Sales');
  const rates = book.addSheet('Rates');

  sales.cells.set(0, 0, textValue('Item'));
  sales.cells.set(0, 1, textValue('Amount'));
  sales.cells.set(1, 0, textValue('Pen'));
  sales.cells.set(1, 2, numberValue(0.75));
  sales.formats.set(1, 2, book.formats.id('0.0%'));
  rates.cells.set(0, 0, textValue('Rate'));
  sales.layout = { ...sales.layout, view: { ...sales.layout.view, ...view } };
  return book;
};

const sheetOf = (...args: Parameters<typeof SpreadsheetDriver.mount>): SpreadsheetDriver => {
  const driver = SpreadsheetDriver.mount(...args);

  mounted.push(driver);
  return driver;
};

afterEach(() => {
  for (const driver of mounted.splice(0)) {
    driver.unmount();
  }
});

describe('NuiSpreadsheet', () => {
  it('lays the sheet out with A1 headers, gridlines and the frozen header row', () => {
    const sheet = sheetOf({ book: salesBook(), label: 'Sales book' });

    expect(sheet.label).toBe('Sales book');
    expect(sheet.columnLabels).toEqual(['A', 'B', 'C', 'D', 'E']);
    expect(sheet.rowLabels).toEqual(['1', '2', '3', '4', '5']);
    expect(sheet.text(1, 0)).toBe('Item');
    expect(sheet.text(2, 2)).toBe('75.0%');
    expect(sheet.frozenRows).toBe(1);
    expect(sheet.bordered).toBe(true);
    expect(sheet.direction).toBe('ltr');
  });

  it('switches sheets, follows a right-to-left sheet without gridlines and freezes columns', async () => {
    const book = salesBook({ gridlines: false, rightToLeft: true, frozenCols: 1 });

    const sheet = sheetOf({ book, label: 'Sales book' });

    expect(sheet.direction).toBe('rtl');
    expect(sheet.bordered).toBe(false);
    expect(sheet.pinnedColumns).toBe(1);
    expect(sheet.frozenRows).toBe(0);

    await sheet.show({ sheet: 1 });

    expect(sheet.text(1, 0)).toBe('Rate');
    expect(sheet.direction).toBe('ltr');
  });

  it('renders nothing for a book without sheets', () => {
    expect(sheetOf({ book: createWorkbook(), label: 'Empty' }).rendered).toBe(false);
  });

  it('enters values and formulas that take the referenced format, recalculates and shows the formula on F2', async () => {
    const sheet = sheetOf({ book: salesBook(), label: 'Sales book' });

    await sheet.enter(3, 2, '4');
    await sheet.enter(3, 1, '=C2*2+C3');

    expect(sheet.text(3, 1)).toBe('550.0%');
    expect(sheet.changes).toHaveLength(2);
    expect(sheet.changes[1]?.steps[0]).toMatchObject({ kind: 'batch' });

    await sheet.focus(3, 1);
    await sheet.press('F2');

    expect(sheet.editorText).toBe('=C2*2+C3');

    await sheet.press('Escape');
    await sheet.press('9');

    expect(sheet.editorText).toBe('9');

    await sheet.press('Escape');
    await sheet.enter(3, 2, '10');

    expect(sheet.text(3, 1)).toBe('1150.0%');
  });

  it('keeps a broken formula in the editor with the position of the error', async () => {
    const sheet = sheetOf({ book: salesBook(), label: 'Sales book' });

    await sheet.enter(4, 1, '=SUM(1,');

    expect(sheet.editing).toBe(true);
    expect(sheet.editorError).toBe('The formula has an error at character 8');
    expect(sheet.changes).toEqual([]);
  });

  it('undoes and redoes edits through the workbook history', async () => {
    const sheet = sheetOf({ book: salesBook(), label: 'Sales book' });

    await sheet.enter(2, 0, 'Pencil');

    expect(sheet.text(2, 0)).toBe('Pencil');

    await sheet.press('z', { ctrl: true });

    expect(sheet.text(2, 0)).toBe('Pen');

    await sheet.press('y', { ctrl: true });

    expect(sheet.text(2, 0)).toBe('Pencil');
    expect(sheet.changes).toHaveLength(3);
  });

  it('reads and prints formulas in the sheet locale through a given calculator', async () => {
    const book = salesBook();
    const calculator = createCalculator(book);

    const sheet = sheetOf({ book, calculator, locale: RU_LOCALE, label: 'Продажи' });

    await sheet.enter(3, 1, '=СУММ(C2;0,25)');

    expect(sheet.text(3, 1)).toBe('100,0%');
    expect(calculator.pending).toBe(0);

    await sheet.focus(3, 1);
    await sheet.press('F2');

    expect(sheet.editorText).toBe('=СУММ(C2;0,25)');
  });

  it('leaves a read-only sheet untouched', async () => {
    const sheet = sheetOf({ book: salesBook(), label: 'Sales book', readonly: true });

    await sheet.enter(2, 0, 'Pencil');

    expect(sheet.editing).toBe(false);
    expect(sheet.text(2, 0)).toBe('Pen');
    expect(sheet.changes).toEqual([]);
  });

  it('shows the address and the formula of the active cell in the formula bar', async () => {
    const sheet = sheetOf({ book: salesBook(), label: 'Sales book' });

    await sheet.enter(3, 1, '=C2*2');
    await sheet.focus(3, 1);

    expect(sheet.nameBox).toBe('B3');
    expect(sheet.formula).toBe('=C2*2');

    await sheet.focus(2, 2);

    expect(sheet.nameBox).toBe('C2');
    expect(sheet.formula).toBe('75%');
  });

  it('edits the active cell from the formula bar and shares the draft with the cell editor', async () => {
    const sheet = sheetOf({ book: salesBook(), label: 'Sales book' });

    await sheet.focus(3, 1);
    await sheet.focusFormula();

    expect(sheet.editing).toBe(true);
    expect(sheet.formulaFocused).toBe(true);

    await sheet.typeFormula('=C2*4');

    expect(sheet.editorText).toBe('=C2*4');

    await sheet.pressInFormula('Enter');

    expect(sheet.text(3, 1)).toBe('300.0%');
    expect(sheet.changes).toHaveLength(1);
    expect(sheet.focusedCell).toEqual({ row: 4, col: 1 });

    await sheet.focus(3, 1);
    await sheet.press('F2');
    await sheet.type('=C2*5');

    expect(sheet.formula).toBe('=C2*5');

    await sheet.press('Escape');

    expect(sheet.formula).toBe('=C2*4');
    expect(sheet.text(3, 1)).toBe('300.0%');
  });

  it('cancels a formula bar edit with Escape and breaks lines with Alt+Enter', async () => {
    const sheet = sheetOf({ book: salesBook(), label: 'Sales book' });

    await sheet.focus(2, 0);
    await sheet.focusFormula();
    await sheet.typeFormula('Pencil');
    await sheet.pressInFormula('Enter', { alt: true });

    expect(sheet.formula).toBe('Pencil\n');

    await sheet.pressInFormula('Escape');

    expect(sheet.editing).toBe(false);
    expect(sheet.formula).toBe('Pen');
    expect(sheet.focusedCell).toEqual({ row: 2, col: 0 });
    expect(sheet.changes).toEqual([]);
  });

  it('goes to an address, a range or a defined name typed into the name box', async () => {
    const book = salesBook();
    const sales = book.sheets[0];

    if (sales !== undefined) {
      book.names.set('Total', sales, {
        kind: 'cell',
        ref: { row: 6, col: 3, rowAbsolute: true, colAbsolute: true },
      });
    }

    const sheet = sheetOf({ book, label: 'Sales book' });

    await sheet.goTo('d5');

    expect(sheet.focusedCell).toEqual({ row: 5, col: 3 });
    expect(sheet.nameBox).toBe('D5');

    await sheet.goTo('A2:B4');

    expect(sheet.focusedCell).toEqual({ row: 2, col: 0 });
    expect(sheet.rangedCells).toBe(6);

    await sheet.goTo('total');

    expect(sheet.focusedCell).toEqual({ row: 7, col: 3 });
    expect(sheet.rangedCells).toBe(0);

    await sheet.goTo('B:C');

    expect(sheet.focusedCell).toEqual({ row: 1, col: 1 });

    await sheet.goTo('Nowhere');

    expect(sheet.nameInvalid).toBe(true);
    expect(sheet.announcement).toBe('There is no cell or name “Nowhere”');
    expect(sheet.focusedCell).toBeUndefined();

    await sheet.goTo('zz');

    expect(sheet.announcement).toBe('There is no cell or name “zz”');
  });

  it('expands the formula bar, keeps it read-only on a read-only sheet and hides it on request', async () => {
    const sheet = sheetOf({ book: salesBook(), label: 'Sales book', readonly: true });

    await sheet.focus(2, 0);
    await sheet.focusFormula();

    expect(sheet.formulaReadonly).toBe(true);
    expect(sheet.editing).toBe(false);
    expect(sheet.barExpanded).toBe(false);

    await sheet.toggleBar();

    expect(sheet.barExpanded).toBe(true);

    await sheet.show({ formulaBar: false });

    expect(sheet.hasFormulaBar).toBe(false);
  });

  it('picks references with the arrows, colours them like their frames and cycles their anchors with F4', async () => {
    const sheet = sheetOf({ book: salesBook(), label: 'Sales book' });

    await sheet.focus(3, 1);
    await sheet.press('=');
    await sheet.press('ArrowUp');

    expect(sheet.editorText).toBe('=B2');

    await sheet.press('ArrowRight');
    await sheet.press('ArrowDown', { shift: true });

    expect(sheet.editorText).toBe('=C2:C3');
    expect(sheet.referenceFrames).toEqual(['1']);

    await sheet.press('F4');

    expect(sheet.editorText).toBe('=$C$2:$C$3');
    expect(sheet.caret).toBe(10);

    await sheet.type('=$C$2:$C$3+A1*C2+c2:c3');

    expect(sheet.formula).toBe('=$C$2:$C$3+A1*C2+c2:c3');
    expect(sheet.paintedReferences).toEqual(['$C$2:$C$3 1', 'A1 2', 'C2 3', 'c2:c3 1']);
    expect(sheet.referenceFrames).toEqual(['1', '2', '3', '1']);

    await sheet.press('Escape');

    expect(sheet.referenceFrames).toEqual([]);
    expect(sheet.changes).toEqual([]);
  });

  it('inserts a picked reference at the caret of the formula bar and keeps plain text unpainted', async () => {
    const sheet = sheetOf({ book: salesBook(), label: 'Sales book' });

    await sheet.focus(4, 1);
    await sheet.focusFormula();
    await sheet.typeFormula('Pen');

    expect(sheet.paintedReferences).toEqual([]);

    await sheet.typeFormula('=SUM(C2)');
    await sheet.press('F4');

    expect(sheet.formula).toBe('=SUM($C$2)');
  });

  it('moves a reference by its frame edge and resizes it by a corner', async () => {
    const sheet = sheetOf({ book: salesBook(), label: 'Sales book' });

    await sheet.focus(5, 1);
    await sheet.press('F2');
    await sheet.type('=SUM($B$2:B3)');
    await sheet.dragGrip('top', { row: 2, col: 1 }, { row: 3, col: 2 });

    expect(sheet.editorText).toBe('=SUM($C$3:C4)');

    await sheet.dragGrip('bottom-end', { row: 4, col: 2 }, { row: 4, col: 3 });

    expect(sheet.editorText).toBe('=SUM($C$3:D4)');

    await sheet.dragGrip('top-start', { row: 3, col: 2 }, { row: 4, col: 3 });

    expect(sheet.editorText).toBe('=SUM($D$4)');
    expect(sheet.changes).toEqual([]);
  });
});

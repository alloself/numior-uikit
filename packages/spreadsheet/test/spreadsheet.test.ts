import { afterEach, describe, expect, it } from 'vite-plus/test';
import { flushPromises } from '@vue/test-utils';
import {
  RU_LOCALE,
  createCalculator,
  createWorkbook,
  numberValue,
  textValue,
  type SheetView,
  type Workbook,
} from '../src/core';
import { installClipboard, type ClipboardStub } from '../../primitives/test/support/clipboard';
import { SpreadsheetDriver } from './drivers/spreadsheet';

const WHOLE_COLUMN = 1_048_575;

const TALL_ROWS = 2500;

const TALL_COLS = 10;

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

const tallBook = (): Workbook => {
  const book = createWorkbook();
  const sheet = book.addSheet('Tall');

  for (let row = 0; row < TALL_ROWS; row += 1) {
    for (let col = 0; col < TALL_COLS; col += 1) {
      sheet.cells.set(row, col, numberValue(row + 1));
    }
  }
  return book;
};

let clipboard: ClipboardStub | undefined;

afterEach(() => {
  for (const driver of mounted.splice(0)) {
    driver.unmount();
  }

  clipboard?.restore();
  clipboard = undefined;
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

  it('switches sheets from the tabs and keeps the selected tab in the model', async () => {
    const sheet = sheetOf({ book: salesBook(), label: 'Sales book' });

    expect(sheet.tabs).toEqual(['Sales', 'Rates']);

    await sheet.chooseTab('Rates');

    expect(sheet.selectedTab).toBe('Rates');
    expect(sheet.text(1, 0)).toBe('Rate');
  });

  it('adds, renames and undoes sheet changes through the sheet history', async () => {
    const book = salesBook();
    const sheet = sheetOf({ book, label: 'Sales book' });

    await sheet.addSheet();

    expect(sheet.tabs).toEqual(['Sales', 'Rates', 'Sheet3']);
    expect(sheet.selectedTab).toBe('Sheet3');

    await sheet.renameTab('Rates', 'Sales');

    expect(sheet.renameError).toBe('This name is already taken');

    await sheet.renameTab('Rates', 'Sales ');

    expect(sheet.renameError).toBe('This name is already taken');

    await sheet.renameTab('Rates', 'Курсы');

    expect(sheet.tabs).toEqual(['Sales', 'Курсы', 'Sheet3']);

    expect(sheet.selectedTab).toBe('Курсы');

    await sheet.press('z', { ctrl: true });

    expect(book.sheets.map((each) => each.name)).toEqual(['Sales', 'Rates', 'Sheet3']);
    expect(sheet.tabs).toEqual(['Sales', 'Rates', 'Sheet3']);
    expect(sheet.changes).toHaveLength(3);
  });

  it('reports the selection in sheet addresses and follows a selection set from outside', async () => {
    const sheet = sheetOf({ book: salesBook(), label: 'Sales book' });

    await sheet.focus(2, 1);

    expect(sheet.selection).toEqual({
      active: { row: 1, col: 1 },
      ranges: [{ top: 1, left: 1, bottom: 1, right: 1 }],
    });

    await sheet.select({
      active: { row: 2, col: 2 },
      ranges: [{ top: 2, left: 2, bottom: 3, right: 3 }],
    });

    expect(sheet.nameBox).toBe('C3');
  });

  it('inserts and deletes the selected rows and columns from the cell menu', async () => {
    const book = salesBook();

    const sheet = sheetOf({
      book,
      label: 'Sales book',
      contextMenu: ({ selection }) => [
        { key: 'own', label: `Own ${String(selection.active.row)}`, onSelect: () => undefined },
      ],
    });

    await sheet.focus(2, 0);
    await sheet.openCellMenu(2, 0);

    expect(sheet.cellMenuItems).toEqual(
      expect.arrayContaining([
        'Insert 1 row above',
        'Insert 1 row below',
        'Delete 1 row',
        'Insert 1 column left',
        'Delete 1 column',
        'Own 1',
      ]),
    );

    await sheet.chooseCellMenuItem('Insert 1 row above');

    expect(sheet.text(3, 0)).toBe('Pen');

    await sheet.press('z', { ctrl: true });

    expect(sheet.text(2, 0)).toBe('Pen');
  });

  it('pastes a copied formula shifted, moves a cut cell and marks the copied range', async () => {
    clipboard = installClipboard({ api: 'granted' });

    const sheet = sheetOf({ book: salesBook(), label: 'Sales book' });

    await sheet.enter(2, 3, '=C2*2');
    await sheet.focus(2, 3);
    await sheet.press('c', { ctrl: true });
    await flushPromises();

    expect(sheet.clipFrames).toBe(1);

    await sheet.focus(3, 3);
    await sheet.paste(clipboard.copies.at(-1) ?? '');

    expect(sheet.formula).toBe('=C3*2');
    expect(sheet.clipFrames).toBe(1);

    await sheet.press('Escape');

    expect(sheet.clipFrames).toBe(0);

    await sheet.focus(2, 0);
    await sheet.press('x', { ctrl: true });
    await flushPromises();
    await sheet.focus(4, 0);
    await sheet.paste(clipboard.copies.at(-1) ?? '');

    expect(sheet.text(4, 0)).toBe('Pen');
    expect(sheet.text(2, 0)).toBe('');
    expect(sheet.clipFrames).toBe(0);
  });

  it('clears the selected range and keeps its formats', async () => {
    const sheet = sheetOf({ book: salesBook(), label: 'Sales book' });

    await sheet.focus(2, 0);
    await sheet.press('ArrowRight', { shift: true });
    await sheet.press('ArrowRight', { shift: true });
    await sheet.press('Delete');

    expect(sheet.text(2, 0)).toBe('');
    expect(sheet.text(2, 2)).toBe('');

    await sheet.enter(2, 2, '1');

    expect(sheet.text(2, 2)).toBe('100.0%');
  });

  it('copies ranges that share rows side by side and a whole column down to its last filled cell', async () => {
    clipboard = installClipboard({ api: 'granted' });

    const sheet = sheetOf({ book: salesBook(), label: 'Sales book' });

    await sheet.select({
      active: { row: 0, col: 0 },
      ranges: [
        { top: 0, left: 0, bottom: 1, right: 0 },
        { top: 0, left: 2, bottom: 1, right: 2 },
      ],
    });

    await sheet.press('c', { ctrl: true });
    await flushPromises();

    expect(clipboard.copies.at(-1)).toBe('Item\t\nPen\t75.0%');

    await sheet.select({
      active: { row: 0, col: 0 },
      ranges: [{ top: 0, left: 0, bottom: WHOLE_COLUMN, right: 0 }],
    });

    await sheet.press('c', { ctrl: true });
    await flushPromises();

    expect(clipboard.copies.at(-1)).toBe('Item\nPen');
    expect(sheet.gridAnnouncement).toBe('Copied 2 rows');
  });

  it('copies a block too big for one slice in full', async () => {
    const stub = installClipboard({ api: 'granted' });

    clipboard = stub;

    const sheet = sheetOf({ book: tallBook(), label: 'Tall book' });

    await sheet.select({
      active: { row: 0, col: 0 },
      ranges: [{ top: 0, left: 0, bottom: TALL_ROWS - 1, right: TALL_COLS - 1 }],
    });

    await sheet.press('c', { ctrl: true });

    await expect.poll(() => stub.copies.length).toBe(1);

    const lines = stub.copies[0]?.split('\n') ?? [];

    expect(lines).toHaveLength(TALL_ROWS);

    expect(lines.at(-1)).toBe(
      Array.from({ length: TALL_COLS }, () => String(TALL_ROWS)).join('\t'),
    );
  });

  it('pastes copied formulas from a clipboard that turned line feeds into CRLF', async () => {
    clipboard = installClipboard({ api: 'granted' });

    const sheet = sheetOf({ book: salesBook(), label: 'Sales book' });

    await sheet.enter(2, 3, '=C2*2');
    await sheet.enter(3, 3, '=C3*2');

    await sheet.focus(2, 3);
    await sheet.press('ArrowDown', { shift: true });
    await sheet.press('c', { ctrl: true });
    await flushPromises();
    await sheet.press('ArrowDown');
    await sheet.press('ArrowDown');
    await sheet.paste((clipboard.copies.at(-1) ?? '').replaceAll('\n', '\r\n'));
    await sheet.press('ArrowDown');

    expect(sheet.formula).toBe('=C5*2');
  });

  it('keeps Ctrl+R and Ctrl+D from the browser while a cell is edited or several ranges are selected', async () => {
    const sheet = sheetOf({ book: salesBook(), label: 'Sales book' });

    await sheet.focus(2, 1);
    await sheet.press('F2');
    await sheet.type('unsaved');

    expect(await sheet.leavesToBrowser('r', { ctrl: true })).toBe(false);
    expect(await sheet.leavesToBrowser('d', { ctrl: true })).toBe(false);
    expect(sheet.editing).toBe(true);

    await sheet.press('Escape');

    await sheet.select({
      active: { row: 2, col: 0 },
      ranges: [
        { top: 2, left: 0, bottom: 2, right: 0 },
        { top: 4, left: 1, bottom: 4, right: 1 },
      ],
    });

    expect(await sheet.leavesToBrowser('r', { ctrl: true })).toBe(false);
    expect(sheet.changes).toEqual([]);
  });

  it('leaves Ctrl+R to the browser in a read-only book', async () => {
    const sheet = sheetOf({ book: salesBook(), label: 'Sales book', readonly: true });

    await sheet.focus(2, 1);

    expect(await sheet.leavesToBrowser('r', { ctrl: true })).toBe(true);
  });

  it('fills down and right with Ctrl+D and Ctrl+R and continues a series to the neighbour data', async () => {
    const sheet = sheetOf({ book: salesBook(), label: 'Sales book' });

    await sheet.enter(2, 1, '5');
    await sheet.focus(2, 1);

    expect(sheet.fillHandleShown).toBe(true);

    await sheet.press('ArrowDown', { shift: true });
    await sheet.press('ArrowDown', { shift: true });
    await sheet.press('d', { ctrl: true });

    expect([sheet.text(3, 1), sheet.text(4, 1)]).toEqual(['5', '5']);

    await sheet.enter(6, 0, 'x');

    await sheet.select({
      active: { row: 5, col: 0 },
      ranges: [{ top: 5, left: 0, bottom: 5, right: 1 }],
    });

    await sheet.press('r', { ctrl: true });

    expect(sheet.text(6, 1)).toBe('x');

    await sheet.enter(3, 2, '7');
    await sheet.enter(4, 2, '8');
    await sheet.enter(5, 2, '9');
    await sheet.enter(3, 3, '1');
    await sheet.enter(4, 3, '2');

    await sheet.select({
      active: { row: 2, col: 3 },
      ranges: [{ top: 2, left: 3, bottom: 3, right: 3 }],
    });

    await sheet.fillToNeighbour();

    expect(sheet.text(5, 3)).toBe('3');
  });

  it('hides the fill handle while a cell is edited and in a read-only sheet', async () => {
    const sheet = sheetOf({ book: salesBook(), label: 'Sales book', readonly: true });

    await sheet.focus(2, 0);

    expect(sheet.fillHandleShown).toBe(false);
  });

  it('hides the tabs on request', () => {
    expect(sheetOf({ book: salesBook(), label: 'Sales book', sheetTabs: false }).tabs).toEqual([]);
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
    expect(sheet.warnings).toEqual([]);

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

  it('keeps formulas and the undo history when the locale changes', async () => {
    const sheet = sheetOf({ book: salesBook(), label: 'Sales book' });

    await sheet.enter(3, 1, '=SUM(C2,0.25)');
    await sheet.show({ locale: RU_LOCALE });

    expect(sheet.text(3, 1)).toBe('100,0%');

    await sheet.focus(3, 1);
    await sheet.press('F2');

    expect(sheet.editorText).toBe('=СУММ(C2;0,25)');

    await sheet.press('Escape');
    await sheet.press('z', { ctrl: true });

    expect(sheet.text(3, 1)).toBe('');
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

  it('leaves Enter, Escape and the arrows to the IME while a composition runs', async () => {
    const sheet = sheetOf({ book: salesBook(), label: 'Sales book' });

    await sheet.focus(3, 1);
    await sheet.focusFormula();
    await sheet.typeFormula('にほん');
    await sheet.pressInFormula('Enter', { composing: true });
    await sheet.pressInFormula('Escape', { composing: true });

    expect(sheet.editing).toBe(true);
    expect(sheet.editorText).toBe('にほん');
    expect(sheet.changes).toHaveLength(0);

    await sheet.pressInFormula('Escape');
    await sheet.focus(3, 1);
    await sheet.press('F2');
    await sheet.type('=SU');
    await sheet.press('Enter', { composing: true });
    await sheet.press('Tab', { composing: true });

    expect(sheet.editing).toBe(true);
    expect(sheet.editorText).toBe('=SU');

    sheet.unmount();
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
    expect(sheet.referenceFrames).toEqual(['body 1']);

    await sheet.press('F4');

    expect(sheet.editorText).toBe('=$C$2:$C$3');
    expect(sheet.caret).toBe(10);

    await sheet.type('=$C$2:$C$3+A1*C2+c2:c3');

    expect(sheet.formula).toBe('=$C$2:$C$3+A1*C2+c2:c3');
    expect(sheet.paintedReferences).toEqual(['$C$2:$C$3 1', 'A1 2', 'C2 3', 'c2:c3 1']);
    expect(sheet.cellReferences).toEqual(['$C$2:$C$3 1', 'A1 2', 'C2 3', 'c2:c3 1']);
    expect(sheet.referenceFrames).toEqual(['body 1', 'body 3', 'body 1', 'top 2']);

    await sheet.press('Escape');

    expect(sheet.referenceFrames).toEqual([]);
    expect(sheet.changes).toEqual([]);
  });

  it('frames the ranges of a selected formula cell and gives them grips only while it is edited', async () => {
    const sheet = sheetOf({ book: salesBook(), label: 'Sales book' });

    await sheet.enter(3, 1, '=C2*2+A1:A2');
    await sheet.focus(3, 1);

    expect(sheet.referenceFrames).toEqual(['body 1', 'body 2', 'top 2']);
    expect(sheet.paintedReferences).toEqual(['C2 1', 'A1:A2 2']);
    expect(sheet.frameGrips).toBe(0);

    await sheet.press('F2');

    expect(sheet.frameGrips).toBe(24);

    await sheet.press('Escape');

    expect(sheet.referenceFrames).toEqual(['body 1', 'body 2', 'top 2']);
    expect(sheet.frameGrips).toBe(0);

    await sheet.focus(1, 0);

    expect(sheet.referenceFrames).toEqual([]);
    expect(sheet.paintedReferences).toEqual([]);
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

  it('lists functions for a typed name, inserts the chosen one and hints its current argument', async () => {
    const sheet = sheetOf({ book: salesBook(), label: 'Sales book' });

    await sheet.focus(5, 1);
    await sheet.press('F2');
    await sheet.type('=SU');
    await sheet.settle();

    expect(sheet.functions).toEqual([
      'SUBSTITUTE',
      'SUBTOTAL',
      'SUM',
      'SUMIF',
      'SUMIFS',
      'SUMPRODUCT',
      'SUMSQ',
    ]);

    expect(sheet.functionSummaries[2]).toBe('Adds numbers and ranges.');
    expect(sheet.activeFunction).toBe('SUBSTITUTE');

    await sheet.press('ArrowDown');
    await sheet.press('ArrowDown');

    expect(sheet.activeFunction).toBe('SUM');

    await sheet.press('Tab');

    expect(sheet.editorText).toBe('=SUM(');
    expect(sheet.functions).toEqual([]);
    expect(sheet.hint).toBe('SUM(<number1>, [number2], …)');
    expect(sheet.hintSummary).toBe('Adds numbers and ranges.');
    expect(sheet.hinted).toBe(true);

    await sheet.type('=SUM(A1,ro');

    expect(sheet.functions).toEqual(['ROUND', 'ROUNDDOWN', 'ROUNDUP', 'ROW', 'ROWS']);

    await sheet.press('Escape');

    expect(sheet.functions).toEqual([]);
    expect(sheet.editing).toBe(true);
    expect(sheet.hint).toBe('SUM(number1, <[number2]>, …)');

    await sheet.type('=SUM(A1,rou');

    expect(sheet.functions).toEqual(['ROUND', 'ROUNDDOWN', 'ROUNDUP']);

    await sheet.press('Enter');

    expect(sheet.editorText).toBe('=SUM(A1,ROUND(');
    expect(sheet.hint).toBe('ROUND(<number>, num_digits)');
    expect(sheet.changes).toEqual([]);
  });
});

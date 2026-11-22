import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import {
  createCalculator,
  createWorkbook,
  createWorkbookDocument,
  EN_FORMULAS,
  lineLayoutsOf,
  parseFormula,
  withLineSizes,
  type Calculator,
  type LineLayout,
  type Workbook,
  type WorkbookDocument,
} from '../src/core';
import { layoutStepOf } from '../src/sheet/sheet-layout-step';
import { SpreadsheetDriver } from './drivers/spreadsheet';

interface SharedBook {
  readonly book: Workbook;
  readonly calculator: Calculator;
  readonly session: WorkbookDocument;
}

const SHEET = 'Sheet1';

const KEY = 'main';

const WIDE_COLUMN = 3;

const WIDE_CHARS = 20;

const SNAPSHOT = { steps: [{ kind: 'addSheet', name: SHEET, index: 0, key: KEY }] };

const mounted: SpreadsheetDriver[] = [];

const writeAt = (row: number, col: number, value: unknown, sheet = KEY): unknown => ({
  kind: 'setCells',
  sheet,
  cells: [{ row, col, content: { kind: 'value', value } }],
});

const text = (value: string): unknown => writeAt(0, 0, { kind: 'string', value });

const astOf = (formula: string, row: number, col: number): unknown => {
  const parsed = parseFormula(formula, EN_FORMULAS, { row, col });

  if (!parsed.ok) {
    throw new Error(`${formula} does not parse`);
  }
  return parsed.ast;
};

const shared = (): SharedBook => {
  const book = createWorkbook();
  const calculator = createCalculator(book);
  const session = createWorkbookDocument({ book, calculator });

  session.load(SNAPSHOT, 1);

  return { book, calculator, session };
};

const open = (
  { book, calculator, session }: SharedBook,
  collaboration: WorkbookDocument = session,
): SpreadsheetDriver => {
  const driver = SpreadsheetDriver.mount({
    book,
    calculator,
    collaboration,
    label: 'Shared book',
  });

  mounted.push(driver);

  return driver;
};

const widen = ({ book, session }: SharedBook, col: number, chars: number): void => {
  const sheet = book.sheet(SHEET);

  const step =
    sheet === undefined
      ? undefined
      : layoutStepOf(sheet, {
          ...sheet.layout,
          cols: withLineSizes(sheet.layout.cols, new Map([[col, chars]])),
        });

  if (step === undefined) {
    throw new Error('the width did not change');
  }
  session.stepper.apply(step);
};

const HIDDEN_ROW: LineLayout = {
  size: undefined,
  custom: false,
  hidden: true,
  level: 0,
  collapsed: false,
  style: undefined,
  extra: [],
};

const hide = ({ book, session }: SharedBook, row: number): void => {
  const sheet = book.sheet(SHEET);

  const step =
    sheet === undefined
      ? undefined
      : layoutStepOf(sheet, { ...sheet.layout, rows: lineLayoutsOf([[row, HIDDEN_ROW]]) });

  if (step === undefined) {
    throw new Error('the row was hidden already');
  }
  session.stepper.apply(step);
};

const rowsAdded = (at: number, count: number): unknown => ({
  kind: 'insertLines',
  sheet: KEY,
  axis: 'rows',
  at,
  count,
});

const receive = (session: WorkbookDocument, ...steps: readonly unknown[]): boolean =>
  session.receive({ version: session.version() ?? 0, clientId: 'bob', steps });

afterEach(() => {
  mounted.splice(0).forEach((driver) => {
    driver.unmount();
  });
});

describe('NuiSpreadsheet in a shared book', () => {
  it('shows a step from someone else without reporting a change', async () => {
    const book = shared();
    const driver = open(book);

    receive(book.session, text('remote'));
    await driver.settle();

    expect(driver.text(1, 0)).toBe('remote');
    expect(driver.changes).toEqual([]);
  });

  it('sends a local edit through the document', async () => {
    const book = shared();
    const driver = open(book);

    await driver.enter(1, 0, 'mine');

    expect(book.session.pending()).toHaveLength(1);
    expect(driver.changes).toHaveLength(1);
  });

  it('recalculates a local formula over a value from someone else', async () => {
    const book = shared();
    const driver = open(book);

    await driver.enter(1, 1, '=A1+1');
    receive(book.session, writeAt(0, 0, { kind: 'number', value: 2 }));
    await driver.settle();

    expect(driver.text(1, 1)).toBe('3');
  });

  it('undoes a write where a row from someone else moved it', async () => {
    const book = shared();
    const driver = open(book);

    await driver.enter(2, 0, 'mine');
    book.session.confirm(1, 2);
    receive(book.session, { kind: 'insertLines', sheet: KEY, axis: 'rows', at: 0, count: 1 });
    await driver.settle();

    expect(driver.text(3, 0)).toBe('mine');

    await driver.focus(1, 0);
    await driver.press('z', { ctrl: true });

    expect(driver.text(3, 0)).toBe('');
  });

  it('shows the values of formulas in a book that came from the server before the sheet', async () => {
    const book = createWorkbook();
    const calculator = createCalculator(book);
    const session = createWorkbookDocument({ book, calculator });

    session.load(
      {
        steps: [
          { kind: 'addSheet', name: SHEET, index: 0, key: KEY },
          writeAt(0, 0, { kind: 'number', value: 2 }),
          {
            kind: 'setCells',
            sheet: KEY,
            cells: [{ row: 0, col: 1, content: { kind: 'formula', ast: astOf('=A1*3', 0, 1) } }],
          },
        ],
      },
      3,
    );

    const driver = open({ book, calculator, session });
    await driver.settle();

    expect(driver.text(1, 1)).toBe('6');
    expect(driver.changes).toEqual([]);
  });

  it('shows the book of the server on the sheet it was on after the book is opened again', async () => {
    const book = shared();
    const driver = open(book);

    receive(book.session, { kind: 'addSheet', name: 'Plan', index: 1, key: 'plan' });
    await driver.settle();
    await driver.chooseTab('Plan');
    await driver.enter(1, 0, 'unsent');

    book.session.reset();

    book.session.load(
      {
        steps: [
          { kind: 'addSheet', name: 'Intro', index: 0, key: 'intro' },
          { kind: 'addSheet', name: SHEET, index: 1, key: KEY },
          { kind: 'addSheet', name: 'Plan', index: 2, key: 'plan' },
          writeAt(0, 0, { kind: 'string', value: 'theirs' }, 'plan'),
        ],
      },
      9,
    );

    await driver.settle();
    await driver.focus(1, 0);
    await driver.press('z', { ctrl: true });

    expect(driver.tabs).toEqual(['Intro', SHEET, 'Plan']);
    expect(driver.selectedTab).toBe('Plan');
    expect(driver.text(1, 0)).toBe('theirs');
    expect(book.session.pending()).toEqual([]);
  });

  it('adds a tab for a sheet created by someone else', async () => {
    const book = shared();
    const driver = open(book);

    receive(book.session, { kind: 'addSheet', name: 'Plan', index: 1, key: 'plan' });
    await driver.settle();

    expect(driver.tabs).toEqual([SHEET, 'Plan']);
  });

  it('keeps a draft open while someone else writes', async () => {
    const book = shared();
    const driver = open(book);

    await driver.focus(2, 0);
    await driver.press('F2');
    await driver.type('draft');
    receive(book.session, text('remote'));
    await driver.settle();

    expect(driver.editing).toBe(true);
    expect(driver.editorText).toBe('draft');
    expect(driver.text(1, 0)).toBe('remote');
  });

  it('carries a draft down with its row when someone else adds a row above', async () => {
    const book = shared();
    const driver = open(book);

    await driver.focus(2, 0);
    await driver.press('F2');
    await driver.type('draft');
    driver.placeCaret(2);
    receive(book.session, rowsAdded(0, 1));
    await driver.settle();

    expect(driver.editingCell).toEqual({ row: 3, col: 0 });
    expect(driver.editorText).toBe('draft');
    expect(driver.caret).toBe(2);
    expect(driver.nameBox).toBe('A3');

    await driver.press('Enter');

    expect([driver.text(2, 0), driver.text(3, 0)]).toEqual(['', 'draft']);
    expect(driver.refusals).toEqual([]);
  });

  it('moves the references of a formula being typed with the rows someone else adds above them', async () => {
    const book = shared();
    const driver = open(book);

    receive(book.session, writeAt(2, 0, { kind: 'number', value: 1 }));
    receive(book.session, writeAt(8, 0, { kind: 'number', value: 5 }));
    await driver.focus(1, 1);
    await driver.press('F2');
    await driver.type('=SUM(A3:A9)+A1');
    driver.placeCaret(10);
    receive(book.session, rowsAdded(4, 1));
    await driver.settle();

    expect(driver.editingCell).toEqual({ row: 1, col: 1 });
    expect(driver.editorText).toBe('=SUM(A3:A10)+A1');
    expect(driver.caret).toBe(11);

    await driver.press('Enter');

    expect(driver.text(1, 1)).toBe('6');
  });

  it('moves a draft and its references only once the word being composed in it is done', async () => {
    const book = shared();
    const driver = open(book);

    receive(book.session, writeAt(4, 0, { kind: 'string', value: 'A' }));
    await driver.focus(1, 1);
    await driver.press('F2');
    await driver.type('=A5&"');
    await driver.composeInEditor('=A5&"に');
    receive(book.session, rowsAdded(0, 1));
    await driver.settle();

    expect(driver.editingCell).toEqual({ row: 1, col: 1 });
    expect(driver.editorText).toBe('=A5&"に');

    await driver.finishComposing('=A5&"日本"');
    await driver.settle();

    expect(driver.editingCell).toEqual({ row: 2, col: 1 });
    expect(driver.editorText).toBe('=A6&"日本"');

    await driver.press('Enter');

    expect(driver.text(2, 1)).toBe('A日本');
  });

  it('breaks a reference of a formula being typed to a row someone else removes', async () => {
    const book = shared();
    const driver = open(book);

    await driver.focus(6, 1);
    await driver.press('F2');
    await driver.type('=A4+A2');
    receive(book.session, { kind: 'deleteLines', sheet: KEY, axis: 'rows', at: 3, count: 1 });
    await driver.settle();

    expect(driver.editingCell).toEqual({ row: 5, col: 1 });
    expect(driver.editorText).toBe('=#REF!+A2');
    expect(driver.caret).toBe(9);
  });

  it('moves the references of a formula typed in the formula bar with the rows someone else adds', async () => {
    const book = shared();
    const driver = open(book);

    await driver.focus(2, 1);
    await driver.focusFormula();
    await driver.typeFormula('=A5*2');
    receive(book.session, rowsAdded(0, 2));
    await driver.settle();

    expect(driver.formula).toBe('=A7*2');
    expect(driver.formulaFocused).toBe(true);
  });

  it('carries a draft typed in the formula bar and leaves the focus in the bar', async () => {
    const book = shared();
    const driver = open(book);

    await driver.focus(2, 1);
    await driver.focusFormula();
    await driver.typeFormula('=1+1');
    receive(book.session, rowsAdded(0, 2));
    await driver.settle();

    expect(driver.editingCell).toEqual({ row: 4, col: 1 });
    expect(driver.formula).toBe('=1+1');
    expect(driver.formulaFocused).toBe(true);

    await driver.pressInFormula('Enter');

    expect([driver.text(2, 1), driver.text(4, 1)]).toEqual(['', '2']);
  });

  it('keeps a draft in its cell when someone else changes rows below or a column width', async () => {
    const mine = shared();
    const theirs = shared();
    const driver = open(mine);

    await driver.focus(2, 0);
    await driver.press('F2');
    await driver.type('draft');
    receive(mine.session, rowsAdded(5, 1));
    widen(theirs, WIDE_COLUMN, WIDE_CHARS);
    receive(mine.session, ...theirs.session.pending());
    await driver.settle();

    expect(driver.editingCell).toEqual({ row: 2, col: 0 });
    expect(driver.editorText).toBe('draft');
  });

  it('closes a draft with a note when someone else removes its row', async () => {
    const book = shared();
    const driver = open(book);

    await driver.focus(3, 0);
    await driver.press('F2');
    await driver.type('draft');
    receive(book.session, { kind: 'deleteLines', sheet: KEY, axis: 'rows', at: 2, count: 1 });
    await driver.settle();

    expect(driver.editing).toBe(false);

    expect(driver.note).toBe(
      'Someone else removed or hid this cell. The text you typed was not saved',
    );

    expect(driver.refusals).toMatchObject([{ reason: 'cell-gone' }]);
    expect(driver.text(3, 0)).toBe('');
  });

  it('closes a draft with a note and steps the active cell aside when someone else hides its row', async () => {
    const mine = shared();
    const theirs = shared();
    const driver = open(mine);

    await driver.focus(3, 0);
    await driver.press('F2');
    await driver.type('draft');
    hide(theirs, 2);
    receive(mine.session, ...theirs.session.pending());
    await driver.settle();

    expect(driver.editing).toBe(false);
    expect(driver.refusals).toMatchObject([{ reason: 'cell-gone' }]);
    expect(driver.rowLabels.slice(0, 3)).toEqual(['1', '2', '4']);
    expect(driver.nameBox).toBe('A4');
  });

  it('moves the active cell and the selected range with their rows and columns', async () => {
    const book = shared();
    const driver = open(book);

    await driver.select({
      active: { row: 3, col: 2 },
      ranges: [{ top: 3, left: 2, bottom: 5, right: 3 }],
    });

    receive(
      book.session,
      rowsAdded(1, 2),
      { kind: 'insertLines', sheet: KEY, axis: 'cols', at: 0, count: 1 },
      { kind: 'deleteLines', sheet: KEY, axis: 'rows', at: 6, count: 1 },
    );

    await driver.settle();

    expect(driver.selection).toEqual({
      active: { row: 5, col: 3 },
      ranges: [{ top: 5, left: 3, bottom: 6, right: 4 }],
    });

    expect(driver.nameBox).toBe('D6');
  });

  it('keeps the rows and columns on the screen in place when someone else adds or removes lines before them', async () => {
    const book = shared();
    const driver = open(book);

    await driver.showFrom({ row: 10, rowOffset: 5, col: 4, colOffset: 10 });
    receive(book.session, rowsAdded(2, 3));
    await driver.settle();

    expect(driver.shownFrom).toEqual({
      row: 13,
      rowOffset: expect.closeTo(5),
      col: 4,
      colOffset: 10,
    });

    receive(
      book.session,
      { kind: 'deleteLines', sheet: KEY, axis: 'rows', at: 0, count: 1 },
      { kind: 'insertLines', sheet: KEY, axis: 'cols', at: 1, count: 2 },
    );

    await driver.settle();

    expect(driver.shownFrom).toEqual({
      row: 12,
      rowOffset: expect.closeTo(5),
      col: 6,
      colOffset: 10,
    });

    receive(book.session, rowsAdded(40, 5));
    await driver.settle();

    expect(driver.shownFrom).toEqual({
      row: 12,
      rowOffset: expect.closeTo(5),
      col: 6,
      colOffset: 10,
    });
  });

  it('shows the lines someone else adds at the start of a sheet scrolled to its start', async () => {
    const book = shared();
    const driver = open(book);

    await driver.scrollGrid(0, 0);
    receive(book.session, rowsAdded(0, 2));
    await driver.settle();

    expect(driver.gridScroll).toEqual({ top: 0, left: 0 });
  });

  it('leaves the focus outside the sheet when the active cell moves', async () => {
    const book = shared();
    const driver = open(book);

    await driver.focus(3, 0);
    await driver.focusFormula();
    receive(book.session, rowsAdded(0, 1));
    await driver.settle();

    expect(driver.nameBox).toBe('A4');
    expect(driver.formulaFocused).toBe(true);
  });

  it('sends the width of a dragged column as one step and shows a width from someone else', async () => {
    const mine = shared();
    const theirs = shared();
    const driver = open(mine);

    await driver.settle();
    await driver.dragColumnEdge('B', 36);

    const sent = mine.session.pending().length;

    widen(theirs, WIDE_COLUMN, WIDE_CHARS);
    receive(mine.session, ...theirs.session.pending());
    await driver.settle();

    expect(sent).toBe(1);
    expect([driver.columnWidth('B'), driver.columnWidth('D')]).toEqual(['100px', '140px']);
  });

  it('stops listening when it leaves the page', async () => {
    const stop = vi.fn<() => void>();
    const book = shared();
    const driver = open(book, { ...book.session, subscribe: () => stop });

    await driver.settle();
    mounted.splice(0);
    driver.unmount();

    expect(stop).toHaveBeenCalledOnce();
  });

  it('tells others the new name of the sheet when someone else renames it', async () => {
    const book = shared();
    const driver = open(book);

    await driver.select({
      active: { row: 3, col: 2 },
      ranges: [{ top: 3, left: 2, bottom: 3, right: 2 }],
    });

    receive(book.session, { kind: 'renameSheet', from: KEY, to: 'Plan' });
    await driver.settle();

    expect(driver.tabs).toEqual(['Plan']);
    expect(driver.places.at(-1)).toMatchObject({ sheet: 'Plan' });
  });
});

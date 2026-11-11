import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import {
  createCalculator,
  createWorkbook,
  createWorkbookDocument,
  lineLayoutsOf,
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

const WIDE_COLUMN = 3;

const WIDE_CHARS = 20;

const SNAPSHOT = { steps: [{ kind: 'addSheet', name: SHEET, index: 0 }] };

const mounted: SpreadsheetDriver[] = [];

const writeAt = (row: number, col: number, value: unknown, sheet = SHEET): unknown => ({
  kind: 'setCells',
  sheet,
  cells: [{ row, col, content: { kind: 'value', value } }],
});

const text = (value: string): unknown => writeAt(0, 0, { kind: 'string', value });

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
  sheet: SHEET,
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
    receive(book.session, { kind: 'insertLines', sheet: SHEET, axis: 'rows', at: 0, count: 1 });
    await driver.settle();

    expect(driver.text(3, 0)).toBe('mine');

    await driver.focus(1, 0);
    await driver.press('z', { ctrl: true });

    expect(driver.text(3, 0)).toBe('');
  });

  it('shows the book of the server on the sheet it was on after the book is opened again', async () => {
    const book = shared();
    const driver = open(book);

    receive(book.session, { kind: 'addSheet', name: 'Plan', index: 1 });
    await driver.settle();
    await driver.chooseTab('Plan');
    await driver.enter(1, 0, 'unsent');

    book.session.reset();

    book.session.load(
      {
        steps: [
          { kind: 'addSheet', name: 'Intro', index: 0 },
          { kind: 'addSheet', name: SHEET, index: 1 },
          { kind: 'addSheet', name: 'Plan', index: 2 },
          writeAt(0, 0, { kind: 'string', value: 'theirs' }, 'Plan'),
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

    receive(book.session, { kind: 'addSheet', name: 'Plan', index: 1 });
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
    receive(book.session, { kind: 'deleteLines', sheet: SHEET, axis: 'rows', at: 2, count: 1 });
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
      { kind: 'insertLines', sheet: SHEET, axis: 'cols', at: 0, count: 1 },
      { kind: 'deleteLines', sheet: SHEET, axis: 'rows', at: 6, count: 1 },
    );

    await driver.settle();

    expect(driver.selection).toEqual({
      active: { row: 5, col: 3 },
      ranges: [{ top: 5, left: 3, bottom: 6, right: 4 }],
    });

    expect(driver.nameBox).toBe('D6');
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

    receive(book.session, { kind: 'renameSheet', from: SHEET, to: 'Plan' });
    await driver.settle();

    expect(driver.tabs).toEqual(['Plan']);
    expect(driver.places.at(-1)).toMatchObject({ sheet: 'Plan' });
  });
});

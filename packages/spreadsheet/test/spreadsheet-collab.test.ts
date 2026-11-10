import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import {
  createCalculator,
  createWorkbook,
  createWorkbookDocument,
  type Calculator,
  type Workbook,
  type WorkbookDocument,
} from '../src/core';
import { SpreadsheetDriver } from './drivers/spreadsheet';

interface SharedBook {
  readonly book: Workbook;
  readonly calculator: Calculator;
  readonly session: WorkbookDocument;
}

const SHEET = 'Sheet1';

const SNAPSHOT = { steps: [{ kind: 'addSheet', name: SHEET, index: 0 }] };

const mounted: SpreadsheetDriver[] = [];

const writeAt = (row: number, col: number, value: unknown): unknown => ({
  kind: 'setCells',
  sheet: SHEET,
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

  it('does not write a draft into the row that slid under it when someone else adds a row above', async () => {
    const book = shared();
    const driver = open(book);

    await driver.focus(2, 0);
    await driver.press('F2');
    await driver.type('draft');
    receive(book.session, { kind: 'insertLines', sheet: SHEET, axis: 'rows', at: 0, count: 1 });
    await driver.settle();
    await driver.press('Enter');

    expect([driver.text(2, 0), driver.text(3, 0)]).toEqual(['', '']);
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

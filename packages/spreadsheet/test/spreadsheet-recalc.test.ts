import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { flushPromises } from '@vue/test-utils';
import {
  createCalculator,
  createWorkbook,
  numberValue,
  parseFormula,
  textValue,
  type Calculator,
  type RecalcOptions,
  type Recalculation,
  type Workbook,
} from '../src/core';
import type { LimitationsReport } from '../src/xlsx';
import { SpreadsheetDriver } from './drivers/spreadsheet';

interface SlowRuns {
  readonly calculator: Calculator;
  readonly started: RecalcOptions[];
  cancels: number;
  advance(done: number): void;
  finish(): void;
}

const mounted: SpreadsheetDriver[] = [];

const bookWith = (): Workbook => {
  const book = createWorkbook();
  const sheet = book.addSheet('Sales');

  sheet.cells.set(0, 0, textValue('Item'));
  sheet.cells.set(1, 1, numberValue(2));
  sheet.cells.set(1, 2, numberValue(4));
  return book;
};

const slowRuns = (book: Workbook): SlowRuns => {
  const real = createCalculator(book);
  const runs: { done: number; finished: boolean; resolve: () => void }[] = [];

  const state: SlowRuns = {
    calculator: {
      ...real,
      staleAt: (_sheet, row, col) => row === 1 && col === 2,
      recalculate: (options: RecalcOptions = {}): Recalculation => {
        const run = { done: 0, finished: false, resolve: (): void => undefined };

        const settled = new Promise<void>((resolve) => {
          run.resolve = resolve;
        });

        state.started.push(options);
        runs.push(run);

        return {
          total: 4,
          get done() {
            return run.done;
          },
          busyMs: 0,
          longestMs: 0,
          get finished() {
            return run.finished;
          },
          planned: true,
          settled,
          cancel: () => {
            state.cancels += 1;
            run.finished = true;
            run.resolve();
          },
        };
      },
    },
    started: [],
    cancels: 0,
    advance: (done) => {
      const run = runs.at(-1);

      if (run !== undefined) {
        run.done = done;
      }
    },
    finish: () => {
      const run = runs.at(-1);

      if (run !== undefined) {
        run.finished = true;
        run.resolve();
      }
    },
  };

  return state;
};

const report = (changes: Partial<LimitationsReport> = {}): LimitationsReport => ({
  readOnly: false,
  staleFormulas: 0,
  items: [],
  ...changes,
});

const sheetOf = (...args: Parameters<typeof SpreadsheetDriver.mount>): SpreadsheetDriver => {
  const driver = SpreadsheetDriver.mount(...args);

  mounted.push(driver);
  return driver;
};

afterEach(() => {
  for (const driver of mounted.splice(0)) {
    driver.unmount();
  }

  vi.useRealTimers();
});

describe('NuiSpreadsheet recalculation and the limitations report', () => {
  it('shows a long recalculation with its progress, stops it and continues it', async () => {
    const book = bookWith();
    const runs = slowRuns(book);

    const sheet = sheetOf({
      book,
      calculator: runs.calculator,
      label: 'Sales',
      report: report({ staleFormulas: 2 }),
    });

    await sheet.settle();
    vi.useFakeTimers();
    await sheet.recalculateFromReport();
    runs.advance(1);

    expect(runs.started).toEqual([{ imported: true }]);
    expect(sheet.status).toBeUndefined();

    await vi.advanceTimersByTimeAsync(300);

    expect(sheet.status).toBe('Recalculating 25%');
    expect(sheet.stale(2, 2)).toBe(true);
    expect(sheet.stale(2, 1)).toBe(false);

    runs.advance(2);
    await vi.advanceTimersByTimeAsync(32);

    expect(sheet.status).toBe('Recalculating 50%');

    await sheet.pressStatusAction();
    await flushPromises();

    expect(runs.cancels).toBe(1);
    expect([sheet.status, sheet.statusAction]).toEqual(['Recalculation stopped', 'Continue']);
    expect(sheet.stale(2, 2)).toBe(true);

    await sheet.pressStatusAction();

    expect([sheet.status, sheet.statusAction]).toEqual(['Recalculating 0%', 'Stop']);

    runs.finish();
    await flushPromises();

    expect(sheet.status).toBeUndefined();
    expect(sheet.stale(2, 2)).toBe(false);
    expect(sheet.announcement).toBe('Recalculation finished');
  });

  it('returns focus to the active cell when the finished recalculation hides its button', async () => {
    const book = bookWith();
    const runs = slowRuns(book);

    const sheet = sheetOf({
      book,
      calculator: runs.calculator,
      label: 'Sales',
      report: report({ staleFormulas: 2 }),
    });

    await sheet.settle();
    await sheet.focus(2, 2);
    vi.useFakeTimers();
    await sheet.recalculateFromReport();
    await vi.advanceTimersByTimeAsync(300);
    await sheet.pressStatusAction();
    await flushPromises();
    await sheet.pressStatusAction();
    runs.finish();
    await flushPromises();

    expect(sheet.status).toBeUndefined();
    expect(sheet.focusedCell).toEqual({ row: 2, col: 2 });
  });

  it('keeps a quick recalculation out of sight', async () => {
    const book = bookWith();
    const runs = slowRuns(book);

    const sheet = sheetOf({
      book,
      calculator: runs.calculator,
      label: 'Sales',
      report: report({ staleFormulas: 2 }),
    });

    await sheet.settle();
    vi.useFakeTimers();
    await sheet.recalculateFromReport();
    await vi.advanceTimersByTimeAsync(100);
    runs.finish();
    await flushPromises();
    await vi.advanceTimersByTimeAsync(400);

    expect([sheet.status, sheet.stale(2, 2), sheet.announcement]).toEqual([undefined, false, '']);
  });

  it('lists unsupported parts of an editable book under the saved values', async () => {
    const sheet = sheetOf({
      book: bookWith(),
      label: 'Sales',
      report: report({
        staleFormulas: 3,
        items: [{ code: 'comments', severity: 'info', count: 2, sheets: ['Sales'], names: [] }],
      }),
    });

    expect([sheet.reportTitle, sheet.reportStale, sheet.reportLines]).toEqual([
      'Some parts of the book are not fully supported',
      '3 formulas show their values saved in the file',
      ['Comments: 2 (Sales)'],
    ]);

    expect(sheet.formulaReadonly).toBe(false);
  });

  it('opens a read-only book with the reasons and refuses edits', async () => {
    const sheet = sheetOf({
      book: bookWith(),
      label: 'Sales',
      report: report({
        readOnly: true,
        items: [
          { code: 'date-1904', severity: 'read-only', count: 1, sheets: [], names: [] },
          {
            code: 'unsupported-functions',
            severity: 'info',
            count: 3,
            sheets: ['Sales'],
            names: ['WEBSERVICE'],
          },
        ],
      }),
    });

    expect([sheet.reportTitle, sheet.reportTone]).toEqual([
      'The book is open read-only',
      'warning',
    ]);

    expect(sheet.reportLines).toEqual([
      'Dates in the 1904 date system',
      'Unsupported functions keep the values saved by Excel: 3 WEBSERVICE (Sales)',
    ]);

    expect(sheet.formulaReadonly).toBe(true);

    await sheet.focus(2, 1);
    await sheet.press('F2');

    expect(sheet.editing).toBe(false);

    await sheet.dismissReport();

    expect(sheet.reportTitle).toBeUndefined();
  });

  it('recalculates the values saved in the file on request', async () => {
    const book = bookWith();
    const calculator = createCalculator(book);
    const sales = book.sheets[0];
    const parsed = parseFormula('=B2*2', undefined, { row: 1, col: 3 });

    if (sales === undefined || !parsed.ok) {
      throw new Error('the book is not ready');
    }

    calculator.importFormula(sales, 1, 3, parsed.ast, {
      value: numberValue(10),
      recalculate: false,
    });

    const sheet = sheetOf({
      book,
      calculator,
      label: 'Sales',
      report: report({ staleFormulas: 1 }),
    });

    await sheet.settle();

    expect([sheet.reportTitle, sheet.reportTone, sheet.text(2, 3)]).toEqual([
      '1 formula shows its value saved in the file',
      'info',
      '10',
    ]);

    await sheet.recalculateFromReport();
    await flushPromises();

    expect([sheet.text(2, 3), sheet.reportTitle]).toEqual(['4', undefined]);
    expect(sheet.focusedCell).toEqual({ row: 1, col: 0 });
  });
});

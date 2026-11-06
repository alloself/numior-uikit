import { describe, expect, it } from 'vite-plus/test';
import { MAX_COLS, MAX_ROWS, createWorkbook, parseFormula, type Workbook } from '../src/core';
import { targetOf } from '../src/sheet/sheet-navigation';

const bookWithNames = (): Workbook => {
  const book = createWorkbook();
  const sales = book.addSheet('Sales');
  const rates = book.addSheet('Rates');

  const named = (name: string, formula: string, scope = sales): void => {
    const parsed = parseFormula(formula);

    if (!parsed.ok) {
      throw new Error(`${formula} does not parse`);
    }
    book.names.set(name, scope, parsed.ast);
  };

  named('Total', '$D$7');
  named('Block', 'Sales!B2:C4');
  named('Months', '$B:$G');
  named('Lines', '3:5');
  named('Rate', 'Rates!A1', rates);
  named('Elsewhere', 'Rates!A1');
  named('Tax', '0.2');
  return book;
};

const sales = (book: Workbook) => book.sheet('Sales') ?? book.addSheet('Sales');

describe('name box targets', () => {
  it.each([
    ['d5', { top: 4, left: 3, bottom: 4, right: 3 }],
    ['$B$2', { top: 1, left: 1, bottom: 1, right: 1 }],
    [' C4:A2 ', { top: 1, left: 0, bottom: 3, right: 2 }],
    ['B:C', { top: 0, left: 1, bottom: MAX_ROWS - 1, right: 2 }],
    ['3:5', { top: 2, left: 0, bottom: 4, right: MAX_COLS - 1 }],
    ['total', { top: 6, left: 3, bottom: 6, right: 3 }],
    ['Block', { top: 1, left: 1, bottom: 3, right: 2 }],
    ['Months', { top: 0, left: 1, bottom: MAX_ROWS - 1, right: 6 }],
    ['Lines', { top: 2, left: 0, bottom: 4, right: MAX_COLS - 1 }],
  ])('goes from %j to its range', (text, range) => {
    const book = bookWithNames();

    expect(targetOf(book, sales(book), text)).toEqual(range);
  });

  it.each(['', 'zz', 'B', 'Elsewhere', 'Rate', 'Tax', 'Nowhere', 'A1:B2:C3'])(
    'finds nothing on this sheet for %j',
    (text) => {
      const book = bookWithNames();

      expect(targetOf(book, sales(book), text)).toBeUndefined();
    },
  );
});

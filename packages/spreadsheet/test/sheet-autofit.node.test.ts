import { describe, expect, it } from 'vite-plus/test';
import { createWorkbook, textValue, type Sheet, type Workbook } from '../src/core';
import { AUTOFIT_CELLS, autofitColumns, type Autofit } from '../src/sheet/sheet-autofit';
import { sheetCells } from '../src/sheet/sheet-cells';

interface Fitting {
  readonly book: Workbook;
  readonly sheet: Sheet;
  readonly measured: string[];
  fit(cols: readonly number[], shown?: { readonly start: number; readonly end: number }): Autofit;
}

const CHAR = 7;

const LONGEST = 'The longest text of the column';

const TALL = AUTOFIT_CELLS + 50;

const openFitting = (): Fitting => {
  const book = createWorkbook();
  const sheet = book.addSheet('Sales');
  const measured: string[] = [];

  return {
    book,
    sheet,
    measured,
    fit: (cols, shown) =>
      autofitColumns(
        {
          sheet,
          cells: sheetCells({ book, sheet }),
          shown,
          measure: (text) => {
            measured.push(text);
            return text.length * CHAR;
          },
        },
        cols,
      ),
  };
};

const fillDown = (sheet: Sheet, col: number, rows: number): void => {
  for (let row = 0; row < rows; row += 1) {
    sheet.cells.set(row, col, textValue('Item'));
  }
};

describe('column width by content', () => {
  it('takes the widest text of each column and gives an empty column no width', () => {
    const fitting = openFitting();

    fitting.sheet.cells.set(0, 0, textValue('Name'));
    fitting.sheet.cells.set(5, 0, textValue(LONGEST));
    fitting.sheet.cells.set(0, 2, textValue('Sum'));

    const fit = fitting.fit([0, 1, 2]);

    expect([...fit.widths]).toEqual([
      [0, LONGEST.length * CHAR],
      [1, undefined],
      [2, 3 * CHAR],
    ]);

    expect([fit.fitted, fit.partial]).toEqual([2, false]);
  });

  it('measures the rows on screen even past the cells it takes from the top', () => {
    const fitting = openFitting();

    fillDown(fitting.sheet, 0, TALL);
    fitting.sheet.cells.set(TALL - 5, 0, textValue(LONGEST));

    const blind = fitting.fit([0]);
    const seeing = fitting.fit([0], { start: TALL - 10, end: TALL - 1 });

    expect([blind.widths.get(0), blind.partial]).toEqual([4 * CHAR, true]);
    expect([seeing.widths.get(0), seeing.partial]).toEqual([LONGEST.length * CHAR, true]);
  });

  it('shares what it measures between the columns of one gesture', () => {
    const fitting = openFitting();
    const cols = [0, 1, 2, 3];

    for (const col of cols) {
      fillDown(fitting.sheet, col, AUTOFIT_CELLS);
    }

    const fit = fitting.fit(cols);

    expect(fitting.measured).toHaveLength(AUTOFIT_CELLS);
    expect([fit.fitted, fit.partial]).toEqual([4, true]);
  });
});

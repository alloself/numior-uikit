import { describe, expect, it } from 'vite-plus/test';
import { charsToPixels, pixelsToChars, sheetCells, type SheetCells } from '../src';
import {
  EN_LOCALE,
  createCalculator,
  createStepper,
  createWorkbook,
  lineLayoutsOf,
  numberValue,
  withLineSizes,
  type LineLayout,
  type Sheet,
  type WorkbookStep,
} from '../src/core';
import { liveSource, sameColumns, type ColumnShape } from '../src/sheet/sheet-table';

interface OpenSheet {
  readonly sheet: Sheet;
  readonly cells: () => SheetCells;
  readonly apply: (step: WorkbookStep) => void;
}

const SHEET = 'Sheet1';

const WIDE_COLUMN = 3;

const WIDEST_PIXELS = 600;

const WIDE: LineLayout = {
  size: 40,
  custom: true,
  hidden: false,
  level: 0,
  collapsed: false,
  style: undefined,
  extra: [],
};

const openSheet = (): OpenSheet => {
  const book = createWorkbook();
  const sheet = book.addSheet(SHEET);
  const stepper = createStepper(book, createCalculator(book, { locale: EN_LOCALE }));

  return {
    sheet,
    cells: () => sheetCells({ book, sheet }),
    apply: (step) => {
      stepper.apply(step);
    },
  };
};

const shapeOf = ({ sheet, cells }: OpenSheet): ColumnShape => {
  const current = cells();

  return {
    sheet,
    lines: sheet.layout.cols,
    width: sheet.layout.defaults.colWidth,
    frozen: current.frozenCols,
    source: current.source,
  };
};

describe('columns of a sheet', () => {
  it('stay the same while rows are inserted and deleted', () => {
    const opened = openSheet();
    const before = shapeOf(opened);

    opened.apply({ kind: 'insertLines', sheet: SHEET, axis: 'rows', at: 0, count: 2 });
    opened.apply({ kind: 'deleteLines', sheet: SHEET, axis: 'rows', at: 5, count: 1 });

    expect(sameColumns(before, shapeOf(opened))).toBe(true);
  });

  it('stay the same while columns move past the ones with a width of their own', () => {
    const opened = openSheet();

    opened.sheet.layout = { ...opened.sheet.layout, cols: lineLayoutsOf([[WIDE_COLUMN, WIDE]]) };

    const before = shapeOf(opened);

    opened.apply({
      kind: 'insertLines',
      sheet: SHEET,
      axis: 'cols',
      at: WIDE_COLUMN + 1,
      count: 1,
    });

    expect(sameColumns(before, shapeOf(opened))).toBe(true);
  });

  it('are replaced once a column with a width of its own moves', () => {
    const opened = openSheet();

    opened.sheet.layout = { ...opened.sheet.layout, cols: lineLayoutsOf([[WIDE_COLUMN, WIDE]]) };

    const before = shapeOf(opened);

    opened.apply({ kind: 'insertLines', sheet: SHEET, axis: 'cols', at: 0, count: 1 });

    expect(sameColumns(before, shapeOf(opened))).toBe(false);
  });

  it('read cells, labels and edges from the newest rows through the columns built first', () => {
    const opened = openSheet();

    opened.sheet.cells.set(0, 0, numberValue(7));

    const built = opened.cells().source;
    const holder = { current: built };
    const live = liveSource(built, () => holder.current);

    opened.apply({ kind: 'insertLines', sheet: SHEET, axis: 'rows', at: 0, count: 3 });
    holder.current = opened.cells().source;

    expect([live.cellAt(0, 0)?.text, live.cellAt(3, 0)?.text]).toEqual([undefined, '7']);
    expect(live.lastCell()).toEqual({ row: 3, col: 0 });
    expect(live.nextEdge({ row: 0, col: 0 }, 'down')).toEqual({ row: 3, col: 0 });
    expect([live.rows, live.cols]).toEqual([built.rows, built.cols]);
    expect([live.columnLabel(1), live.rowLabel(3)]).toEqual(['B', '4']);
  });
});

describe('widths of columns', () => {
  it('come back as the same pixels after they are stored in characters', () => {
    const pixels = Array.from({ length: WIDEST_PIXELS }, (_, index) => index + 1);

    expect(pixels.map((each) => charsToPixels(pixelsToChars(each)))).toEqual(pixels);
  });

  it('are set on a line as a width of its own and leave no trace once they are reset', () => {
    const sized = withLineSizes(lineLayoutsOf([]), new Map([[WIDE_COLUMN, WIDE.size]]));
    const reset = withLineSizes(sized, new Map([[WIDE_COLUMN, undefined]]));

    expect(sized.get(WIDE_COLUMN)).toEqual({ ...WIDE, size: WIDE.size });
    expect(reset.size).toBe(0);
  });

  it('keep what else a line holds when its width is reset', () => {
    const hidden = lineLayoutsOf([[WIDE_COLUMN, { ...WIDE, hidden: true }]]);
    const reset = withLineSizes(hidden, new Map([[WIDE_COLUMN, undefined]]));

    expect(reset.get(WIDE_COLUMN)).toEqual({
      ...WIDE,
      size: undefined,
      custom: false,
      hidden: true,
    });
  });
});

import { formatValue } from '../format/format-value';
import { EN_NUMBERS } from '../format/number-locale';
import type { SheetLayout } from '../layout/layout.types';
import { withLineSizes } from '../layout/line-layouts';
import type { Sheet, Workbook } from '../workbook';
import type { CellEdit } from './step.types';

const PADDING = 2;

const DEFAULT_WIDTH = 8.43;

const MAX_WIDTH = 80;

const widthsOf = (
  book: Workbook,
  sheet: Sheet,
  cells: readonly CellEdit[],
  minimum: number,
): Map<number, number> =>
  cells.reduce((widths, cell) => {
    const code = book.formats.code(sheet.formats.get(cell.row, cell.col));
    const { text } = formatValue(sheet.cells.get(cell.row, cell.col), code, EN_NUMBERS);
    const width = Math.min(MAX_WIDTH, Math.max(minimum, text.length + PADDING));

    widths.set(cell.col, Math.max(widths.get(cell.col) ?? minimum, width));
    return widths;
  }, new Map<number, number>());

export const fittedLayout = (
  book: Workbook,
  sheet: Sheet,
  cells: readonly CellEdit[],
): SheetLayout => {
  const { layout } = sheet;
  const widths = widthsOf(book, sheet, cells, layout.defaults.colWidth ?? DEFAULT_WIDTH);

  if ([...widths].every(([col, width]) => layout.cols.get(col)?.size === width)) {
    return layout;
  }

  return { ...layout, cols: withLineSizes(layout.cols, widths) };
};

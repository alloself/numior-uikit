import { formatValue } from '../format/format-value';
import { EN_NUMBERS } from '../format/number-locale';
import type { LineLayout, SheetLayout } from '../layout/layout.types';
import { lineLayoutsOf } from '../layout/line-layouts';
import type { Sheet, Workbook } from '../workbook';
import type { CellEdit } from './step.types';

const PADDING = 2;

const DEFAULT_WIDTH = 8.43;

const MAX_WIDTH = 80;

const BLANK_LINE: LineLayout = {
  size: undefined,
  custom: false,
  hidden: false,
  level: 0,
  collapsed: false,
  style: undefined,
  extra: [],
};

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

  const entries: [number, LineLayout][] = [];

  layout.cols.forEach((col, line) => {
    if (!widths.has(col)) {
      entries.push([col, line]);
    }
  });

  widths.forEach((width, col) => {
    entries.push([col, { ...(layout.cols.get(col) ?? BLANK_LINE), size: width, custom: true }]);
  });

  return { ...layout, cols: lineLayoutsOf(entries) };
};

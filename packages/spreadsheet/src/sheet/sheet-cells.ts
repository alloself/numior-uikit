import type {
  NuiTableCellStyle,
  NuiTableEdgeDirection,
  NuiTableRange,
  NuiTableSourceCell,
  TableCellPosition,
} from '@numior/table';
import {
  EN_LOCALE,
  MAX_COLS,
  MAX_ROWS,
  columnName,
  formatValue,
  type BookLocale,
  type CellValue,
  type LineLayouts,
  type Sheet,
  type Workbook,
} from '../core';
import { createLineIndex, type LineIndex } from './line-index';
import {
  createConditionalLooks,
  createLookKeys,
  decorationWith,
  markedStyle,
} from './sheet-conditional';
import { sheetStyle } from './sheet-style';
import type { LineSizes } from './drawings/drawings.types';
import type { SheetCells, SheetCellsOptions, StyleCache, ValueShape } from './sheet.types';
import { CellValueKind } from '../core/cell.types';

interface EdgeStep {
  readonly row: -1 | 0 | 1;
  readonly col: -1 | 0 | 1;
}

const EDGE_STEPS: Readonly<Record<NuiTableEdgeDirection, EdgeStep>> = {
  up: { row: -1, col: 0 },
  down: { row: 1, col: 0 },
  previous: { row: 0, col: -1 },
  next: { row: 0, col: 1 },
};

const MDW = 7;

const DEFAULT_COLUMN = 64;

const DEFAULT_ROW_POINTS = 15;

const POINT = 96 / 72;

const SHAPES: Readonly<Record<CellValue['kind'], ValueShape>> = {
  number: 'number',
  string: 'text',
  boolean: 'logical',
  error: 'logical',
  empty: 'empty',
};

export const charsToPixels = (chars: number): number =>
  Math.trunc(((256 * chars + Math.trunc(128 / MDW)) / 256) * MDW);

export const pointsToPixels = (points: number): number => Math.round(points * POINT);

const hiddenLines = (lines: LineLayouts): number[] => {
  const hidden: number[] = [];

  lines.forEach((line, layout) => {
    if (layout.hidden) {
      hidden.push(line);
    }
  });

  return hidden;
};

const decorationAt = (sheet: Sheet, row: number, col: number): number => {
  const own = sheet.decorations.get(row, col);

  return (
    (own === 0 ? undefined : own) ??
    sheet.layout.rows.get(row)?.style?.decoration ??
    sheet.layout.cols.get(col)?.style?.decoration ??
    0
  );
};

const formatAt = (sheet: Sheet, row: number, col: number): number => {
  const own = sheet.formats.get(row, col);

  return (
    (own === 0 ? undefined : own) ??
    sheet.layout.rows.get(row)?.style?.format ??
    sheet.layout.cols.get(col)?.style?.format ??
    0
  );
};

const firstShown = (index: LineIndex, from: number, to: number): number | undefined => {
  for (let line = from; line <= to; line += 1) {
    const position = index.positionOf(line);

    if (position !== undefined) {
      return position;
    }
  }
  return undefined;
};

const lastShown = (index: LineIndex, from: number, to: number): number | undefined => {
  for (let line = to; line >= from; line -= 1) {
    const position = index.positionOf(line);

    if (position !== undefined) {
      return position;
    }
  }
  return undefined;
};

const mergesOf = (sheet: Sheet, rows: LineIndex, cols: LineIndex): NuiTableRange[] =>
  sheet.layout.merges.reduce<NuiTableRange[]>((found, merge) => {
    const top = firstShown(rows, merge.top, merge.bottom);
    const left = firstShown(cols, merge.left, merge.right);
    const bottom = lastShown(rows, merge.top, merge.bottom);
    const right = lastShown(cols, merge.left, merge.right);

    if (top !== undefined && left !== undefined && bottom !== undefined && right !== undefined) {
      found.push({ from: { row: top, col: left }, to: { row: bottom, col: right } });
    }
    return found;
  }, []);

const frozenOf = (index: LineIndex, count: number): number =>
  count <= 0 ? 0 : (index.positionOf(count - 1) ?? firstShown(index, 0, count - 1) ?? -1) + 1;

const rowHeightsOf = (sheet: Sheet, rows: LineIndex): Record<number, number> => {
  const heights: Record<number, number> = {};

  sheet.layout.rows.forEach((row, layout) => {
    const position = rows.positionOf(row);

    if (position !== undefined && layout.size !== undefined) {
      heights[position] = pointsToPixels(layout.size);
    }
  });

  return heights;
};

const columnWidthOf = (sheet: Sheet, col: number): number => {
  const size = sheet.layout.cols.get(col)?.size ?? sheet.layout.defaults.colWidth;

  return size === undefined ? DEFAULT_COLUMN : charsToPixels(size);
};

export const lineSizesOf = (sheet: Sheet): LineSizes => ({
  width: (col) => (sheet.layout.cols.get(col)?.hidden === true ? 0 : columnWidthOf(sheet, col)),
  height: (row) => {
    const layout = sheet.layout.rows.get(row);

    return layout?.hidden === true
      ? 0
      : pointsToPixels(layout?.size ?? sheet.layout.defaults.rowHeight ?? DEFAULT_ROW_POINTS);
  },
});

export const cellText = (
  book: Workbook,
  sheet: Sheet,
  row: number,
  col: number,
  locale: BookLocale,
): string =>
  formatValue(
    sheet.cells.get(row, col),
    book.formats.code(formatAt(sheet, row, col)),
    locale.numbers,
  ).text;

const createStyles = (book: Workbook): StyleCache => {
  const known = new Map<string, NuiTableCellStyle | undefined>();
  const lookKey = createLookKeys(book.decorations.theme);

  return (decoration, shape, color, look) => {
    const key = `${String(decoration)}:${shape}:${String(color)}:${
      look === undefined ? '' : lookKey(look)
    }`;

    if (known.has(key)) {
      return known.get(key);
    }

    const base = book.decorations.get(decoration);

    const style = sheetStyle({
      decoration: look === undefined ? base : decorationWith(base, look, book.decorations.theme),
      theme: book.decorations.theme,
      base: book.decorations.defaultFont,
      shape,
      formatColor: color,
    });

    const marked = look === undefined ? style : markedStyle(style, look, book.decorations.theme);

    known.set(key, marked);
    return marked;
  };
};

const STALE_CLASS = 'nui-spreadsheet__stale';

const STALE: NuiTableCellStyle = { class: STALE_CLASS, color: 'var(--nui-text-subtle)' };

const createStale = (): ((style: NuiTableCellStyle | undefined) => NuiTableCellStyle) => {
  const known = new WeakMap<NuiTableCellStyle, NuiTableCellStyle>();

  return (style) => {
    if (style === undefined) {
      return STALE;
    }

    const cached = known.get(style);

    if (cached !== undefined) {
      return cached;
    }

    const muted = {
      ...style,
      ...STALE,
      class: style.class === undefined ? STALE_CLASS : `${style.class} ${STALE_CLASS}`,
    };

    known.set(style, muted);
    return muted;
  };
};

export const defaultRowHeight = (sheet: Sheet): number =>
  pointsToPixels(sheet.layout.defaults.rowHeight ?? DEFAULT_ROW_POINTS);

export const sheetCells = ({
  book,
  sheet,
  locale = EN_LOCALE,
  outdated,
  calculator,
}: SheetCellsOptions): SheetCells => {
  const rows = createLineIndex(MAX_ROWS, hiddenLines(sheet.layout.rows));
  const cols = createLineIndex(MAX_COLS, hiddenLines(sheet.layout.cols));
  const styles = createStyles(book);
  const stale = createStale();
  const looks = createConditionalLooks(book, sheet, calculator);
  const { view } = sheet.layout;

  const cellAt = (position: number, column: number): NuiTableSourceCell | undefined => {
    const row = rows.lineAt(position);
    const col = cols.lineAt(column);
    const value = sheet.cells.get(row, col);
    const decoration = decorationAt(sheet, row, col);
    const look = looks(row, col);

    if (value.kind === CellValueKind.Empty && decoration === 0 && look === undefined) {
      return undefined;
    }

    const code = look?.style?.format ?? book.formats.code(formatAt(sheet, row, col));
    const shown = formatValue(value, code, locale.numbers);

    const style = styles(decoration, SHAPES[value.kind], shown.color, look);

    return {
      text: look?.hideValue === true ? '' : shown.text,
      style: outdated?.(sheet, row, col) === true ? stale(style) : style,
    };
  };

  const nextEdge = (
    from: TableCellPosition,
    direction: NuiTableEdgeDirection,
  ): TableCellPosition => {
    const step = EDGE_STEPS[direction];

    const edge = sheet.cells.nextEdge(
      rows.lineAt(from.row),
      cols.lineAt(from.col),
      step.row,
      step.col,
    );

    return step.row === 0
      ? { row: from.row, col: cols.positionNear(edge) }
      : { row: rows.positionNear(edge), col: from.col };
  };

  const lastCell = (): TableCellPosition | undefined => {
    const used = sheet.cells.usedRange();

    return used === undefined
      ? undefined
      : { row: rows.positionNear(used.bottom), col: cols.positionNear(used.right) };
  };

  return {
    source: {
      rows: rows.count,
      cols: cols.count,
      cellAt,
      nextEdge,
      lastCell,
      columnWidth: (column) => columnWidthOf(sheet, cols.lineAt(column)),
      rowLabel: (position) => String(rows.lineAt(position) + 1),
      columnLabel: (column) => columnName(cols.lineAt(column)),
    },
    merges: mergesOf(sheet, rows, cols),
    frozenRows: frozenOf(rows, view.frozenRows),
    frozenCols: frozenOf(cols, view.frozenCols),
    rowHeights: rowHeightsOf(sheet, rows),
    gridlines: view.gridlines,
    rightToLeft: view.rightToLeft,
    rowAt: rows.lineAt,
    colAt: cols.lineAt,
    rowNear: rows.positionNear,
    colNear: cols.positionNear,
  };
};

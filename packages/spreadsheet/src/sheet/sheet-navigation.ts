import {
  FormulaReferenceKind,
  MAX_COLS,
  MAX_ROWS,
  parseCell,
  parseRange,
  rangeOf,
  type CellRange,
  type FormulaNode,
  type Sheet,
  type Workbook,
} from '../core';

interface PlacedRange {
  readonly book: number | undefined;
  readonly sheet: string | undefined;
  readonly range: CellRange;
}

const placedRange = (node: FormulaNode): PlacedRange | undefined => {
  switch (node.kind) {
    case FormulaReferenceKind.Cell: {
      return { book: node.book, sheet: node.sheet, range: rangeOf(node.ref, node.ref) };
    }
    case FormulaReferenceKind.Range: {
      return { book: node.book, sheet: node.sheet, range: rangeOf(node.from, node.to) };
    }
    case FormulaReferenceKind.Columns: {
      return {
        book: node.book,
        sheet: node.sheet,
        range: rangeOf({ row: 0, col: node.from.index }, { row: MAX_ROWS - 1, col: node.to.index }),
      };
    }
    case FormulaReferenceKind.Rows: {
      return {
        book: node.book,
        sheet: node.sheet,
        range: rangeOf({ row: node.from.index, col: 0 }, { row: node.to.index, col: MAX_COLS - 1 }),
      };
    }
    default: {
      return undefined;
    }
  }
};

const onSheet = (placed: PlacedRange, sheet: Sheet): boolean =>
  placed.book === undefined &&
  (placed.sheet === undefined || placed.sheet.toLowerCase() === sheet.name.toLowerCase());

export const targetOf = (book: Workbook, sheet: Sheet, text: string): CellRange | undefined => {
  const name = text.trim();
  const bare = name.replaceAll('$', '');
  const range = bare.includes(':') || parseCell(bare) !== undefined ? parseRange(bare) : undefined;

  if (range !== undefined) {
    return range;
  }

  const defined = name === '' ? undefined : book.names.resolve(name, sheet);

  const placed = defined === undefined ? undefined : placedRange(defined.ast);

  return placed !== undefined && onSheet(placed, sheet) ? placed.range : undefined;
};

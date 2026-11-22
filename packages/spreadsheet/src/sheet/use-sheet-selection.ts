import type { NuiTableRange, NuiTableCellPosition } from '@numior/table';
import { computed, watch } from 'vue';
import type { CellAddress, CellRange } from '../core';
import type {
  NuiSpreadsheetSelection,
  SheetCells,
  SheetSelection,
  SheetSelectionOptions,
} from './sheet.types';

const rangeKey = (range: CellRange): string =>
  [range.top, range.left, range.bottom, range.right].map(String).join(':');

export const selectionKey = (selection: NuiSpreadsheetSelection | undefined): string =>
  selection === undefined
    ? ''
    : [
        `${String(selection.active.row)}:${String(selection.active.col)}`,
        ...selection.ranges.map(rangeKey),
      ].join('/');

export const lineRange = (cells: SheetCells, range: NuiTableRange): CellRange =>
  cells.rangeOf(range);

const cellRange = (cell: CellAddress): CellRange => ({
  top: cell.row,
  left: cell.col,
  bottom: cell.row,
  right: cell.col,
});

const positionOf = (cells: SheetCells, cell: CellAddress): NuiTableCellPosition => ({
  row: cells.rowNear(cell.row),
  col: cells.colNear(cell.col),
});

export const tableRangeOf = (cells: SheetCells, area: CellRange): NuiTableRange => ({
  from: positionOf(cells, { row: area.top, col: area.left }),
  to: positionOf(cells, { row: area.bottom, col: area.right }),
});

const tableRangesOf = (cells: SheetCells, next: NuiSpreadsheetSelection): NuiTableRange[] => {
  const single =
    next.ranges.length === 1 &&
    rangeKey(next.ranges[0] ?? cellRange(next.active)) === rangeKey(cellRange(next.active));

  return single ? [] : next.ranges.map((range) => tableRangeOf(cells, range));
};

export const useSheetSelection = (options: SheetSelectionOptions): SheetSelection => {
  const current = computed((): NuiSpreadsheetSelection | undefined => {
    const cells = options.cells();
    const position = options.formula.active.value;

    if (cells === undefined || position === undefined) {
      return undefined;
    }

    const active = cells.cellOf(position.row, position.col);
    const ranges = options.formula.ranges.value.map((range) => lineRange(cells, range));

    return { active, ranges: ranges.length === 0 ? [cellRange(active)] : ranges };
  });

  const select = (next: NuiSpreadsheetSelection): void => {
    const cells = options.cells();

    if (cells === undefined) {
      return;
    }
    options.table.value?.focusCell(positionOf(cells, next.active));
    options.formula.ranges.value = tableRangesOf(cells, next);
  };

  const open = (next: NuiSpreadsheetSelection | undefined): void => {
    const cells = options.cells();

    if (next === undefined || cells === undefined) {
      return;
    }
    options.formula.active.value = positionOf(cells, next.active);
    options.formula.ranges.value = tableRangesOf(cells, next);
  };

  watch(current, (value) => {
    if (selectionKey(value) === selectionKey(options.model.value)) {
      return;
    }

    options.model.value = value;
  });

  watch(options.model, (value) => {
    if (value === undefined || selectionKey(value) === selectionKey(current.value)) {
      return;
    }

    select(value);
  });

  open(options.model.value);

  return { current, select };
};

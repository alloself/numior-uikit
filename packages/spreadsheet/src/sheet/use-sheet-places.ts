import type { NuiTableCellPosition, NuiTableExposed, NuiTableRange } from '@numior/table';
import { mapCell, mapCellNear, mapRange, type CellAddress, type LineChange } from '../core';
import {
  NuiSpreadsheetRefusalReason,
  type SheetCells,
  type SheetHeldCell,
  type SheetHeldRange,
  type SheetHeldView,
  type SheetHold,
  type SheetPlaces,
  type SheetPlacesOptions,
} from './sheet.types';

const heldCell = (cells: SheetCells, position: NuiTableCellPosition): SheetHeldCell => ({
  line: { row: cells.rowAt(position.row), col: cells.colAt(position.col) },
  position: { row: position.row, col: position.col },
});

const heldRange = (cells: SheetCells, { from, to }: NuiTableRange): SheetHeldRange => ({
  lines: {
    top: cells.rowAt(Math.min(from.row, to.row)),
    left: cells.colAt(Math.min(from.col, to.col)),
    bottom: cells.rowAt(Math.max(from.row, to.row)),
    right: cells.colAt(Math.max(from.col, to.col)),
  },
  up: from.row > to.row,
  back: from.col > to.col,
});

const heldView = (cells: SheetCells, table: NuiTableExposed | null): SheetHeldView | undefined => {
  const anchor = table?.scrollAnchor();
  const scroll = table?.scrollPosition();

  if (anchor === undefined || scroll === undefined) {
    return undefined;
  }

  const row = scroll.top > 0 ? cells.rowAt(anchor.row) : undefined;
  const col = scroll.left !== 0 && anchor.col !== undefined ? cells.colAt(anchor.col) : undefined;

  return row === undefined && col === undefined ? undefined : { anchor, row, col };
};

const near = (cells: SheetCells, cell: CellAddress): NuiTableCellPosition => ({
  row: cells.rowNear(cell.row),
  col: cells.colNear(cell.col),
});

const shownAt = (cells: SheetCells, cell: CellAddress): NuiTableCellPosition | undefined => {
  const position = near(cells, cell);

  return cells.rowAt(position.row) === cell.row && cells.colAt(position.col) === cell.col
    ? position
    : undefined;
};

const sameSpot = (left: NuiTableCellPosition, right: NuiTableCellPosition): boolean =>
  left.row === right.row && left.col === right.col;

const sameRange = (left: NuiTableRange | undefined, right: NuiTableRange): boolean =>
  left !== undefined && sameSpot(left.from, right.from) && sameSpot(left.to, right.to);

const rangeAfter = (
  cells: SheetCells,
  held: SheetHeldRange,
  lines: readonly LineChange[],
  sheet: string,
): NuiTableRange | undefined => {
  const moved = mapRange(lines, sheet, held.lines);

  if (moved === undefined) {
    return undefined;
  }
  const start = near(cells, { row: moved.top, col: moved.left });
  const end = near(cells, { row: moved.bottom, col: moved.right });

  return {
    from: { row: held.up ? end.row : start.row, col: held.back ? end.col : start.col },
    to: { row: held.up ? start.row : end.row, col: held.back ? start.col : end.col },
  };
};

export const useSheetPlaces = (options: SheetPlacesOptions): SheetPlaces => {
  const hold = (): SheetHold | undefined => {
    const cells = options.cells();
    const active = options.formula.active.value;
    const draft = options.editing.draft.value;

    return cells === undefined
      ? undefined
      : {
          cells,
          active: active === undefined ? undefined : heldCell(cells, active),
          draft: draft === undefined ? undefined : heldCell(cells, draft),
          ranges: options.formula.ranges.value.map((range) => heldRange(cells, range)),
          view: heldView(cells, options.table.value),
        };
  };

  const carryView = (
    cells: SheetCells,
    held: SheetHeldView,
    lines: readonly LineChange[],
    sheet: string,
  ): void => {
    const { anchor } = held;

    const moved = mapCellNear(lines, sheet, {
      row: held.row ?? cells.rowAt(anchor.row),
      col: held.col ?? (anchor.col === undefined ? 0 : cells.colAt(anchor.col)),
    });

    const row = held.row === undefined ? anchor.row : cells.rowNear(moved.row);
    const col = held.col === undefined ? anchor.col : cells.colNear(moved.col);

    if (row === anchor.row && col === anchor.col) {
      return;
    }

    options.table.value?.scrollToAnchor({ ...anchor, row, col });
  };

  const lose = (): void => {
    options.table.value?.cancelEdit();
    options.refuse(NuiSpreadsheetRefusalReason.CellGone, options.messages.value.cellGone);
  };

  const carryDraft = (
    cells: SheetCells,
    held: SheetHeldCell,
    line: CellAddress | undefined,
  ): boolean => {
    const next = line === undefined ? undefined : shownAt(cells, line);

    if (next === undefined) {
      lose();
      return false;
    }
    if (sameSpot(next, held.position)) {
      return true;
    }

    options.editing.moveDraft(next);

    if (options.table.value?.moveActive(next) === true) {
      return true;
    }

    lose();
    return false;
  };

  const carryActive = (cells: SheetCells, held: SheetHeldCell, line: CellAddress): void => {
    const next = near(cells, line);

    if (sameSpot(next, held.position)) {
      return;
    }

    options.table.value?.moveActive(next);
  };

  const carryRanges = (
    cells: SheetCells,
    held: readonly SheetHeldRange[],
    lines: readonly LineChange[],
    sheet: string,
  ): void => {
    const now = options.formula.ranges.value;

    const next = held.reduce<NuiTableRange[]>((moved, range) => {
      const after = rangeAfter(cells, range, lines, sheet);

      if (after !== undefined) {
        moved.push(after);
      }
      return moved;
    }, []);

    if (next.length === now.length && next.every((range, index) => sameRange(now[index], range))) {
      return;
    }

    options.formula.ranges.value = next;
  };

  const restore = (held: SheetHold | undefined, lines: readonly LineChange[]): void => {
    const cells = options.cells();
    const sheet = options.sheet();

    if (held === undefined || cells === undefined || sheet === undefined || cells === held.cells) {
      return;
    }
    if (held.view !== undefined) {
      carryView(cells, held.view, lines, sheet.name);
    }

    const edited =
      held.draft !== undefined &&
      carryDraft(cells, held.draft, mapCell(lines, sheet.name, held.draft.line));

    if (!edited && held.active !== undefined) {
      carryActive(cells, held.active, mapCellNear(lines, sheet.name, held.active.line));
    }

    carryRanges(cells, held.ranges, lines, sheet.name);
  };

  return { hold, restore };
};

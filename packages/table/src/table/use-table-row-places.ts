import type { TableNodeId } from '../engine';
import type {
  NuiTableCellPosition,
  NuiTableRange,
  TableHeldCell,
  TableHeldPlaces,
  TableHeldRange,
  TableRowPlaces,
  TableRowPlacesOptions,
} from './table.types';

const sameSpot = (left: NuiTableCellPosition, right: NuiTableCellPosition | undefined): boolean =>
  right !== undefined && left.row === right.row && left.col === right.col;

const heldRows = <T>(held: TableHeldPlaces<T>): T[] => {
  const cell = held.editing ?? held.active;

  return held.ranges.reduce<T[]>(
    (rows, range) => {
      rows.push(range.from.row, range.to.row);
      return rows;
    },
    cell === undefined ? [] : [cell.row],
  );
};

const placeIn = <T>(
  found: ReadonlyMap<T, number>,
  held: TableHeldCell<T>,
): NuiTableCellPosition | undefined => {
  const row = found.get(held.row);

  return row === undefined ? undefined : { row, col: held.col };
};

export const nodeIdsOf = <T>(
  wanted: readonly T[],
  rows: readonly T[],
  keyOf: ((row: T) => TableNodeId) | undefined,
): Map<TableNodeId, T> => {
  if (keyOf !== undefined) {
    return new Map(wanted.map((row) => [keyOf(row), row]));
  }
  const set = new Set(wanted);

  return rows.reduce((ids, row, index) => {
    if (set.has(row)) {
      ids.set(index, row);
    }
    return ids;
  }, new Map<TableNodeId, T>());
};

export const useTableRowPlaces = <T>(options: TableRowPlacesOptions<T>): TableRowPlaces<T> => {
  const heldAt = (position: NuiTableCellPosition | undefined): TableHeldCell<T> | undefined => {
    const row = position === undefined ? undefined : options.rowAt(position.row);

    return row === undefined || position === undefined ? undefined : { row, col: position.col };
  };

  const hold = (): TableHeldPlaces<T> => ({
    active: heldAt(options.active()),
    editing: options.editing(),
    ranges: options.ranges().reduce<TableHeldRange<T>[]>((held, range) => {
      const from = heldAt(range.from);
      const to = heldAt(range.to);

      if (from !== undefined && to !== undefined) {
        held.push({ from, to });
      }
      return held;
    }, []),
  });

  const carryEditor = (found: ReadonlyMap<T, number>, held: TableHeldCell<T>): void => {
    const next = placeIn(found, held);

    if (next !== undefined && options.move(next)) {
      return;
    }

    options.drop(held);
  };

  const carryActive = (found: ReadonlyMap<T, number>, held: TableHeldCell<T> | undefined): void => {
    const next = held === undefined ? undefined : placeIn(found, held);

    if (next === undefined || sameSpot(next, options.active())) {
      return;
    }

    options.move(next);
  };

  const carryRanges = (found: ReadonlyMap<T, number>, held: readonly TableHeldRange<T>[]): void => {
    const now = options.ranges();

    const next = held.reduce<NuiTableRange[]>((moved, range) => {
      const from = placeIn(found, range.from);
      const to = placeIn(found, range.to);

      if (from !== undefined && to !== undefined) {
        moved.push({ from, to });
      }
      return moved;
    }, []);

    const same =
      next.length === now.length &&
      next.every(
        (range, index) =>
          sameSpot(range.from, now[index]?.from) && sameSpot(range.to, now[index]?.to),
      );

    if (same) {
      return;
    }

    options.select(next);
  };

  const restore = (held: TableHeldPlaces<T>): void => {
    const rows = heldRows(held);
    const found = rows.length === 0 ? new Map<T, number>() : options.locate(rows);

    if (held.editing === undefined) {
      carryActive(found, held.active);
    } else {
      carryEditor(found, held.editing);
    }

    carryRanges(found, held.ranges);
  };

  return { hold, restore };
};

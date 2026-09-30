import type { ComputedRef } from 'vue';
import { boxOf, type RangeBox } from './table-ranges';
import { createCommandStack } from './table-commands';
import type { NuiTableMessages } from './table.messages';
import type {
  NuiTableCellValue,
  NuiTableEdit,
  NuiTableEditEvent,
  NuiTableRanges,
  TableCellPosition,
} from './table.types';

export interface TableEditingOptions<T> {
  readonly enabled: () => boolean;
  readonly ranges: () => NuiTableRanges;
  readonly cell: () => TableCellPosition | undefined;
  readonly rowAt: (position: number) => T | undefined;
  readonly keyAt: (col: number) => string | undefined;
  readonly editable: (row: T, key: string) => boolean;
  readonly valueOf: (row: T, key: string) => NuiTableCellValue;
  readonly resolve: (row: T) => T | undefined;
  readonly limit: () => number;
  readonly copy: () => Promise<boolean>;
  readonly emit: (event: NuiTableEditEvent<T>) => void;
  readonly applied: (keys: readonly string[]) => void;
  readonly messages: ComputedRef<NuiTableMessages>;
  readonly announce: (text: string) => void;
}

export interface TableEditing {
  clearable(): boolean;
  clear(): boolean;
  cut(): Promise<boolean>;
  undo(): boolean;
  redo(): boolean;
  reset(): void;
  onKeydown(event: KeyboardEvent): boolean;
}

type ClearKind = 'clear' | 'cut';

interface TableEditCommand<T> {
  readonly kind: ClearKind;
  readonly changes: readonly NuiTableEdit<T>[];
}

interface TableEditCell<T> {
  readonly row: T;
  readonly key: string;
}

const HISTORY = 100;

const isCellTarget = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement && target.matches('.nui-table__cell');

const isKey = (event: KeyboardEvent, code: string, key: string): boolean =>
  event.code === code || event.key.toLowerCase() === key;

const keysOf = <T>(changes: readonly NuiTableEdit<T>[]): string[] => [
  ...new Set(changes.map((change) => change.key)),
];

const areaOf = (ranges: NuiTableRanges): number =>
  ranges.reduce((sum, range) => {
    const box = boxOf(range);

    return sum + (box.bottom - box.top + 1) * (box.end - box.start + 1);
  }, 0);

export const useTableEditing = <T>(options: TableEditingOptions<T>): TableEditing => {
  const history = createCommandStack<TableEditCommand<T>>(HISTORY);

  const targets = (): NuiTableRanges => {
    const ranges = options.ranges();
    const cell = options.cell();

    if (ranges.length > 0) {
      return ranges;
    }
    return cell === undefined ? [] : [{ from: cell, to: cell }];
  };

  const visitRow = (
    position: number,
    box: RangeBox,
    visit: (cell: TableEditCell<T>) => boolean,
  ): boolean => {
    const row = options.rowAt(position);

    if (row === undefined) {
      return false;
    }
    for (let col = box.start; col <= box.end; col += 1) {
      const key = options.keyAt(col);

      if (key !== undefined && options.editable(row, key) && visit({ row, key })) {
        return true;
      }
    }
    return false;
  };

  const visitCells = (
    ranges: NuiTableRanges,
    visit: (cell: TableEditCell<T>) => boolean,
  ): boolean =>
    ranges.some((range) => {
      const box = boxOf(range);

      for (let position = box.top; position <= box.bottom; position += 1) {
        if (visitRow(position, box, visit)) {
          return true;
        }
      }
      return false;
    });

  const cellsIn = (ranges: NuiTableRanges): TableEditCell<T>[] => {
    const cells: TableEditCell<T>[] = [];

    visitCells(ranges, (cell) => {
      cells.push(cell);
      return false;
    });

    return cells;
  };

  const hasCells = (ranges: NuiTableRanges): boolean => visitCells(ranges, () => true);

  const withinLimit = (ranges: NuiTableRanges): boolean => {
    const count = areaOf(ranges);
    const limit = options.limit();

    if (count > limit) {
      options.announce(options.messages.value.editLimit({ count, limit }));
      return false;
    }
    return true;
  };

  const record = (kind: ClearKind, changes: readonly NuiTableEdit<T>[]): void => {
    if (changes.length === 0) {
      return;
    }
    options.emit({ kind, changes });
    history.push({ kind, changes });
    options.applied(keysOf(changes));
  };

  const clearCells = (kind: ClearKind): boolean => {
    const ranges = targets();

    if (!withinLimit(ranges)) {
      return false;
    }
    const cells = cellsIn(ranges);

    if (cells.length === 0) {
      options.announce(options.messages.value.readOnly);
      return false;
    }

    const changes = cells.flatMap(({ row, key }): NuiTableEdit<T>[] => {
      const previous = options.valueOf(row, key);

      return previous === null || previous === '' ? [] : [{ row, key, value: null, previous }];
    });

    record(kind, changes);

    const texts = options.messages.value;
    const done = kind === 'cut' ? texts.cutDone : texts.cleared;

    options.announce(done({ count: changes.length }));
    return true;
  };

  const replay = (changes: readonly NuiTableEdit<T>[], kind: 'undo' | 'redo'): number => {
    const resolved = changes.flatMap((change): NuiTableEdit<T>[] => {
      const row = options.resolve(change.row);

      return row === undefined ? [] : [{ ...change, row }];
    });

    if (resolved.length > 0) {
      options.emit({ kind, changes: resolved });
      options.applied(keysOf(resolved));
    }
    return resolved.length;
  };

  const undo = (): boolean => {
    const command = history.undo();

    if (command === undefined) {
      return false;
    }

    const reverted = command.changes
      .map((change) => ({ ...change, value: change.previous, previous: change.value }))
      .toReversed();

    options.announce(options.messages.value.undone({ count: replay(reverted, 'undo') }));
    return true;
  };

  const redo = (): boolean => {
    const command = history.redo();

    if (command === undefined) {
      return false;
    }
    options.announce(options.messages.value.redone({ count: replay(command.changes, 'redo') }));
    return true;
  };

  const cut = async (): Promise<boolean> => {
    const ranges = targets();

    if (!withinLimit(ranges)) {
      return false;
    }
    if (!hasCells(ranges)) {
      options.announce(options.messages.value.readOnly);
      return false;
    }
    return (await options.copy()) && clearCells('cut');
  };

  const onModified = (event: KeyboardEvent): boolean => {
    if (isKey(event, 'KeyX', 'x') && !event.shiftKey) {
      event.preventDefault();
      void cut();
      return true;
    }
    if (isKey(event, 'KeyZ', 'z')) {
      event.preventDefault();

      if (event.shiftKey) {
        redo();
      } else {
        undo();
      }
      return true;
    }
    if (isKey(event, 'KeyY', 'y') && !event.shiftKey) {
      event.preventDefault();
      redo();
      return true;
    }
    return false;
  };

  return {
    clearable: () => hasCells(targets()),
    clear: () => clearCells('clear'),
    cut,
    undo,
    redo,
    reset: () => {
      history.clear();
    },
    onKeydown: (event) => {
      if (!options.enabled() || event.altKey || !isCellTarget(event.target)) {
        return false;
      }
      if (event.ctrlKey || event.metaKey) {
        return onModified(event);
      }
      if (!event.shiftKey && (event.key === 'Delete' || event.key === 'Backspace')) {
        event.preventDefault();
        clearCells('clear');
        return true;
      }
      return false;
    },
  };
};

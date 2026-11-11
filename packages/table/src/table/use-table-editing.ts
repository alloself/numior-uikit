import type { ComputedRef } from 'vue';
import { parseTsv } from './table-clipboard';
import { createCommandStack } from './table-commands';
import { instantOf } from './table-format';
import { planPaste, type PasteCell } from './table-paste';
import { boxOf, type RangeBounds, type RangeBox } from './table-ranges';
import type { NuiTableMessages } from './table.messages';
import {
  CellOutcomeMark,
  ClearKind,
  NuiTableEditKind,
  ParsedCellKind,
  PastePlanKind,
  type NuiTableCellValue,
  type NuiTableClipboardBlock,
  type NuiTableClipboardData,
  type NuiTableCommandSink,
  type NuiTableEdit,
  type NuiTableEditEvent,
  type NuiTablePasteScope,
  type NuiTableRanges,
  type ParsedCell,
  type NuiTableCellPosition,
} from './table.types';
import { Key } from '@numior/primitives';

export interface TableEditingOptions<T> {
  readonly enabled: () => boolean;
  readonly ranges: () => NuiTableRanges;
  readonly cell: () => NuiTableCellPosition | undefined;
  readonly rowAt: (position: number) => T | undefined;
  readonly keyAt: (col: number) => string | undefined;
  readonly editable: (row: T, key: string) => boolean;
  readonly valueOf: (row: T, key: string) => NuiTableCellValue;
  readonly resolve: (row: T) => T | undefined;
  readonly limit: () => number;
  readonly copy: () => Promise<boolean>;
  readonly emit: (event: NuiTableEditEvent<T>) => void;
  readonly sink: () => NuiTableCommandSink<T> | undefined;
  readonly keys: () => readonly string[];
  readonly applied: (keys: readonly string[], rows?: readonly T[]) => void;
  readonly parse: (row: T, key: string, text: string) => ParsedCell;
  readonly readBlock: (
    data: NuiTableClipboardData,
    target: NuiTableCellPosition,
  ) => NuiTableClipboardBlock | undefined;
  readonly pasteHook: (
    data: NuiTableClipboardData,
    scope: NuiTablePasteScope,
  ) => NuiTableRanges | undefined;
  readonly cutHook: (ranges: NuiTableRanges) => boolean;
  readonly check: (row: T, key: string, value: NuiTableCellValue) => string | undefined;
  readonly bounds: () => RangeBounds;
  readonly select: (ranges: NuiTableRanges) => void;
  readonly readable: () => boolean;
  readonly read: () => Promise<string | null>;
  readonly owns: (element: Element | null) => boolean;
  readonly messages: ComputedRef<NuiTableMessages>;
  readonly announce: (text: string) => void;
}

export interface TableEditing<T> {
  clearable(): boolean;
  clear(): boolean;
  cut(): Promise<boolean>;
  undo(): boolean;
  redo(): boolean;
  reset(): void;
  pastable(): boolean;
  paste(data: NuiTableClipboardData): boolean;
  pasteFromClipboard(): Promise<boolean>;
  onPaste(event: ClipboardEvent): void;
  onKeydown(event: KeyboardEvent): boolean;
  commitCell(row: T, key: string, value: NuiTableCellValue): boolean;
  fillCells(value: NuiTableCellValue, accepts: (key: string) => boolean): boolean;
}

type EditKind = ClearKind | 'paste' | 'edit';

type CellOutcome<T> = NuiTableEdit<T> | (typeof CellOutcomeMark)[keyof typeof CellOutcomeMark];

interface TableEditCommand<T> {
  readonly kind: EditKind;
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

const rowsOf = <T>(changes: readonly NuiTableEdit<T>[]): T[] => changes.map((change) => change.row);

const sameValue = (a: NuiTableCellValue, b: NuiTableCellValue): boolean =>
  a instanceof Date || b instanceof Date ? instantOf(a) === instantOf(b) : a === b;

const isChange = <T>(outcome: CellOutcome<T>): outcome is NuiTableEdit<T> =>
  typeof outcome !== 'string';

const skippedOf = <T>(outcomes: readonly CellOutcome<T>[]): number =>
  outcomes.reduce((count, outcome) => count + Number(outcome === CellOutcomeMark.Skip), 0);

const areaOf = (ranges: NuiTableRanges): number =>
  ranges.reduce((sum, range) => {
    const box = boxOf(range);

    return sum + (box.bottom - box.top + 1) * (box.end - box.start + 1);
  }, 0);

export const useTableEditing = <T>(options: TableEditingOptions<T>): TableEditing<T> => {
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

  const record = (kind: EditKind, changes: readonly NuiTableEdit<T>[]): void => {
    if (changes.length === 0) {
      return;
    }
    const sink = options.sink();

    options.emit({ kind, changes });

    if (sink === undefined) {
      history.push({ kind, changes });
    } else {
      sink.push({ kind, changes });
    }
    options.applied(keysOf(changes), rowsOf(changes));
  };

  const clearOutcome = ({ row, key }: TableEditCell<T>): CellOutcome<T> => {
    const previous = options.valueOf(row, key);

    if (previous === null || previous === '') {
      return 'same';
    }
    return options.check(row, key, null) === undefined
      ? { row, key, value: null, previous }
      : 'skip';
  };

  const fillOutcome = (
    { row, key }: TableEditCell<T>,
    value: NuiTableCellValue,
    accepts: (key: string) => boolean,
  ): CellOutcome<T> => {
    if (!accepts(key) || options.check(row, key, value) !== undefined) {
      return 'skip';
    }
    const previous = options.valueOf(row, key);

    return sameValue(previous, value) ? 'same' : { row, key, value, previous };
  };

  const fillCells = (value: NuiTableCellValue, accepts: (key: string) => boolean): boolean => {
    const ranges = targets();

    if (!withinLimit(ranges)) {
      return false;
    }
    const outcomes = cellsIn(ranges).map((cell) => fillOutcome(cell, value, accepts));
    const skipped = skippedOf(outcomes);

    record('edit', outcomes.filter(isChange));
    options.announce(options.messages.value.filled({ count: outcomes.length - skipped, skipped }));
    return true;
  };

  const announceCleared = (kind: ClearKind, count: number, skipped: number): void => {
    const texts = options.messages.value;
    const done = kind === ClearKind.Cut ? texts.cutDone : texts.cleared;

    options.announce(done({ count, skipped }));
  };

  const clearOutside = (
    clear: (ranges: NuiTableRanges) => number,
    ranges: NuiTableRanges,
    kind: ClearKind,
  ): boolean => {
    const count = clear(ranges);

    options.applied(options.keys());
    announceCleared(kind, count, 0);
    return true;
  };

  const clearCells = (kind: ClearKind): boolean => {
    const ranges = targets();
    const clear = options.sink()?.clear;

    if (!withinLimit(ranges)) {
      return false;
    }
    if (clear !== undefined) {
      return clearOutside(clear, ranges, kind);
    }
    const cells = cellsIn(ranges);

    if (cells.length === 0) {
      options.announce(options.messages.value.readOnly);
      return false;
    }

    const outcomes = cells.map(clearOutcome);
    const changes = outcomes.filter(isChange);

    record(kind, changes);
    announceCleared(kind, changes.length, skippedOf(outcomes));
    return true;
  };

  const replay = (changes: readonly NuiTableEdit<T>[], kind: 'undo' | 'redo'): number => {
    const resolved = changes.flatMap((change): NuiTableEdit<T>[] => {
      const row = options.resolve(change.row);

      return row === undefined ? [] : [{ ...change, row }];
    });

    if (resolved.length > 0) {
      options.emit({ kind, changes: resolved });
      options.applied(keysOf(resolved), rowsOf(resolved));
    }
    return resolved.length;
  };

  const replayOutside = (sink: NuiTableCommandSink<T>, kind: 'undo' | 'redo'): boolean => {
    const count = kind === NuiTableEditKind.Undo ? sink.undo() : sink.redo();
    const texts = options.messages.value;

    if (count === 0) {
      return false;
    }
    options.applied(options.keys());

    options.announce(
      kind === NuiTableEditKind.Undo ? texts.undone({ count }) : texts.redone({ count }),
    );

    return true;
  };

  const undo = (): boolean => {
    const sink = options.sink();

    if (sink !== undefined) {
      return replayOutside(sink, 'undo');
    }
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
    const sink = options.sink();

    if (sink !== undefined) {
      return replayOutside(sink, 'redo');
    }
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
    if (!(await options.copy())) {
      return false;
    }
    if (options.cutHook(ranges)) {
      announceCleared(ClearKind.Cut, areaOf(ranges), 0);
      return true;
    }
    return clearCells('cut');
  };

  const outcomeOf = (cell: PasteCell): CellOutcome<T> => {
    const row = options.rowAt(cell.row);
    const key = options.keyAt(cell.col);

    if (row === undefined || key === undefined || !options.editable(row, key)) {
      return 'skip';
    }
    const parsed = options.parse(row, key, cell.text);

    if (
      parsed.kind === ParsedCellKind.Invalid ||
      options.check(row, key, parsed.value) !== undefined
    ) {
      return 'skip';
    }
    const previous = options.valueOf(row, key);

    return sameValue(previous, parsed.value) ? 'same' : { row, key, value: parsed.value, previous };
  };

  const pasteCells = (cells: readonly PasteCell[], area: NuiTableRanges): boolean => {
    const outcomes = cells.map(outcomeOf);
    const skipped = skippedOf(outcomes);

    record('paste', outcomes.filter(isChange));

    if (area.length > 0) {
      options.select(area);
    }
    options.announce(options.messages.value.pasted({ count: cells.length - skipped, skipped }));
    return true;
  };

  const targetCell = (): NuiTableCellPosition | undefined => {
    const last = options.ranges().at(-1);

    if (last === undefined) {
      return options.cell();
    }
    const box = boxOf(last);

    return { row: box.top, col: box.start };
  };

  const blockOf = (data: NuiTableClipboardData): NuiTableClipboardBlock => {
    const target = targetCell();
    const block = target === undefined ? undefined : options.readBlock(data, target);

    return block ?? parseTsv(data.text);
  };

  const pasteOutside = (data: NuiTableClipboardData): boolean => {
    const target = targetCell();

    const area =
      target === undefined ? undefined : options.pasteHook(data, { ranges: targets(), target });

    if (area === undefined) {
      return false;
    }
    if (area.length > 0) {
      options.select(area);
    }
    options.applied(options.keys());
    options.announce(options.messages.value.pasted({ count: areaOf(area), skipped: 0 }));
    return true;
  };

  const paste = (data: NuiTableClipboardData): boolean => {
    const limit = options.limit();

    if (pasteOutside(data)) {
      return true;
    }

    const plan = planPaste(
      blockOf(data),
      options.ranges(),
      options.cell(),
      options.bounds(),
      limit,
    );

    switch (plan.kind) {
      case PastePlanKind.None:
        return false;
      case PastePlanKind.Limit:
        options.announce(options.messages.value.editLimit({ count: plan.count, limit }));
        return false;
      case PastePlanKind.Cells:
        return pasteCells(plan.cells, plan.area === undefined ? [] : [plan.area]);
    }
  };

  const pasteFromClipboard = async (): Promise<boolean> => {
    const text = await options.read();

    if (text === null) {
      options.announce(options.messages.value.pasteDenied);
      return false;
    }
    return paste({ text });
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
    pastable: () => options.enabled() && options.readable(),
    paste: (data) => options.enabled() && paste(data),
    pasteFromClipboard,
    onPaste: (event) => {
      const text = event.clipboardData?.getData('text/plain') ?? '';
      const html = event.clipboardData?.getData('text/html') ?? '';

      if (!options.enabled() || text === '' || !options.owns(document.activeElement)) {
        return;
      }
      event.preventDefault();
      paste(html === '' ? { text } : { text, html });
    },
    onKeydown: (event) => {
      if (!options.enabled() || event.altKey || !isCellTarget(event.target)) {
        return false;
      }
      if (event.ctrlKey || event.metaKey) {
        return onModified(event);
      }
      if (!event.shiftKey && (event.key === Key.Delete || event.key === Key.Backspace)) {
        event.preventDefault();
        clearCells('clear');
        return true;
      }
      return false;
    },
    commitCell: (row, key, value) => {
      const previous = options.valueOf(row, key);

      if (sameValue(previous, value)) {
        return false;
      }
      record('edit', [{ row, key, value, previous }]);
      return true;
    },
    fillCells,
  };
};

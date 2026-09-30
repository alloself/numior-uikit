import {
  ref,
  shallowRef,
  watch,
  type ComputedRef,
  type Ref,
  type ShallowRef,
  type WatchSource,
} from 'vue';
import { builtinEditor } from './table-editors';
import type { RangeBounds } from './table-ranges';
import type { NuiTableMessages } from './table.messages';
import type {
  NuiTableCellValue,
  NuiTableColumn,
  TableCellPosition,
  TableEditorMove,
  TableEditSession,
} from './table.types';

export interface TableCellEditorOptions<T> {
  readonly enabled: () => boolean;
  readonly cell: () => TableCellPosition | undefined;
  readonly rowAt: (position: number) => T | undefined;
  readonly keyAt: (col: number) => string | undefined;
  readonly columnAt: (key: string) => NuiTableColumn<T>;
  readonly editable: (row: T, key: string) => boolean;
  readonly valueOf: (row: T, key: string) => NuiTableCellValue;
  readonly check: (row: T, key: string, value: NuiTableCellValue) => string | undefined;
  readonly save: (row: T, key: string, value: NuiTableCellValue) => void;
  readonly bounds: () => RangeBounds;
  readonly locate: (target: EventTarget | null) => TableCellPosition | undefined;
  readonly focus: (position: TableCellPosition) => void;
  readonly locale: () => string;
  readonly resetOn: WatchSource[];
  readonly messages: ComputedRef<NuiTableMessages>;
  readonly announce: (text: string) => void;
}

export interface TableCellEditor<T> {
  readonly session: Readonly<ShallowRef<TableEditSession<T> | undefined>>;
  readonly draft: Readonly<ShallowRef<unknown>>;
  readonly error: Readonly<Ref<string | undefined>>;
  input(value: unknown): void;
  commit(move: TableEditorMove): boolean;
  cancel(): void;
  onKeydown(event: KeyboardEvent): boolean;
  onClick(event: MouseEvent): void;
  onDblclick(event: MouseEvent): void;
  onPointerup(event: PointerEvent): void;
}

interface TableTap {
  readonly time: number;
  readonly row: number;
  readonly col: number;
}

const DOUBLE_TAP = 300;
const TAP_GRACE = 500;

const isCellTarget = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement && target.matches('.nui-table__cell');

const isPlain = (event: KeyboardEvent): boolean =>
  !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey;

const typedOf = (event: KeyboardEvent): string | undefined => {
  const chord = event.ctrlKey || event.altKey;
  const printable = [...event.key].length === 1 && event.key !== ' ';

  return printable && !event.metaKey && (!chord || event.getModifierState('AltGraph'))
    ? event.key
    : undefined;
};

const stepOf = (
  from: TableCellPosition,
  move: TableEditorMove,
  bounds: RangeBounds,
): TableCellPosition => {
  switch (move) {
    case 'down':
      return { row: Math.min(from.row + 1, bounds.rows - 1), col: from.col };
    case 'up':
      return { row: Math.max(from.row - 1, 0), col: from.col };
    case 'next':
      return { row: from.row, col: Math.min(from.col + 1, bounds.cols - 1) };
    case 'previous':
      return { row: from.row, col: Math.max(from.col - 1, 0) };
    case 'blur':
      return from;
  }
};

const clampTo = (position: TableCellPosition, bounds: RangeBounds): TableCellPosition => ({
  row: Math.max(0, Math.min(position.row, bounds.rows - 1)),
  col: Math.max(0, Math.min(position.col, bounds.cols - 1)),
});

const doubled = (last: TableTap | undefined, next: TableTap): boolean =>
  last !== undefined &&
  last.row === next.row &&
  last.col === next.col &&
  next.time - last.time < DOUBLE_TAP;

export const useTableCellEditor = <T>(options: TableCellEditorOptions<T>): TableCellEditor<T> => {
  const session = shallowRef<TableEditSession<T>>();
  const draft = shallowRef<unknown>();
  const error = ref<string>();
  let tap: TableTap | undefined;
  let tapped = Number.NEGATIVE_INFINITY;
  let pointer = '';
  let strict = false;

  const close = (): void => {
    session.value = undefined;
    draft.value = undefined;
    error.value = undefined;
    strict = false;
  };

  const toggle = (row: T, key: string): boolean => {
    const next = options.valueOf(row, key) !== true;
    const failure = options.check(row, key, next);

    if (failure === undefined) {
      options.save(row, key, next);
    } else {
      options.announce(failure);
    }
    return true;
  };

  const open = (position: TableCellPosition, typed?: string): boolean => {
    const row = options.rowAt(position.row);
    const key = options.keyAt(position.col);

    if (row === undefined || key === undefined || !options.editable(row, key)) {
      return false;
    }
    const column = options.columnAt(key);

    if (column.type === 'boolean') {
      return typed === undefined && toggle(row, key);
    }
    const spec = builtinEditor(column, options.locale());

    session.value = { position, row, key, label: column.label, spec, typed };
    draft.value = spec.toControl(options.valueOf(row, key));
    error.value = undefined;
    strict = false;
    return true;
  };

  const commit = (move: TableEditorMove): boolean => {
    const current = session.value;

    if (current === undefined) {
      return true;
    }
    const value = current.spec.fromControl(draft.value);
    const failure = options.check(current.row, current.key, value);

    if (failure !== undefined && move !== 'blur') {
      error.value = failure;
      strict = true;
      options.announce(failure);
      return false;
    }
    close();

    if (failure === undefined) {
      options.save(current.row, current.key, value);
    } else {
      options.announce(options.messages.value.editDiscarded({ error: failure }));
    }
    if (move !== 'blur') {
      options.focus(stepOf(current.position, move, options.bounds()));
    }
    return true;
  };

  const cancel = (): void => {
    const current = session.value;

    if (current !== undefined) {
      close();
      options.focus(current.position);
    }
  };

  const input = (value: unknown): void => {
    const current = session.value;

    draft.value = value;

    if (current !== undefined && strict) {
      error.value = options.check(current.row, current.key, current.spec.fromControl(value));
    }
  };

  const onKeydown = (event: KeyboardEvent): boolean => {
    const cell = options.cell();

    if (
      !options.enabled() ||
      cell === undefined ||
      session.value !== undefined ||
      !isCellTarget(event.target)
    ) {
      return false;
    }
    if (event.key === 'F2' && isPlain(event)) {
      event.preventDefault();

      if (!open(cell)) {
        options.announce(options.messages.value.cellReadOnly);
      }
      return true;
    }
    const typed = event.key === 'Enter' ? undefined : typedOf(event);
    const opens = event.key === 'Enter' ? isPlain(event) : typed !== undefined;

    if (opens && open(cell, typed)) {
      event.preventDefault();
      return true;
    }
    return false;
  };

  const locate = (target: EventTarget | null): TableCellPosition | undefined =>
    options.enabled() && session.value === undefined ? options.locate(target) : undefined;

  const onDblclick = (event: MouseEvent): void => {
    const position = event.timeStamp - tapped < TAP_GRACE ? undefined : locate(event.target);

    if (position !== undefined) {
      open(position);
    }
  };

  const onClick = (event: MouseEvent): void => {
    const position = pointer === 'touch' ? locate(event.target) : undefined;
    const next = position === undefined ? undefined : { time: event.timeStamp, ...position };

    if (position !== undefined && next !== undefined && doubled(tap, next)) {
      tap = undefined;
      tapped = next.time;
      open(position);
    } else {
      tap = next;
    }
  };

  watch(options.resetOn, () => {
    const current = session.value;
    const bounds = options.bounds();

    close();

    if (current !== undefined && bounds.rows > 0) {
      options.focus(clampTo(current.position, bounds));
    }
  });

  watch(options.enabled, (on) => {
    if (!on) {
      close();
    }
  });

  return {
    session,
    draft,
    error,
    input,
    commit,
    cancel,
    onKeydown,
    onClick,
    onDblclick,
    onPointerup: (event) => {
      pointer = event.pointerType;
    },
  };
};

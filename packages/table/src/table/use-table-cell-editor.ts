import { graphemesOf, Key, PointerType } from '@numior/primitives';
import {
  ref,
  shallowRef,
  watch,
  type ComputedRef,
  type Ref,
  type ShallowRef,
  type WatchSource,
} from 'vue';
import { stepCell } from './table-keys';
import type { RangeBounds } from './table-ranges';
import type { NuiTableMessages } from './table.messages';
import {
  NuiTableEditMode,
  NuiTableEditMove,
  ParsedCellKind,
  TableEditorPlanKind,
  TableOpeningKind,
  type NuiTableCellValue,
  type NuiTableDraft,
  type NuiTableEditRefusalReason,
  type TableCellEditorSpec,
  type TableCellPosition,
  type TableEditorPlan,
  type TableEditSession,
} from './table.types';

export interface TableCellEditorOptions<T> {
  readonly enabled: () => boolean;
  readonly cell: () => TableCellPosition | undefined;
  readonly rowAt: (position: number) => T | undefined;
  readonly keyAt: (col: number) => string | undefined;
  readonly labelOf: (key: string) => string;
  readonly editable: (row: T, key: string) => boolean;
  readonly valueOf: (row: T, key: string) => NuiTableCellValue;
  readonly plan: (row: T, key: string) => TableEditorPlan;
  readonly check: (row: T, key: string, value: NuiTableCellValue) => string | undefined;
  readonly leave: (from: TableCellPosition, move: NuiTableEditMove) => TableCellPosition;
  readonly invalid: () => string;
  readonly save: (row: T, key: string, value: NuiTableCellValue) => void;
  readonly fill: (key: string, value: NuiTableCellValue) => void;
  readonly share: (draft: NuiTableDraft | undefined) => void;
  readonly refuse: (row: T, key: string, reason: NuiTableEditRefusalReason) => void;
  readonly bounds: () => RangeBounds;
  readonly locate: (target: EventTarget | null) => TableCellPosition | undefined;
  readonly focus: (position: TableCellPosition) => void;
  readonly resetOn: WatchSource[];
  readonly messages: ComputedRef<NuiTableMessages>;
  readonly announce: (text: string) => void;
}

export interface TableCellEditor<T> {
  readonly session: Readonly<ShallowRef<TableEditSession<T> | undefined>>;
  readonly draft: Readonly<ShallowRef<unknown>>;
  readonly error: Readonly<Ref<string | undefined>>;
  current(): NuiTableDraft | undefined;
  input(value: unknown): void;
  receive(next: NuiTableDraft | undefined): void;
  start(mode: NuiTableEditMode, focus: boolean): boolean;
  attach(flush: () => void): () => void;
  commit(move: NuiTableEditMove): boolean;
  cancel(): void;
  onKeydown(event: KeyboardEvent): boolean;
  onFocusin(event: FocusEvent): void;
  onClick(event: MouseEvent): void;
  onDblclick(event: MouseEvent): void;
  onPointerup(event: PointerEvent): void;
}

interface TableTap {
  readonly time: number;
  readonly row: number;
  readonly col: number;
}

interface TableEditOutcome {
  readonly value: NuiTableCellValue;
  readonly failure: string | undefined;
}

interface TableEditTarget<T> {
  readonly position: TableCellPosition;
  readonly row: T;
  readonly key: string;
}

type TableOpening =
  | { readonly kind: typeof TableOpeningKind.Gesture }
  | { readonly kind: typeof TableOpeningKind.Typed; readonly text: string }
  | {
      readonly kind: typeof TableOpeningKind.Start;
      readonly mode: NuiTableEditMode;
      readonly focus: boolean;
    };

const DOUBLE_TAP = 300;
const TAP_GRACE = 500;
const GESTURE: TableOpening = { kind: 'gesture' };

const isCellTarget = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement && target.matches('.nui-table__cell');

const inEditor = (target: EventTarget | null): boolean =>
  target instanceof Element && target.closest('.nui-table__editor') !== null;

const isPlain = (event: KeyboardEvent): boolean =>
  !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey;

const typedOf = (event: KeyboardEvent): string | undefined => {
  const chord = event.ctrlKey || event.altKey;
  const printable = graphemesOf(event.key).length === 1 && event.key !== Key.Space;

  return printable && !event.metaKey && (!chord || event.getModifierState('AltGraph'))
    ? event.key
    : undefined;
};

const openingOf = (event: KeyboardEvent): TableOpening | undefined => {
  if (event.key === Key.Enter) {
    return isPlain(event) ? GESTURE : undefined;
  }
  const typed = typedOf(event);

  return typed === undefined ? undefined : { kind: 'typed', text: typed };
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
  const flushers = new Set<() => void>();
  let tap: TableTap | undefined;
  let tapped = Number.NEGATIVE_INFINITY;
  let pointer = '';
  let strict = false;

  const positioned = (value: unknown): NuiTableDraft | undefined => {
    const current = session.value;

    return current === undefined
      ? undefined
      : { row: current.position.row, col: current.position.col, key: current.key, value };
  };

  const setDraft = (value: unknown): void => {
    draft.value = value;
    options.share(positioned(value));
  };

  const close = (): void => {
    session.value = undefined;
    error.value = undefined;
    strict = false;
    setDraft(undefined);
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

  const begin = (
    target: TableEditTarget<T>,
    spec: TableCellEditorSpec,
    opening: TableOpening,
  ): void => {
    const blank =
      opening.kind === TableOpeningKind.Start && opening.mode === NuiTableEditMode.Replace;

    session.value = {
      ...target,
      label: options.labelOf(target.key),
      spec,
      typed: opening.kind === TableOpeningKind.Typed ? opening.text : undefined,
      passive: opening.kind === TableOpeningKind.Start && !opening.focus,
    };

    error.value = undefined;
    strict = false;
    setDraft(spec.toControl(blank ? null : options.valueOf(target.row, target.key)));
  };

  const open = (position: TableCellPosition, opening: TableOpening): boolean => {
    const row = options.rowAt(position.row);
    const key = options.keyAt(position.col);

    if (row === undefined || key === undefined || !options.editable(row, key)) {
      return false;
    }
    const plan = options.plan(row, key);

    switch (plan.kind) {
      case TableEditorPlanKind.Toggle:
        return opening.kind === TableOpeningKind.Gesture && toggle(row, key);
      case TableEditorPlanKind.Refused:
        options.refuse(row, key, plan.reason);
        return false;
      case TableEditorPlanKind.Editor:
        begin({ position, row, key }, plan.spec, opening);
        return true;
    }
  };

  const start = (mode: NuiTableEditMode, focus: boolean): boolean => {
    const cell = options.cell();

    if (session.value !== undefined) {
      return true;
    }
    if (!options.enabled() || cell === undefined) {
      return false;
    }
    const opened = open(cell, { kind: 'start', mode, focus });

    if (!opened) {
      options.announce(options.messages.value.cellReadOnly);
    }
    return opened;
  };

  const attach = (flush: () => void): (() => void) => {
    flushers.add(flush);

    return () => {
      flushers.delete(flush);
    };
  };

  const outcomeOf = (current: TableEditSession<T>, control: unknown): TableEditOutcome => {
    const parsed = current.spec.fromControl(control);

    return parsed.kind === ParsedCellKind.Invalid
      ? { value: null, failure: options.invalid() }
      : { value: parsed.value, failure: options.check(current.row, current.key, parsed.value) };
  };

  const store = (
    current: TableEditSession<T>,
    value: NuiTableCellValue,
    move: NuiTableEditMove,
  ): void => {
    if (move === NuiTableEditMove.Fill) {
      options.fill(current.key, value);
    } else {
      options.save(current.row, current.key, value);
    }
  };

  const commit = (move: NuiTableEditMove): boolean => {
    for (const flush of flushers) {
      flush();
    }
    const current = session.value;

    if (current === undefined) {
      return true;
    }
    const { value, failure } = outcomeOf(current, draft.value);

    if (failure !== undefined && move !== NuiTableEditMove.Blur) {
      error.value = failure;
      strict = true;
      options.announce(failure);
      return false;
    }
    close();

    if (failure === undefined) {
      store(current, value, move);
    } else {
      options.announce(options.messages.value.editDiscarded({ error: failure }));
    }
    if (move !== NuiTableEditMove.Blur) {
      options.focus(stepCell(options.leave(current.position, move), move, options.bounds()));
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

    setDraft(value);

    if (current !== undefined && strict) {
      error.value = outcomeOf(current, value).failure;
    }
  };

  const receive = (next: NuiTableDraft | undefined): void => {
    const at = session.value?.position;

    if (
      next !== undefined &&
      next.row === at?.row &&
      next.col === at.col &&
      next.value !== draft.value
    ) {
      input(next.value);
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
    if (event.key === Key.F2 && isPlain(event)) {
      event.preventDefault();

      if (!open(cell, GESTURE)) {
        options.announce(options.messages.value.cellReadOnly);
      }
      return true;
    }
    const opening = openingOf(event);

    if (opening !== undefined && open(cell, opening)) {
      event.preventDefault();
      return true;
    }
    return false;
  };

  const onFocusin = (event: FocusEvent): void => {
    if (session.value !== undefined && !inEditor(event.target) && !inEditor(event.relatedTarget)) {
      commit('blur');
    }
  };

  const locate = (target: EventTarget | null): TableCellPosition | undefined =>
    options.enabled() && session.value === undefined ? options.locate(target) : undefined;

  const onDblclick = (event: MouseEvent): void => {
    const position = event.timeStamp - tapped < TAP_GRACE ? undefined : locate(event.target);

    if (position !== undefined) {
      open(position, GESTURE);
    }
  };

  const onClick = (event: MouseEvent): void => {
    const position = pointer === PointerType.Touch ? locate(event.target) : undefined;
    const next = position === undefined ? undefined : { time: event.timeStamp, ...position };

    if (position !== undefined && next !== undefined && doubled(tap, next)) {
      tap = undefined;
      tapped = next.time;
      open(position, GESTURE);
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
    current: () => positioned(draft.value),
    input,
    receive,
    start,
    attach,
    commit,
    cancel,
    onKeydown,
    onFocusin,
    onClick,
    onDblclick,
    onPointerup: (event) => {
      pointer = event.pointerType;
    },
  };
};

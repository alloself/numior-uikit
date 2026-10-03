import { onScopeDispose, ref, watch, type ComputedRef, type Ref, type WatchSource } from 'vue';
import { useEventListener } from '@vueuse/core';
import { useEdgeScroll, type EdgePoint } from '@numior/primitives';
import {
  allOf,
  boxOf,
  clampPosition,
  colsOf,
  cutRanges,
  inRanges,
  revealAxisOf,
  rowsOf,
  sameRanges,
  segmentsOf,
  stepCorner,
  tidyRanges,
  widenRange,
  withLast,
  type RangeBounds,
} from './table-ranges';
import { OWN_DATA_ROWS, OWN_SPANNING_CELLS } from './table-dom';
import type { TableEdgeOf } from './table-keys';
import { expandToMerges, leaveMerge, spansLines, type TableMergeIndex } from './table-merges';
import type { NuiTableMessages } from './table.messages';
import type {
  NuiTableRange,
  NuiTableRanges,
  TableCellPosition,
  TableRangeLines,
  TableRevealAxis,
  TableRowRanges,
} from './table.types';

export interface TableRangesOptions {
  readonly enabled: () => boolean;
  readonly lines: () => boolean;
  readonly ranges: Ref<NuiTableRanges>;
  readonly viewport: () => HTMLElement | null;
  readonly inside: (target: Node) => boolean;
  readonly bounds: () => RangeBounds;
  readonly offset: () => number;
  readonly headRows: () => number;
  readonly pinnedRows: () => number;
  readonly footRows: () => number;
  readonly rowSize: () => number;
  readonly pageRows: (row: number, forward: boolean) => number;
  readonly isRtl: () => boolean;
  readonly anchor: () => TableCellPosition | undefined;
  readonly cursor: () => TableCellPosition | undefined;
  readonly sorts: (col: number) => boolean;
  readonly merges: () => TableMergeIndex;
  readonly edge: TableEdgeOf;
  readonly focus: (position: TableCellPosition) => void;
  readonly reveal: (corner: TableCellPosition, axis: TableRevealAxis) => void;
  readonly resetOn: WatchSource[];
  readonly messages: ComputedRef<NuiTableMessages>;
  readonly announce: (text: string) => void;
}

export interface TableRanges {
  readonly dragging: Readonly<Ref<boolean>>;
  readonly deselected: Readonly<Ref<boolean>>;
  segmentsOf(row: number): TableRowRanges | undefined;
  contains(position: TableCellPosition): boolean;
  cellAt(target: EventTarget | null): TableCellPosition | undefined;
  cellAtPoint(x: number, y: number): TableCellPosition | undefined;
  onPointerdown(event: PointerEvent): void;
  onMousedown(event: MouseEvent): void;
  onClick(event: MouseEvent): void;
  onKeydown(event: KeyboardEvent): boolean;
  takeClick(): boolean;
  swallowClick(): void;
  clear(): void;
  replace(next: NuiTableRanges): void;
}

type SessionMode = 'plain' | 'extend' | 'add';

type SessionAction =
  | { readonly kind: 'shape' }
  | { readonly kind: 'remove'; readonly base: NuiTableRanges };

interface SessionStart {
  readonly from: TableCellPosition;
  readonly action: SessionAction;
  readonly lines: TableRangeLines;
}

type RangeOrigin =
  | {
      readonly kind: 'lines';
      readonly lines: TableRangeLines;
      readonly position: TableCellPosition;
    }
  | { readonly kind: 'all' };

interface RangeSession extends SessionStart {
  readonly pointerId: number;
  readonly x: number;
  readonly y: number;
}

interface Band {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
}

const THRESHOLD = 5;
const SHAPE: SessionAction = { kind: 'shape' };
const BODY_ROW = '.nui-table__body > .nui-table__row--body';
const START_ROW = `${BODY_ROW}:not(.nui-table__row--group)`;
const ROW_HEAD = `${START_ROW} > .nui-table__cell--rowhead`;
const HEAD_ROW = '.nui-table__header > .nui-table__row--head';
const COLUMN_HEAD = `${HEAD_ROW} > .nui-table__cell--data`;
const CORNER = `${HEAD_ROW} > .nui-table__cell--rowhead`;
const HANDLE = '.nui-table__resizer, .nui-table__grip';
const PINNED = ['nui-table__cell--pin-start', 'nui-table__cell--pin-end'];

const NAVIGATION = new Set([
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Home',
  'End',
  'PageUp',
  'PageDown',
]);

const INTERACTIVE =
  'button, a[href], input, select, textarea, label, [contenteditable="true"], .nui-table__toggle, .nui-table__editor';

const modeOf = (event: MouseEvent): SessionMode => {
  if (event.shiftKey) {
    return 'extend';
  }
  return event.ctrlKey || event.metaKey ? 'add' : 'plain';
};

const rowRect = (row: Element): DOMRect =>
  (row.querySelector(':scope > :not([rowspan])') ?? row).getBoundingClientRect();

const isPinned = (cell: Element): boolean => PINNED.some((name) => cell.classList.contains(name));

const within = (value: number, start: number, end: number): boolean =>
  value >= start && value < end;

const spanningAt = (viewport: Element, x: number, y: number): Element | undefined =>
  [...viewport.querySelectorAll(OWN_SPANNING_CELLS)].find((cell) => {
    const rect = cell.getBoundingClientRect();

    return within(x, rect.left, rect.right) && within(y, rect.top, rect.bottom);
  });

const cellIn = (row: Element, x: number): Element | undefined => {
  const cells = [...row.children].filter((cell) => cell.hasAttribute('aria-colindex'));

  const hits = (cell: Element): boolean => {
    const rect = cell.getBoundingClientRect();
    return within(x, rect.left, rect.right);
  };

  return cells.find((cell) => isPinned(cell) && hits(cell)) ?? cells.find(hits);
};

const isLineKey = (event: KeyboardEvent): boolean =>
  (event.key === ' ' || event.key === 'Enter') &&
  !event.shiftKey &&
  !event.ctrlKey &&
  !event.metaKey;

const isAllKey = (event: KeyboardEvent): boolean =>
  event.code === 'KeyA' || event.key.toLowerCase() === 'a';

const isCellTarget = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement && target.matches('.nui-table__cell');

const isBodyTarget = (target: EventTarget | null): boolean =>
  target instanceof Element && target.closest(BODY_ROW) !== null;

const clearTextSelection = (): void => {
  window.getSelection()?.removeAllRanges();
};

export const useTableRanges = (options: TableRangesOptions): TableRanges => {
  const dragging = ref(false);
  const deselected = ref(false);
  let session: RangeSession | undefined;
  let point: EdgePoint = {};
  let swallow = false;
  let holdFocus = false;
  let touched = false;
  let pending: NuiTableRanges | undefined;
  let others: NuiTableRanges | undefined;
  let written = options.ranges.value;
  let cache = new Map<number, TableRowRanges | undefined>();
  let cachedFor: NuiTableRanges = options.ranges.value;
  let cachedOffset = options.offset();

  const latest = (): NuiTableRanges => pending ?? options.ranges.value;

  const write = (next: NuiTableRanges): NuiTableRanges => {
    if (!sameRanges(next, latest())) {
      pending = next;
      written = next;
      options.ranges.value = next;

      queueMicrotask(() => {
        pending = undefined;
      });
    }
    return next;
  };

  const whole = (range: NuiTableRange): NuiTableRange =>
    expandToMerges(options.merges(), range, options.bounds());

  const shape = (
    last: NuiTableRange,
    kept: NuiTableRanges = others ?? latest().slice(0, -1),
  ): NuiTableRanges => {
    others = kept;
    deselected.value = false;
    return write(tidyRanges(withLast(kept, whole(last))));
  };

  const take = (base: NuiTableRanges, cut: NuiTableRange): void => {
    const next = write(tidyRanges(cutRanges(base, whole(cut))));

    others = next;
    deselected.value = next.length === 0;
  };

  const clear = (): void => {
    others = undefined;
    deselected.value = false;
    write([]);
  };

  const announceSize = (list: NuiTableRanges): void => {
    const last = list.at(-1);

    if (last !== undefined) {
      const box = boxOf(last);

      options.announce(
        options.messages.value.rangeSelected({
          rows: box.bottom - box.top + 1,
          cols: box.end - box.start + 1,
        }),
      );
    }
  };

  const positionOf = (cell: Element): TableCellPosition | undefined => {
    const rowIndex = Number(cell.parentElement?.getAttribute('aria-rowindex'));
    const colIndex = Number(cell.getAttribute('aria-colindex'));
    const row = rowIndex - options.headRows() - options.pinnedRows() - 1;
    const col = colIndex - 1 - options.offset();

    return Number.isInteger(row) && Number.isInteger(col) ? { row, col } : undefined;
  };

  const startOf = (target: EventTarget | null): TableCellPosition | undefined => {
    if (!(target instanceof Element) || target.closest(INTERACTIVE) !== null) {
      return undefined;
    }
    const element = target.closest(`${START_ROW} > .nui-table__cell[aria-colindex]`);
    const position = element === null ? undefined : positionOf(element);

    return position !== undefined && position.col >= 0 ? position : undefined;
  };

  const rowOrigin = (head: Element): RangeOrigin | undefined => {
    const position = positionOf(head);

    return position === undefined
      ? undefined
      : { kind: 'lines', lines: 'rows', position: { row: position.row, col: 0 } };
  };

  const columnOrigin = (head: Element): RangeOrigin | undefined => {
    const col = positionOf(head)?.col;

    return col === undefined || col < 0 || options.sorts(col)
      ? undefined
      : { kind: 'lines', lines: 'cols', position: { row: 0, col } };
  };

  const lineOrigin = (target: Element): RangeOrigin | undefined => {
    if (target.closest(HANDLE) !== null) {
      return undefined;
    }
    const rowHead = target.closest(ROW_HEAD);

    if (rowHead !== null) {
      return rowOrigin(rowHead);
    }
    if (target.closest(CORNER) !== null) {
      return { kind: 'all' };
    }
    const head = target.closest(COLUMN_HEAD);

    return head === null ? undefined : columnOrigin(head);
  };

  const originOf = (target: EventTarget | null): RangeOrigin | undefined => {
    const cell = startOf(target);

    if (cell !== undefined) {
      return { kind: 'lines', lines: 'cells', position: cell };
    }
    return options.lines() && target instanceof Element && target.closest(INTERACTIVE) === null
      ? lineOrigin(target)
      : undefined;
  };

  const widen = (range: NuiTableRange, lines: TableRangeLines): NuiTableRange =>
    widenRange(range, lines, options.bounds());

  const cursorFor = (start: TableCellPosition, lines: TableRangeLines): TableCellPosition => {
    const cursor = options.cursor();

    switch (lines) {
      case 'cells':
        return start;
      case 'rows':
        return { row: start.row, col: cursor?.col ?? 0 };
      case 'cols':
        return { row: cursor?.row ?? 0, col: start.col };
    }
  };

  const bandOf = (viewport: HTMLElement): Band => {
    const rect = viewport.getBoundingClientRect();
    const size = options.rowSize();
    const left = rect.left + viewport.clientLeft;
    const top = rect.top + viewport.clientTop;

    return {
      left,
      right: left + viewport.clientWidth,
      top: top + size * (options.headRows() + options.pinnedRows()),
      bottom: top + viewport.clientHeight - size * options.footRows(),
    };
  };

  const hitAt = (target: EdgePoint): TableCellPosition | undefined => {
    const viewport = options.viewport();

    if (viewport === null || target.x === undefined || target.y === undefined) {
      return undefined;
    }
    const band = bandOf(viewport);
    const x = Math.min(Math.max(target.x, band.left + 1), band.right - 1);
    const y = Math.min(Math.max(target.y, band.top + 1), band.bottom - 1);

    const row = [...viewport.querySelectorAll(OWN_DATA_ROWS)].find((candidate) => {
      const rect = rowRect(candidate);
      return within(y, rect.top, rect.bottom);
    });

    const cell = row === undefined ? undefined : (cellIn(row, x) ?? spanningAt(viewport, x, y));
    const position = cell === undefined ? undefined : positionOf(cell);

    return position === undefined ? undefined : clampPosition(position, options.bounds());
  };

  const follow = (): void => {
    const active = session;
    const cell = active === undefined ? undefined : hitAt(point);

    if (active === undefined || cell === undefined) {
      return;
    }
    const swept = widen({ from: active.from, to: cell }, active.lines);

    switch (active.action.kind) {
      case 'shape':
        shape(swept);
        break;
      case 'remove':
        take(active.action.base, swept);
        break;
    }
  };

  const edge = useEdgeScroll({ container: options.viewport, onStep: follow });

  const edgePoint = (lines: TableRangeLines): EdgePoint => {
    switch (lines) {
      case 'cells':
        return point;
      case 'rows':
        return { y: point.y };
      case 'cols':
        return { x: point.x };
    }
  };

  const onMove = (event: PointerEvent): void => {
    const current = session;

    if (current === undefined || event.pointerId !== current.pointerId) {
      return;
    }
    point = { x: event.clientX, y: event.clientY };

    if (!dragging.value) {
      if (Math.hypot(event.clientX - current.x, event.clientY - current.y) < THRESHOLD) {
        return;
      }
      dragging.value = true;
      clearTextSelection();
    }
    follow();
    edge.follow(edgePoint(current.lines));
  };

  const detach = (): void => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', finish);
    }
  };

  const finish = (): void => {
    session = undefined;
    dragging.value = false;
    edge.stop();
    detach();
  };

  const onUp = (event: PointerEvent): void => {
    const active = session;

    if (active === undefined || event.pointerId !== active.pointerId) {
      return;
    }
    if (dragging.value) {
      swallow = true;

      if (active.action.kind === 'shape') {
        announceSize(latest());
      }
    }
    finish();
  };

  const materialized = (anchor: TableCellPosition | undefined): NuiTableRanges => {
    const list = latest();
    return list.length === 0 && anchor !== undefined ? [{ from: anchor, to: anchor }] : list;
  };

  const addFrom = (
    start: TableCellPosition,
    anchor: TableCellPosition | undefined,
    lines: TableRangeLines,
  ): SessionStart => {
    shape(widen({ from: start, to: start }, lines), materialized(anchor));
    return { from: start, action: SHAPE, lines };
  };

  const removeFrom = (start: TableCellPosition, lines: TableRangeLines): SessionStart => {
    const base = latest();

    take(base, widen({ from: start, to: start }, lines));
    return { from: start, action: { kind: 'remove', base }, lines };
  };

  const shiftFrom = (
    start: TableCellPosition,
    anchor: TableCellPosition | undefined,
    lines: TableRangeLines,
  ): SessionStart => {
    if (inRanges(latest(), start)) {
      return removeFrom(start, lines);
    }
    const from = anchor ?? start;

    shape(widen({ from, to: start }, lines), latest());
    return { from, action: SHAPE, lines };
  };

  const claim = (start: TableCellPosition, begun: SessionStart): SessionStart => {
    holdFocus = true;
    swallow = true;
    clearTextSelection();
    options.focus(cursorFor(start, begun.lines));
    return begun;
  };

  const plainFrom = (start: TableCellPosition, lines: TableRangeLines): SessionStart => {
    clear();

    return lines === 'cells'
      ? { from: start, action: SHAPE, lines }
      : claim(start, addFrom(start, undefined, lines));
  };

  const sessionFor = (
    mode: SessionMode,
    start: TableCellPosition,
    anchor: TableCellPosition | undefined,
    lines: TableRangeLines,
  ): SessionStart => {
    switch (mode) {
      case 'extend':
        return claim(start, shiftFrom(start, anchor, lines));
      case 'add':
        return claim(
          start,
          inRanges(latest(), start) ? removeFrom(start, lines) : addFrom(start, anchor, lines),
        );
      case 'plain':
        return plainFrom(start, lines);
    }
  };

  const selectOrigin = (origin: RangeOrigin): void => {
    const range =
      origin.kind === 'all'
        ? allOf(options.bounds())
        : widen({ from: origin.position, to: origin.position }, origin.lines);

    announceSize(shape(range, []));
  };

  const selectEverything = (origin: RangeOrigin): void => {
    holdFocus = true;
    clearTextSelection();
    selectOrigin(origin);
    options.focus(options.cursor() ?? { row: 0, col: 0 });
  };

  const onPointerdown = (event: PointerEvent): void => {
    swallow = false;
    holdFocus = false;
    touched = event.pointerType === 'touch';

    if (!options.enabled() || event.button !== 0 || touched || session) {
      return;
    }
    const origin = originOf(event.target);

    if (origin === undefined) {
      return;
    }
    if (origin.kind === 'all') {
      selectEverything(origin);
      return;
    }
    const begun = sessionFor(modeOf(event), origin.position, options.anchor(), origin.lines);

    if (begun.lines !== 'cells' && begun.action.kind === 'shape') {
      announceSize(latest());
    }
    session = { ...begun, pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    point = { x: event.clientX, y: event.clientY };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', finish);
  };

  const onClick = (event: MouseEvent): void => {
    const target = touched && options.enabled() && options.lines() ? event.target : null;

    const origin =
      target instanceof Element && target.closest(INTERACTIVE) === null
        ? lineOrigin(target)
        : undefined;

    if (origin !== undefined) {
      selectOrigin(origin);
    }
  };

  const cornerOf = (last: NuiTableRange | undefined, anchor: TableCellPosition, key: string) => {
    const moving = last?.to ?? anchor;

    return last !== undefined && spansLines(last, options.bounds())
      ? moving
      : leaveMerge(options.merges(), moving, key, options.isRtl());
  };

  const extendBy = (event: KeyboardEvent, anchor: TableCellPosition): boolean => {
    const last = latest().at(-1);
    const from = cornerOf(last, anchor, event.key);

    const corner = stepCorner(
      from,
      {
        key: event.key,
        ctrl: event.ctrlKey || event.metaKey,
        page: options.pageRows(from.row, event.key === 'PageDown'),
        rtl: options.isRtl(),
        edge: options.edge,
      },
      options.bounds(),
    );

    if (corner === undefined) {
      return false;
    }
    const next = { from: last?.from ?? anchor, to: corner };

    event.preventDefault();
    announceSize(shape(next));
    options.reveal(corner, revealAxisOf(next, options.bounds()));
    return true;
  };

  const replaceLast = (
    event: KeyboardEvent,
    last: NuiTableRange,
    kept?: NuiTableRanges,
  ): boolean => {
    event.preventDefault();
    announceSize(shape(last, kept));
    return true;
  };

  const selectLines = (event: KeyboardEvent, anchor: TableCellPosition): boolean => {
    const base = latest().at(-1) ?? { from: anchor, to: anchor };
    const bounds = options.bounds();

    return replaceLast(event, event.shiftKey ? rowsOf(base, bounds) : colsOf(base, bounds));
  };

  const onNavigation = (event: KeyboardEvent, anchor: TableCellPosition): boolean => {
    if (event.shiftKey) {
      return extendBy(event, anchor);
    }
    clear();
    return false;
  };

  const onEscape = (event: KeyboardEvent): boolean => {
    if (latest().length === 0 && (deselected.value || !isBodyTarget(event.target))) {
      return false;
    }
    event.preventDefault();
    clear();
    deselected.value = true;
    return true;
  };

  const onOutside = (event: PointerEvent): void => {
    if (event.target instanceof Node && !options.inside(event.target)) {
      clear();
    }
  };

  const onHeaderKey = (event: KeyboardEvent): boolean => {
    const target = options.lines() && isLineKey(event) ? event.target : null;
    const origin = target instanceof Element ? lineOrigin(target) : undefined;

    if (origin === undefined) {
      return false;
    }
    event.preventDefault();
    selectOrigin(origin);
    return true;
  };

  const onKeydown = (event: KeyboardEvent): boolean => {
    const anchor = options.anchor();
    const ctrl = event.ctrlKey || event.metaKey;

    if (!options.enabled() || event.altKey || !isCellTarget(event.target)) {
      return false;
    }
    if (event.key === 'Escape') {
      return onEscape(event);
    }
    if (onHeaderKey(event)) {
      return true;
    }
    if (ctrl && !event.shiftKey && isAllKey(event)) {
      clearTextSelection();
      return replaceLast(event, allOf(options.bounds()), []);
    }
    if (anchor === undefined) {
      return false;
    }
    if (NAVIGATION.has(event.key)) {
      return onNavigation(event, anchor);
    }
    return event.key === ' ' && (event.shiftKey || ctrl) ? selectLines(event, anchor) : false;
  };

  const segments = (row: number): TableRowRanges | undefined => {
    const list = options.ranges.value;
    const offset = options.offset();

    if (list !== cachedFor || offset !== cachedOffset) {
      cache = new Map();
      cachedFor = list;
      cachedOffset = offset;
    }
    if (!cache.has(row)) {
      const found = segmentsOf(list, row, offset);
      cache.set(row, found.length === 0 ? undefined : found);
    }
    return cache.get(row);
  };

  watch(options.resetOn, clear);

  watch(options.ranges, (value) => {
    if (!sameRanges(value, written)) {
      others = undefined;
      deselected.value = false;
    }
  });

  watch(options.enabled, (on) => {
    if (!on) {
      clear();
    }
  });

  onScopeDispose(finish);

  useEventListener(
    () => (options.ranges.value.length > 0 ? document : undefined),
    'pointerdown',
    onOutside,
    { capture: true, passive: true },
  );

  const keepsMenuFocus = (event: MouseEvent): boolean => {
    const start = event.button === 2 && options.enabled() ? startOf(event.target) : undefined;

    return start !== undefined && inRanges(latest(), start);
  };

  return {
    dragging,
    deselected,
    segmentsOf: segments,
    contains: (position) => inRanges(latest(), position),
    cellAt: startOf,
    cellAtPoint: (x, y) => hitAt({ x, y }),
    onPointerdown,
    onMousedown: (event) => {
      if (holdFocus || keepsMenuFocus(event)) {
        holdFocus = false;
        event.preventDefault();
      }
    },
    onClick,
    onKeydown,
    takeClick: () => {
      const value = swallow;

      swallow = false;
      return value;
    },
    swallowClick: () => {
      swallow = true;
    },
    clear,
    replace: (next) => {
      others = undefined;
      deselected.value = false;
      write(tidyRanges(next));
    },
  };
};

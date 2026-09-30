import { onScopeDispose, ref, watch, type ComputedRef, type Ref, type WatchSource } from 'vue';
import { useEdgeScroll, type EdgePoint } from '@numior/primitives';
import {
  allOf,
  boxOf,
  clampPosition,
  colsOf,
  cutRanges,
  inRanges,
  rowsOf,
  sameRanges,
  segmentsOf,
  stepCorner,
  tidyRanges,
  withLast,
  type RangeBounds,
} from './table-ranges';
import type { NuiTableMessages } from './table.messages';
import type {
  NuiTableRange,
  NuiTableRanges,
  TableCellPosition,
  TableRowRanges,
} from './table.types';

export interface TableRangesOptions {
  readonly enabled: () => boolean;
  readonly ranges: Ref<NuiTableRanges>;
  readonly viewport: () => HTMLElement | null;
  readonly bounds: () => RangeBounds;
  readonly offset: () => number;
  readonly headRows: () => number;
  readonly pinnedRows: () => number;
  readonly footRows: () => number;
  readonly rowSize: () => number;
  readonly pageRows: () => number;
  readonly isRtl: () => boolean;
  readonly anchor: () => TableCellPosition | undefined;
  readonly focus: (position: TableCellPosition) => void;
  readonly reveal: (corner: TableCellPosition) => void;
  readonly resetOn: WatchSource[];
  readonly messages: ComputedRef<NuiTableMessages>;
  readonly announce: (text: string) => void;
}

export interface TableRanges {
  readonly dragging: Readonly<Ref<boolean>>;
  readonly deselected: Readonly<Ref<boolean>>;
  segmentsOf(row: number): TableRowRanges | undefined;
  contains(position: TableCellPosition): boolean;
  onPointerdown(event: PointerEvent): void;
  onMousedown(event: MouseEvent): void;
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
}

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
  'button, a[href], input, select, textarea, label, [contenteditable="true"], .nui-table__toggle';

const modeOf = (event: MouseEvent): SessionMode => {
  if (event.shiftKey) {
    return 'extend';
  }
  return event.ctrlKey || event.metaKey ? 'add' : 'plain';
};

const rowRect = (row: Element): DOMRect => (row.firstElementChild ?? row).getBoundingClientRect();

const isPinned = (cell: Element): boolean => PINNED.some((name) => cell.classList.contains(name));

const within = (value: number, start: number, end: number): boolean =>
  value >= start && value < end;

const cellIn = (row: Element, x: number): Element | undefined => {
  const cells = [...row.children].filter((cell) => cell.hasAttribute('aria-colindex'));

  const hits = (cell: Element): boolean => {
    const rect = cell.getBoundingClientRect();
    return within(x, rect.left, rect.right);
  };

  return cells.find((cell) => isPinned(cell) && hits(cell)) ?? cells.find(hits);
};

const isAllKey = (event: KeyboardEvent): boolean =>
  event.code === 'KeyA' || event.key.toLowerCase() === 'a';

const isCellTarget = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement && target.matches('.nui-table__cell');

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

  const shape = (
    last: NuiTableRange,
    kept: NuiTableRanges = others ?? latest().slice(0, -1),
  ): NuiTableRanges => {
    others = kept;
    deselected.value = false;
    return write(tidyRanges(withLast(kept, last)));
  };

  const take = (base: NuiTableRanges, cut: NuiTableRange): void => {
    const next = write(tidyRanges(cutRanges(base, cut)));

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

    const row = [...viewport.querySelectorAll(BODY_ROW)].find((candidate) => {
      const rect = rowRect(candidate);
      return within(y, rect.top, rect.bottom);
    });

    const cell = row === undefined ? undefined : cellIn(row, x);
    const position = cell === undefined ? undefined : positionOf(cell);

    return position === undefined ? undefined : clampPosition(position, options.bounds());
  };

  const follow = (): void => {
    const active = session;
    const cell = active === undefined ? undefined : hitAt(point);

    if (active === undefined || cell === undefined) {
      return;
    }
    const swept = { from: active.from, to: cell };

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
    edge.follow(point);
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
  ): SessionStart => {
    shape({ from: start, to: start }, materialized(anchor));
    return { from: start, action: SHAPE };
  };

  const removeFrom = (start: TableCellPosition): SessionStart => {
    const base = latest();

    take(base, { from: start, to: start });
    return { from: start, action: { kind: 'remove', base } };
  };

  const shiftFrom = (
    start: TableCellPosition,
    anchor: TableCellPosition | undefined,
  ): SessionStart => {
    if (inRanges(latest(), start)) {
      return removeFrom(start);
    }
    const from = anchor ?? start;

    shape({ from, to: start }, latest());
    return { from, action: SHAPE };
  };

  const claim = (start: TableCellPosition, begun: SessionStart): SessionStart => {
    holdFocus = true;
    swallow = true;
    clearTextSelection();
    options.focus(start);
    return begun;
  };

  const sessionFor = (
    mode: SessionMode,
    start: TableCellPosition,
    anchor: TableCellPosition | undefined,
  ): SessionStart => {
    switch (mode) {
      case 'extend':
        return claim(start, shiftFrom(start, anchor));
      case 'add':
        return claim(start, inRanges(latest(), start) ? removeFrom(start) : addFrom(start, anchor));
      case 'plain':
        clear();
        return { from: start, action: SHAPE };
    }
  };

  const onPointerdown = (event: PointerEvent): void => {
    swallow = false;
    holdFocus = false;

    if (!options.enabled() || event.button !== 0 || event.pointerType === 'touch' || session) {
      return;
    }
    const start = startOf(event.target);

    if (start === undefined) {
      return;
    }
    const begun = sessionFor(modeOf(event), start, options.anchor());

    session = { ...begun, pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    point = { x: event.clientX, y: event.clientY };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', finish);
  };

  const extendBy = (event: KeyboardEvent, anchor: TableCellPosition): boolean => {
    const list = latest();
    const last = list.at(-1);

    const corner = stepCorner(
      last?.to ?? anchor,
      {
        key: event.key,
        ctrl: event.ctrlKey || event.metaKey,
        page: options.pageRows(),
        rtl: options.isRtl(),
      },
      options.bounds(),
    );

    if (corner === undefined) {
      return false;
    }
    event.preventDefault();
    announceSize(shape({ from: last?.from ?? anchor, to: corner }));
    options.reveal(corner);
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
    if (latest().length === 0) {
      return false;
    }
    event.preventDefault();
    clear();
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

  const keepsMenuFocus = (event: MouseEvent): boolean => {
    const start = event.button === 2 && options.enabled() ? startOf(event.target) : undefined;

    return start !== undefined && inRanges(latest(), start);
  };

  return {
    dragging,
    deselected,
    segmentsOf: segments,
    contains: (position) => inRanges(latest(), position),
    onPointerdown,
    onMousedown: (event) => {
      if (holdFocus || keepsMenuFocus(event)) {
        holdFocus = false;
        event.preventDefault();
      }
    },
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

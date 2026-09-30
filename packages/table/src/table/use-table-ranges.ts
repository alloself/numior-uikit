import { onScopeDispose, ref, watch, type ComputedRef, type Ref, type WatchSource } from 'vue';
import { useEdgeScroll, type EdgePoint } from '@numior/primitives';
import {
  allOf,
  boxOf,
  clampPosition,
  colsOf,
  inRanges,
  rowsOf,
  sameRanges,
  segmentsOf,
  stepCorner,
  withCorner,
  type RangeBounds,
} from './table-ranges';
import type { NuiTableMessages } from './table.messages';
import type { NuiTableRanges, TableCellPosition, TableRowRanges } from './table.types';

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
  readonly reveal: (corner: TableCellPosition) => void;
  readonly resetOn: WatchSource[];
  readonly messages: ComputedRef<NuiTableMessages>;
  readonly announce: (text: string) => void;
}

export interface TableRanges {
  readonly dragging: Readonly<Ref<boolean>>;
  segmentsOf(row: number): TableRowRanges | undefined;
  contains(position: TableCellPosition): boolean;
  onPointerdown(event: PointerEvent): void;
  onMousedown(event: MouseEvent): void;
  onKeydown(event: KeyboardEvent): boolean;
  takeClick(): boolean;
  swallowClick(): void;
  clear(): void;
}

type SessionMode = 'plain' | 'extend' | 'add';

interface RangeSession {
  readonly pointerId: number;
  readonly x: number;
  readonly y: number;
  readonly from: TableCellPosition;
}

interface StartCell {
  readonly position: TableCellPosition;
  readonly element: HTMLElement;
}

interface Band {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
}

const THRESHOLD = 5;
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
  let session: RangeSession | undefined;
  let point: EdgePoint = {};
  let swallow = false;
  let holdFocus = false;
  let pending: NuiTableRanges | undefined;
  let cache = new Map<number, TableRowRanges | undefined>();
  let cachedFor: NuiTableRanges = options.ranges.value;
  let cachedOffset = options.offset();

  const latest = (): NuiTableRanges => pending ?? options.ranges.value;

  const write = (next: NuiTableRanges): NuiTableRanges => {
    if (!sameRanges(next, latest())) {
      pending = next;
      options.ranges.value = next;

      queueMicrotask(() => {
        pending = undefined;
      });
    }
    return next;
  };

  const clear = (): void => {
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

  const startOf = (target: EventTarget | null): StartCell | undefined => {
    if (!(target instanceof Element) || target.closest(INTERACTIVE) !== null) {
      return undefined;
    }
    const element = target.closest<HTMLElement>(`${START_ROW} > .nui-table__cell[aria-colindex]`);
    const position = element === null ? undefined : positionOf(element);

    return element !== null && position !== undefined && position.col >= 0
      ? { position, element }
      : undefined;
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

    if (active !== undefined && cell !== undefined) {
      write(withCorner(latest(), active.from, cell));
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
    if (session === undefined || event.pointerId !== session.pointerId) {
      return;
    }
    if (dragging.value) {
      swallow = true;
      announceSize(latest());
    }
    finish();
  };

  const materialized = (anchor: TableCellPosition | undefined): NuiTableRanges => {
    const list = latest();
    return list.length === 0 && anchor !== undefined ? [{ from: anchor, to: anchor }] : list;
  };

  const extendFrom = (
    start: StartCell,
    anchor: TableCellPosition | undefined,
  ): TableCellPosition => {
    const from = latest().at(-1)?.from ?? anchor ?? start.position;

    holdFocus = true;
    swallow = true;
    clearTextSelection();
    write(withCorner(latest(), from, start.position));

    if (anchor === undefined) {
      start.element.focus({ preventScroll: true });
    }
    return from;
  };

  const fromOf = (
    mode: SessionMode,
    start: StartCell,
    anchor: TableCellPosition | undefined,
  ): TableCellPosition => {
    switch (mode) {
      case 'extend':
        return extendFrom(start, anchor);
      case 'add':
        swallow = true;
        clearTextSelection();
        write([...materialized(anchor), { from: start.position, to: start.position }]);
        return start.position;
      case 'plain':
        clear();
        return start.position;
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
    const from = fromOf(modeOf(event), start, options.anchor());

    session = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, from };
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
    announceSize(write(withCorner(list, last?.from ?? anchor, corner)));
    options.reveal(corner);
    return true;
  };

  const replaceLast = (event: KeyboardEvent, next: NuiTableRanges): boolean => {
    event.preventDefault();
    announceSize(write(next));
    return true;
  };

  const selectLines = (event: KeyboardEvent, anchor: TableCellPosition): boolean => {
    const list = latest();
    const base = list.at(-1) ?? { from: anchor, to: anchor };
    const bounds = options.bounds();
    const line = event.shiftKey ? rowsOf(base, bounds) : colsOf(base, bounds);

    return replaceLast(event, [...list.slice(0, -1), line]);
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
      return replaceLast(event, [allOf(options.bounds())]);
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

  watch(options.enabled, (on) => {
    if (!on) {
      clear();
    }
  });

  onScopeDispose(finish);

  return {
    dragging,
    segmentsOf: segments,
    contains: (position) => inRanges(latest(), position),
    onPointerdown,
    onMousedown: (event) => {
      if (holdFocus) {
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
  };
};

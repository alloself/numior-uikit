import { ref, type ComputedRef, type Ref } from 'vue';
import { useReorder, type ReorderEvent, type ReorderState } from '@numior/primitives';
import { clampInside, ghostAt, grabOf, NO_GRAB, type DragGrab, type NuiTableGhost } from './ghost';
import type { NuiTableAnnouncement, NuiTableColumn } from './table.types';

export interface ColumnReorderOptions<T> {
  readonly scroller: () => HTMLElement | null | undefined;
  readonly columns: () => readonly NuiTableColumn<T>[];
  readonly utilities: () => number;
  readonly rtl: () => boolean;
  readonly canMove: (from: number, to: number) => boolean;
  readonly move: (from: number, to: number) => void;
  readonly announce: (announcement: NuiTableAnnouncement) => void;
}

export interface ColumnReorder {
  readonly state: Readonly<Ref<ReorderState>>;
  readonly source: ComputedRef<number | undefined>;
  readonly indicator: Readonly<Ref<number | undefined>>;
  readonly ghost: Readonly<Ref<NuiTableGhost | undefined>>;
  dragStart(index: number, event: PointerEvent): void;
  dragKeydown(index: number, event: KeyboardEvent): void;
  headPointerdown(): void;
  headClick(event: MouseEvent): void;
}

const headerCells = (scroller: HTMLElement | null | undefined, skip: number): HTMLElement[] =>
  Array.from(scroller?.querySelectorAll('thead th') ?? [])
    .slice(skip)
    .filter((cell): cell is HTMLElement => cell instanceof HTMLElement);

const slotIndex = (
  cells: readonly HTMLElement[],
  client: number,
  rtl: boolean,
  from: number,
): number => {
  const passed = cells.filter((cell, index) => {
    if (index === from) {
      return false;
    }
    const rect = cell.getBoundingClientRect();
    const center = rect.left + rect.width / 2;
    return rtl ? center > client : center < client;
  }).length;

  return Math.min(cells.length - 1, passed);
};

const indicatorAt = (
  scroller: HTMLElement,
  cell: HTMLElement,
  forward: boolean,
  rtl: boolean,
): number => {
  const rect = cell.getBoundingClientRect();
  const edge = forward !== rtl ? rect.right : rect.left;
  return clampInside(
    scroller,
    'x',
    edge - scroller.getBoundingClientRect().left + scroller.scrollLeft,
    2,
  );
};

export const useColumnReorder = <T>(options: ColumnReorderOptions<T>): ColumnReorder => {
  const indicator = ref<number>();
  const ghost = ref<NuiTableGhost>();
  const grabbed: { current: DragGrab } = { current: NO_GRAB };
  let dragged = false;

  const labelOf = (index: number): string => options.columns()[index]?.label ?? '';

  const say = (phase: NuiTableAnnouncement['phase'], from: number, to: number): void => {
    options.announce({
      kind: 'column',
      phase,
      label: labelOf(from),
      from,
      to,
      count: options.columns().length,
    });
  };

  const place = (from: number, to: number): void => {
    const scroller = options.scroller();
    const cell = headerCells(scroller, options.utilities())[to];

    indicator.value =
      scroller && cell ? indicatorAt(scroller, cell, to > from, options.rtl()) : undefined;
  };

  const float = (state: ReorderState): void => {
    ghost.value =
      state.phase === 'dragging'
        ? ghostAt(options.scroller(), 'x', state.position, grabbed.current, labelOf(state.from))
        : undefined;
  };

  const onChange = (state: ReorderState): void => {
    switch (state.phase) {
      case 'dragging':
        dragged = true;
        place(state.from, state.to);
        break;
      case 'keyboard':
        place(state.from, state.to);
        break;
      case 'idle':
        indicator.value = undefined;
        break;
      case 'pending':
        break;
    }
    float(state);
  };

  const onEvent = (event: ReorderEvent): void => {
    switch (event.type) {
      case 'grabbed':
      case 'cancelled':
        say(event.type, event.from, event.from);
        break;
      case 'moved':
      case 'dropped':
        say(event.type, event.from, event.to);
        break;
    }
  };

  const reorder = useReorder({
    axis: 'x',
    count: () => options.columns().length,
    container: options.scroller,
    indexAt: (client, from) =>
      slotIndex(headerCells(options.scroller(), options.utilities()), client, options.rtl(), from),
    canMove: options.canMove,
    onMove: options.move,
    onChange,
    onEvent,
    rtl: options.rtl,
  });

  return {
    state: reorder.state,
    source: reorder.source,
    indicator,
    ghost,
    dragStart: (index, event) => {
      grabbed.current = grabOf(event, 'x', 'th');
      reorder.onPointerdown(index, event);
    },
    dragKeydown: (index, event) => {
      if (reorder.onKeydown(index, event)) {
        event.preventDefault();
      }
    },
    headPointerdown: () => {
      dragged = false;
    },
    headClick: (event) => {
      if (dragged) {
        dragged = false;
        event.stopPropagation();
        event.preventDefault();
      }
    },
  };
};

import { ref, type Ref } from 'vue';
import { useReorder, type ReorderState } from '@numior/primitives';
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
  readonly indicator: Readonly<Ref<number | undefined>>;
  readonly ghost: Readonly<Ref<NuiTableGhost | undefined>>;
  dragStart(index: number, event: PointerEvent): void;
  dragKeydown(index: number, event: KeyboardEvent): void;
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
  const flags = { dragged: false, moved: false };
  let previous: ReorderState = { phase: 'idle', from: -1, to: -1, position: 0 };

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
  const place = (state: ReorderState): void => {
    const scroller = options.scroller();
    const cell = headerCells(scroller, options.utilities())[state.to];
    indicator.value =
      scroller && cell
        ? indicatorAt(scroller, cell, state.to > state.from, options.rtl())
        : undefined;
  };
  const float = (state: ReorderState): void => {
    ghost.value =
      state.phase === 'dragging'
        ? ghostAt(options.scroller(), 'x', state.position, grabbed.current, labelOf(state.from))
        : undefined;
  };
  const announceTransition = (state: ReorderState): void => {
    const taken = state.phase === 'keyboard' && previous.phase !== 'keyboard';
    if (taken) {
      flags.moved = false;
      say('grabbed', state.from, state.to);
    } else if (state.phase === 'keyboard' && state.to !== previous.to) {
      say('moved', state.from, state.to);
    } else if (state.phase === 'idle' && previous.phase === 'keyboard' && !flags.moved) {
      say('cancelled', previous.from, previous.from);
    }
  };
  const onChange = (state: ReorderState): void => {
    if (state.phase === 'dragging') {
      flags.dragged = true;
    }
    if (state.phase === 'pending') {
      flags.moved = false;
    }
    announceTransition(state);
    if (state.phase === 'idle') {
      flags.moved = false;
      indicator.value = undefined;
    } else if (state.phase !== 'pending') {
      place(state);
    }
    float(state);
    previous = state;
  };

  const reorder = useReorder({
    axis: 'x',
    count: () => options.columns().length,
    container: options.scroller,
    indexAt: (client) =>
      slotIndex(
        headerCells(options.scroller(), options.utilities()),
        client,
        options.rtl(),
        reorder.state.value.from,
      ),
    canMove: options.canMove,
    onMove: (from, to) => {
      flags.moved = true;
      options.move(from, to);
      say('dropped', from, to);
    },
    onChange,
    rtl: options.rtl,
  });

  return {
    state: reorder.state,
    indicator,
    ghost,
    dragStart: (index, event) => {
      flags.dragged = false;
      grabbed.current = grabOf(event, 'x', 'th');
      reorder.onPointerdown(index, event);
    },
    dragKeydown: (index, event) => {
      if (reorder.onKeydown(index, event)) {
        event.preventDefault();
      }
    },
    headClick: (event) => {
      if (flags.dragged) {
        flags.dragged = false;
        event.stopPropagation();
        event.preventDefault();
      }
    },
  };
};

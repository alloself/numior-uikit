import { ref, type Ref } from 'vue';
import { useReorder, type ReorderState } from '@numior/primitives';
import { clampInside, ghostAt, grabOf, NO_GRAB, type DragGrab, type NuiTableGhost } from './ghost';
import type { NuiTableRowView } from './rows';
import type { NuiTableAnnouncement, NuiTableReorderEvent } from './table.types';

export interface RowReorderOptions<T> {
  readonly scroller: () => HTMLElement | null | undefined;
  readonly views: () => readonly NuiTableRowView<T>[];
  readonly firstIndex: () => number;
  readonly rowHeight: () => number | undefined;
  readonly enabled: () => boolean;
  readonly labelOf: (view: NuiTableRowView<T>) => string;
  readonly reveal: (index: number) => void;
  readonly onReorder: (event: NuiTableReorderEvent<T>) => void;
  readonly announce: (announcement: NuiTableAnnouncement) => void;
}

export interface RowReorder {
  readonly state: Readonly<Ref<ReorderState>>;
  readonly indicator: Readonly<Ref<number | undefined>>;
  readonly ghost: Readonly<Ref<NuiTableGhost | undefined>>;
  dragStart(index: number, event: PointerEvent): void;
  dragKeydown(index: number, event: KeyboardEvent): void;
}

const bodyOf = (scroller: HTMLElement | null | undefined): HTMLElement | null => {
  const body = scroller?.querySelector('tbody.nui-table__body:not(.nui-table__body--pinned)');
  return body instanceof HTMLElement ? body : null;
};

const renderedRows = (body: HTMLElement | null): HTMLElement[] =>
  Array.from(body?.querySelectorAll(':scope > .nui-table__row') ?? []).filter(
    (row): row is HTMLElement => row instanceof HTMLElement,
  );

export const useRowReorder = <T>(options: RowReorderOptions<T>): RowReorder => {
  const indicator = ref<number>();
  const ghost = ref<NuiTableGhost>();
  const grabbed: { current: DragGrab } = { current: NO_GRAB };
  const flags = { moved: false };
  let previous: ReorderState = { phase: 'idle', from: -1, to: -1, position: 0 };

  const indexAt = (client: number): number => {
    const body = bodyOf(options.scroller());
    const size = options.rowHeight();
    const count = options.views().length;
    const from = reorder.state.value.from;
    if (body && size !== undefined) {
      const slot = Math.round((client - body.getBoundingClientRect().top) / size);
      const passed = from >= 0 && from < slot ? slot - 1 : slot;
      return Math.min(count - 1, Math.max(0, passed));
    }
    const first = options.firstIndex();
    const passed = renderedRows(body).filter((row, offset) => {
      const rect = row.getBoundingClientRect();
      return first + offset !== from && rect.top + rect.height / 2 < client;
    }).length;
    return Math.min(count - 1, first + passed);
  };

  const place = (state: ReorderState): void => {
    const scroller = options.scroller();
    const body = bodyOf(scroller);
    if (!scroller || !body) {
      indicator.value = undefined;
      return;
    }
    const size = options.rowHeight();
    const forward = state.to > state.from;
    const base = scroller.scrollTop - scroller.getBoundingClientRect().top;
    if (size !== undefined) {
      const top = body.getBoundingClientRect().top + (state.to + (forward ? 1 : 0)) * size;
      indicator.value = clampInside(scroller, 'y', top + base, 2);
      return;
    }
    const row = renderedRows(body)[state.to - options.firstIndex()];
    if (!row) {
      indicator.value = undefined;
      return;
    }
    const rect = row.getBoundingClientRect();
    indicator.value = clampInside(scroller, 'y', (forward ? rect.bottom : rect.top) + base, 2);
  };

  const float = (state: ReorderState): void => {
    const view = options.views()[state.from];
    ghost.value =
      state.phase === 'dragging' && view
        ? ghostAt(options.scroller(), 'y', state.position, grabbed.current, options.labelOf(view))
        : undefined;
  };
  const say = (phase: NuiTableAnnouncement['phase'], from: number, to: number): void => {
    const view = options.views()[from];
    if (!view) {
      return;
    }
    const target = options.views()[to];
    options.announce({
      kind: 'row',
      phase,
      label: options.labelOf(view),
      from: view.siblingIndex,
      to: target?.siblingIndex ?? view.siblingIndex,
      count: view.siblingCount,
    });
  };
  const announceTransition = (state: ReorderState): void => {
    if (state.phase === 'keyboard' && previous.phase !== 'keyboard') {
      flags.moved = false;
      say('grabbed', state.from, state.to);
    } else if (state.phase === 'keyboard' && state.to !== previous.to) {
      say('moved', state.from, state.to);
      options.reveal(state.to);
    } else if (state.phase === 'idle' && previous.phase === 'keyboard' && !flags.moved) {
      say('cancelled', previous.from, previous.from);
    }
  };
  const onChange = (state: ReorderState): void => {
    if (state.phase === 'pending') {
      flags.moved = false;
    }
    announceTransition(state);
    if (state.phase === 'idle') {
      indicator.value = undefined;
    } else if (state.phase !== 'pending') {
      place(state);
    }
    float(state);
    previous = state;
  };
  const canMove = (from: number, to: number): boolean => {
    const source = options.views()[from];
    const target = options.views()[to];
    return (
      options.enabled() &&
      source !== undefined &&
      target !== undefined &&
      source.parentKey === target.parentKey
    );
  };

  const reorder = useReorder({
    axis: 'y',
    count: () => options.views().length,
    container: options.scroller,
    indexAt,
    canMove,
    onMove: (from, to) => {
      const source = options.views()[from];
      const target = options.views()[to];
      if (!source || !target) {
        return;
      }
      flags.moved = true;
      options.onReorder({
        row: source.row,
        from: source.siblingIndex,
        to: target.siblingIndex,
        parent: source.parent,
      });
      say('dropped', from, to);
    },
    onChange,
  });

  return {
    state: reorder.state,
    indicator,
    ghost,
    dragStart: (index, event) => {
      if (options.enabled()) {
        grabbed.current = grabOf(event, 'y', 'tr');
        reorder.onPointerdown(index, event);
      }
    },
    dragKeydown: (index, event) => {
      if (options.enabled() && reorder.onKeydown(index, event)) {
        event.preventDefault();
      }
    },
  };
};

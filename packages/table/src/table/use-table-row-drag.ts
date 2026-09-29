import { computed, ref, type ComputedRef, type Ref, type ShallowRef } from 'vue';
import {
  useReorder,
  type ReorderEvent,
  type ReorderState,
  type VirtualList,
} from '@numior/primitives';
import type { TableEngine, TableSiblings } from '../engine';
import type { NuiTableMessages } from './table.messages';
import type { NuiTableReorderEvent, TableGhost } from './table.types';

export interface TableRowDragOptions<T> {
  readonly enabled: () => boolean;
  readonly engine: ShallowRef<TableEngine<T>>;
  readonly viewport: () => HTMLElement | null;
  readonly frame: () => HTMLElement | null;
  readonly rows: VirtualList;
  readonly pageStart: () => number;
  readonly rowCount: () => number;
  readonly rowSize: () => number;
  readonly windowed: () => boolean;
  readonly headRows: () => number;
  readonly pinnedRows: () => number;
  readonly labelOf: (row: T) => string;
  readonly messages: ComputedRef<NuiTableMessages>;
  readonly announce: (text: string) => void;
  readonly reveal: (position: number) => void;
  readonly moved: (position: number) => void;
  readonly emit: (event: NuiTableReorderEvent<T>) => void;
}

export interface TableRowDrag {
  readonly dragging: ComputedRef<number | undefined>;
  readonly drop: Readonly<Ref<number | undefined>>;
  readonly ghost: Readonly<Ref<TableGhost | undefined>>;
  grab(position: number, event: PointerEvent): void;
  onKeydown(event: KeyboardEvent, position: number | undefined): boolean;
}

interface RowPlace<T> {
  readonly row: T;
  readonly siblings: TableSiblings<T>;
}

const BODY_ROW = '.nui-table__body > [role="row"]';

const rowsOf = (viewport: HTMLElement | null): HTMLElement[] => [
  ...(viewport?.querySelectorAll<HTMLElement>(BODY_ROW) ?? []),
];

const neighbourOf = (from: number, to: number): number => (to < from ? to : to + 1);

export const useTableRowDrag = <T>(options: TableRowDragOptions<T>): TableRowDrag => {
  const drop = ref<number>();
  const ghost = ref<TableGhost>();

  const placeOf = (position: number): RowPlace<T> | undefined => {
    const engine = options.engine.value;
    const node = engine.nodeAt(options.pageStart() + position);
    const siblings = engine.siblingsAt(options.pageStart() + position);

    return node?.kind === 'row' && siblings !== undefined ? { row: node.row, siblings } : undefined;
  };

  const chromeHeight = (): number =>
    options.rowSize() * (options.headRows() + options.pinnedRows());

  const bodyOffset = (clientY: number): number | undefined => {
    const viewport = options.viewport();

    if (viewport === null) {
      return undefined;
    }
    return (
      clientY - viewport.getBoundingClientRect().top + options.rows.scrollTop.value - chromeHeight()
    );
  };

  const passedOf = (clientY: number, from: number): number => {
    const count = options.rowCount();

    if (options.windowed()) {
      const offset = bodyOffset(clientY);
      const slot = offset === undefined ? from : Math.round(offset / options.rowSize());
      const passed = Math.max(0, Math.min(count, slot));

      return Math.min(count - 1, from < passed ? passed - 1 : passed);
    }

    const passed = rowsOf(options.viewport()).filter((row) => {
      const position = Number(row.getAttribute('aria-rowindex')) - options.headRows() - 1;
      const rect = row.getBoundingClientRect();

      return position !== from && rect.top + rect.height / 2 < clientY;
    }).length;

    return Math.min(count - 1, passed);
  };

  interface Anchor {
    readonly place: RowPlace<T>;
    readonly after: boolean;
  }

  const anchorOf = (from: number, to: number): Anchor | undefined => {
    const count = options.rowCount();
    const source = placeOf(from);
    const nextPosition = neighbourOf(from, to);
    const next = nextPosition < count ? placeOf(nextPosition) : undefined;
    const previous = to > 0 ? placeOf(neighbourOf(from, to - 1)) : undefined;

    if (source === undefined) {
      return undefined;
    }
    if (next !== undefined && next.siblings.parentIndex === source.siblings.parentIndex) {
      return { place: next, after: false };
    }
    if (previous !== undefined && previous.siblings.parentIndex === source.siblings.parentIndex) {
      return { place: previous, after: true };
    }
    return undefined;
  };

  const sameParent = (from: number, to: number): boolean =>
    options.enabled() && anchorOf(from, to) !== undefined;

  const finalIndex = (source: TableSiblings<T>, from: number, to: number): number => {
    const anchor = anchorOf(from, to);

    if (anchor === undefined) {
      return source.index;
    }
    const target = anchor.place.siblings.index;

    if (anchor.after) {
      return source.index < target ? target : target + 1;
    }
    return target - (source.index < target ? 1 : 0);
  };

  const move = (from: number, to: number): void => {
    const source = placeOf(from);

    if (source === undefined) {
      return;
    }

    options.emit({
      row: source.row,
      from: source.siblings.index,
      to: finalIndex(source.siblings, from, to),
      parent: source.siblings.parent,
    });
  };

  const frameTop = (clientY: number): number | undefined => {
    const frame = options.frame();
    return frame === null ? undefined : clientY - frame.getBoundingClientRect().top;
  };

  const dropAt = (from: number, to: number): number | undefined => {
    const viewport = options.viewport();
    const count = options.rowCount();
    const neighbour = neighbourOf(from, to);

    if (viewport === null) {
      return undefined;
    }
    if (options.windowed()) {
      const top = viewport.getBoundingClientRect().top;

      const edge =
        Math.min(neighbour, count) * options.rowSize() +
        chromeHeight() -
        options.rows.scrollTop.value;

      return frameTop(top + Math.max(chromeHeight(), Math.min(viewport.clientHeight, edge)));
    }
    const rows = rowsOf(viewport);

    const row = rows.find(
      (candidate) =>
        Number(candidate.getAttribute('aria-rowindex')) - options.headRows() - 1 === neighbour,
    );

    const last = rows.at(-1);

    if (row !== undefined) {
      return frameTop(row.getBoundingClientRect().top);
    }
    return last === undefined ? undefined : frameTop(last.getBoundingClientRect().bottom);
  };

  const follow = (state: ReorderState): void => {
    if (state.phase === 'idle' || state.phase === 'pending') {
      drop.value = undefined;
      ghost.value = undefined;
      return;
    }
    const source = placeOf(state.from);

    drop.value = dropAt(state.from, state.to);

    ghost.value =
      state.phase === 'dragging' && source !== undefined
        ? { start: frameTop(state.position) ?? 0, label: options.labelOf(source.row) }
        : undefined;
  };

  const say = (event: ReorderEvent): void => {
    const source = placeOf(event.from);

    if (source === undefined) {
      return;
    }
    const texts = options.messages.value;
    const row = options.labelOf(source.row);
    const count = source.siblings.count;

    switch (event.type) {
      case 'grabbed':
        options.announce(texts.rowGrabbed({ row, position: source.siblings.index + 1, count }));
        break;
      case 'moved':
        options.announce(
          texts.rowMoved({
            row,
            position: finalIndex(source.siblings, event.from, event.to) + 1,
            count,
          }),
        );

        options.reveal(event.to);
        break;
      case 'dropped':
        options.announce(
          texts.rowDropped({
            row,
            position: finalIndex(source.siblings, event.from, event.to) + 1,
            count,
          }),
        );

        options.moved(event.to);
        break;
      case 'cancelled':
        options.announce(texts.rowDragCancelled({ row }));
        break;
    }
  };

  const reorder = useReorder({
    axis: 'y',
    count: options.rowCount,
    container: options.viewport,
    indexAt: passedOf,
    canMove: sameParent,
    onMove: move,
    onChange: follow,
    onEvent: say,
  });

  const dragging = computed(() => {
    const state = reorder.state.value;
    return state.phase === 'idle' || state.phase === 'pending' ? undefined : state.from;
  });

  return {
    dragging,
    drop,
    ghost,
    grab: (position, event) => {
      if (options.enabled()) {
        event.preventDefault();
        reorder.onPointerdown(position, event);
      }
    },
    onKeydown: (event, position) => {
      if (position === undefined || !options.enabled()) {
        return false;
      }
      if (reorder.onKeydown(position, event)) {
        event.preventDefault();
        return true;
      }
      return false;
    },
  };
};

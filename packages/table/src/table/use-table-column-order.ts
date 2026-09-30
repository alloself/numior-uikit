import { computed, ref, type ComputedRef, type Ref } from 'vue';
import { useReorder, type ReorderState } from '@numior/primitives';
import type { PlacedColumn, TableLayout } from './table-layout';
import { movedKeys, orderLeaves } from './table-order';
import type { NuiTableMessages } from './table.messages';
import type {
  TableDropMark,
  TableGhost,
  TablePaneName,
  NuiTableColumn,
  NuiTableColumnOrder,
  NuiTableGripProps,
} from './table.types';

export interface TableColumnOrderOptions<T> {
  readonly order: Ref<NuiTableColumnOrder>;
  readonly leaves: () => readonly NuiTableColumn<T>[];
  readonly layout: () => TableLayout;
  readonly viewport: () => HTMLElement | null;
  readonly frame: () => HTMLElement | null;
  readonly columnAt: (key: string) => NuiTableColumn<T>;
  readonly isRtl: () => boolean;
  readonly messages: ComputedRef<NuiTableMessages>;
  readonly announce: (text: string) => void;
  readonly refocus: (key: string) => void;
}

export interface TableColumnOrder {
  readonly dragging: ComputedRef<string | undefined>;
  readonly drop: Readonly<Ref<TableDropMark | undefined>>;
  readonly ghost: Readonly<Ref<TableGhost | undefined>>;
  reorderable(key: string): boolean;
  gripOf(key: string): NuiTableGripProps | undefined;
  grab(key: string, event: PointerEvent): void;
  onKeydown(key: string, event: KeyboardEvent): boolean;
}

interface HeadCell {
  readonly slot: number;
  readonly visual: number;
  readonly pane: TablePaneName;
  readonly rect: DOMRect;
}

interface Grab {
  readonly offset: number;
  readonly size: number;
}

const HEAD_CELL = '.nui-table__row--head > [role="columnheader"][aria-colindex]';
const NO_GRAB: Grab = { offset: 0, size: 0 };

const grabOf = (event: PointerEvent, rtl: boolean): Grab => {
  const cell = event.target instanceof Element ? event.target.closest(HEAD_CELL) : null;

  if (cell === null) {
    return NO_GRAB;
  }
  const rect = cell.getBoundingClientRect();

  return {
    offset: rtl ? rect.right - event.clientX : event.clientX - rect.left,
    size: rect.width,
  };
};

const slotsOf = (layout: TableLayout): PlacedColumn[] =>
  layout.visual.filter((column) => column.kind === 'data');

const headCells = (viewport: HTMLElement | null, slots: readonly PlacedColumn[]): HeadCell[] => {
  const byVisual = new Map(
    slots.map((column, slot) => [
      column.visual,
      { slot, visual: column.visual, pane: column.pane },
    ]),
  );

  return [...(viewport?.querySelectorAll<HTMLElement>(HEAD_CELL) ?? [])].flatMap((cell) => {
    const entry = byVisual.get(Number(cell.getAttribute('aria-colindex')) - 1);
    return entry === undefined ? [] : [{ ...entry, rect: cell.getBoundingClientRect() }];
  });
};

const startEdge = (rect: DOMRect, rtl: boolean): number => (rtl ? rect.right : rect.left);

const endEdge = (rect: DOMRect, rtl: boolean): number => (rtl ? rect.left : rect.right);

const centreOf = (rect: DOMRect): number => (rect.left + rect.right) / 2;

const othersOf = (slots: readonly PlacedColumn[], from: number): PlacedColumn[] =>
  slots.filter((_, slot) => slot !== from);

export const useTableColumnOrder = <T>(options: TableColumnOrderOptions<T>): TableColumnOrder => {
  const drop = ref<TableDropMark>();
  const ghost = ref<TableGhost>();
  let held = NO_GRAB;

  const reorderable = (key: string): boolean => options.columnAt(key).reorderable !== false;

  const passedOf = (client: number, from: number): number => {
    const slots = slotsOf(options.layout());
    const rtl = options.isRtl();
    const cells = headCells(options.viewport(), slots);
    const past = (x: number): boolean => (rtl ? client < x : client > x);
    const centre = cells.filter((cell) => cell.pane === 'centre');
    const first = centre[0];
    const last = centre.at(-1);
    let passed = cells.filter((cell) => cell.slot !== from && past(centreOf(cell.rect))).length;

    if (first !== undefined && past(startEdge(first.rect, rtl))) {
      passed += othersOf(slots, from).filter(
        (column) => column.pane === 'centre' && column.visual < first.visual,
      ).length;
    }
    if (last !== undefined && past(endEdge(last.rect, rtl))) {
      passed += othersOf(slots, from).filter(
        (column) => column.pane === 'centre' && column.visual > last.visual,
      ).length;
    }
    return Math.min(slots.length - 1, passed);
  };

  const withinPane = (from: number, to: number): boolean => {
    const slots = slotsOf(options.layout());
    const pane = slots[from]?.pane;
    const others = othersOf(slots, from);
    const first = others.findIndex((column) => column.pane === pane);
    const count = others.filter((column) => column.pane === pane).length;
    const start = first < 0 ? 0 : first;

    return to >= start && to <= start + count;
  };

  const apply = (from: number, to: number): void => {
    const slots = slotsOf(options.layout());
    const source = slots[from];

    if (source === undefined) {
      return;
    }
    const others = othersOf(slots, from);
    const target = others[to];
    const previous = others[to - 1];
    const keys = orderLeaves(options.leaves(), options.order.value).map((leaf) => leaf.key);

    if (target !== undefined) {
      options.order.value = movedKeys(keys, source.key, target.key, false);
    } else if (previous !== undefined) {
      options.order.value = movedKeys(keys, source.key, previous.key, true);
    }

    options.announce(
      options.messages.value.columnMoved({
        column: options.columnAt(source.key).label,
        position: to + 1,
        count: slots.length,
      }),
    );
  };

  const toStart = (client: number, frame: HTMLElement): number => {
    const rect = frame.getBoundingClientRect();
    return options.isRtl() ? rect.right - client : client - rect.left;
  };

  const dropAt = (from: number, to: number): number | undefined => {
    const frame = options.frame();
    const slots = slotsOf(options.layout());
    const others = othersOf(slots, from);
    const cells = headCells(options.viewport(), slots);
    const rtl = options.isRtl();

    const cellOf = (column: PlacedColumn | undefined): HeadCell | undefined =>
      column === undefined ? undefined : cells.find((cell) => slots[cell.slot]?.key === column.key);

    const target = cellOf(others[to]);
    const previous = cellOf(others[to - 1]);

    if (frame === null) {
      return undefined;
    }
    if (target !== undefined) {
      return toStart(startEdge(target.rect, rtl), frame);
    }
    return previous === undefined ? undefined : toStart(endEdge(previous.rect, rtl), frame);
  };

  const follow = (state: ReorderState): void => {
    const frame = options.frame();

    if (state.phase !== 'dragging' || frame === null) {
      drop.value = undefined;
      ghost.value = undefined;
      return;
    }
    const source = slotsOf(options.layout())[state.from];
    const room = frame.getBoundingClientRect().width;
    const start = toStart(state.position, frame) - held.offset;

    const line = dropAt(state.from, state.to);

    drop.value = line === undefined ? undefined : { kind: 'line', start: line };

    ghost.value = {
      start: Math.max(0, Math.min(room - held.size, start)),
      size: held.size,
      label: source === undefined ? '' : options.columnAt(source.key).label,
    };
  };

  const reorder = useReorder({
    axis: 'x',
    count: () => slotsOf(options.layout()).length,
    container: options.viewport,
    indexAt: passedOf,
    canMove: withinPane,
    onMove: apply,
    onChange: follow,
    rtl: options.isRtl,
  });

  const dragging = computed(() => {
    const state = reorder.state.value;
    return state.phase === 'dragging' ? slotsOf(options.layout())[state.from]?.key : undefined;
  });

  const slotOf = (key: string): number =>
    slotsOf(options.layout()).findIndex((column) => column.key === key);

  const grab = (key: string, event: PointerEvent): void => {
    const from = slotOf(key);

    if (!reorderable(key) || from < 0) {
      return;
    }
    event.preventDefault();
    held = grabOf(event, options.isRtl());
    reorder.onPointerdown(from, event);
  };

  const onKeydown = (key: string, event: KeyboardEvent): boolean => {
    const arrow = event.key === 'ArrowLeft' || event.key === 'ArrowRight';

    if (!arrow || !event.altKey || !event.shiftKey || event.ctrlKey || event.metaKey) {
      return false;
    }
    event.preventDefault();

    const from = slotOf(key);
    const forward = (event.key === 'ArrowRight') !== options.isRtl();
    const to = from + (forward ? 1 : -1);

    if (!reorderable(key) || from < 0 || to < 0 || !withinPane(from, to)) {
      return true;
    }
    apply(from, to);
    options.refocus(key);
    return true;
  };

  return {
    dragging,
    drop,
    ghost,
    reorderable,
    gripOf: (key) => (reorderable(key) ? { active: dragging.value === key } : undefined),
    grab,
    onKeydown,
  };
};

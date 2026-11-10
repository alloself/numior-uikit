import { computed, onScopeDispose, ref, type ComputedRef, type Ref, type ShallowRef } from 'vue';
import { Key, ReorderPhase, useReorder, type ReorderState } from '@numior/primitives';
import {
  TableNodeKind,
  type TableEngine,
  type TableNode,
  type TableRowNode,
  type TableSiblings,
} from '../engine';
import { OWN_BODY_ROWS, rowPositionOf } from './table-dom';
import type { NuiTableMessages } from './table.messages';
import {
  RowZone,
  type NuiTableReorderEvent,
  type NuiTableCellPosition,
  type TableDropInset,
  type TableDropMark,
  type TableGhost,
} from './table.types';

export interface TableRowDragOptions<T> {
  readonly enabled: () => boolean;
  readonly engine: ShallowRef<TableEngine<T>>;
  readonly viewport: () => HTMLElement | null;
  readonly frame: () => HTMLElement | null;
  readonly pageStart: () => number;
  readonly rowCount: () => number;
  readonly rowSize: () => number;
  readonly leading: () => number;
  readonly nestDelay: () => number;
  readonly isRtl: () => boolean;
  readonly canNest: (row: T) => boolean;
  readonly childCount: (row: T) => number;
  readonly labelOf: (row: T) => string;
  readonly messages: ComputedRef<NuiTableMessages>;
  readonly announce: (text: string) => void;
  readonly refocus: (row: T) => void;
  readonly emit: (event: NuiTableReorderEvent<T>) => void;
}

export interface TableRowDrag {
  readonly dragging: ComputedRef<number | undefined>;
  readonly drop: Readonly<Ref<TableDropMark | undefined>>;
  readonly ghost: Readonly<Ref<TableGhost | undefined>>;
  grab(position: number, event: PointerEvent): void;
  onKeydown(event: KeyboardEvent, body: NuiTableCellPosition | undefined): boolean;
}

interface RowPlace<T> {
  readonly position: number;
  readonly node: TableRowNode<T>;
  readonly siblings: TableSiblings<T>;
}

interface RowTarget {
  readonly position: number;
  readonly zone: RowZone;
}

interface RowDestination<T> {
  readonly parent: T | undefined;
  readonly parentIndex: number;
  readonly index: number;
  readonly count: number;
  readonly level: number;
}

interface Grab {
  readonly offset: number;
  readonly size: number;
}

interface RenderedRow {
  readonly position: number;
  readonly element: HTMLElement;
  readonly rect: DOMRect;
}

interface Hold {
  readonly position: number;
  readonly since: number;
}

const BODY_ROW = '.nui-table__body > [role="row"]';
const BEFORE_EDGE = 0.3;
const AFTER_EDGE = 0.7;
const NO_GRAB: Grab = { offset: 0, size: 0 };

const rowRect = (row: Element): DOMRect => (row.firstElementChild ?? row).getBoundingClientRect();

const belongsTo = (node: TableNode<unknown> | undefined, level: number): boolean =>
  node?.kind === TableNodeKind.Detail || (node?.kind === TableNodeKind.Row && node.level > level);

const grabOf = (event: PointerEvent, fallback: number): Grab => {
  const row = event.target instanceof Element ? event.target.closest(BODY_ROW) : null;

  if (row === null) {
    return { offset: 0, size: fallback };
  }
  const rect = rowRect(row);

  return { offset: event.clientY - rect.top, size: rect.height || fallback };
};

const zoneOf = (clientY: number, rect: DOMRect): RowZone => {
  const share = rect.height > 0 ? (clientY - rect.top) / rect.height : 0.5;

  if (share < BEFORE_EDGE) {
    return 'before';
  }
  return share > AFTER_EDGE ? 'after' : 'inside';
};

const halfOf = (clientY: number, rect: DOMRect): RowZone =>
  clientY < rect.top + rect.height / 2 ? 'before' : 'after';

const rowUnder = (clientY: number, rows: readonly RenderedRow[]): RowTarget | undefined => {
  const first = rows[0];
  const lastRow = rows.at(-1);

  if (first === undefined || lastRow === undefined) {
    return undefined;
  }
  const hit = rows.find((row) => clientY >= row.rect.top && clientY < row.rect.bottom);

  if (hit !== undefined) {
    return { position: hit.position, zone: zoneOf(clientY, hit.rect) };
  }
  return clientY < first.rect.top
    ? { position: first.position, zone: 'before' }
    : { position: lastRow.position, zone: 'after' };
};

const isArrow = (key: string): boolean =>
  key === Key.ArrowUp || key === Key.ArrowDown || key === Key.ArrowLeft || key === Key.ArrowRight;

const isChord = (event: KeyboardEvent): boolean =>
  isArrow(event.key) && event.altKey && event.shiftKey && !event.ctrlKey && !event.metaKey;

export const useTableRowDrag = <T>(options: TableRowDragOptions<T>): TableRowDrag => {
  const drop = ref<TableDropMark>();
  const ghost = ref<TableGhost>();
  let held = NO_GRAB;
  let target: RowTarget | undefined;
  let hold: Hold | undefined;
  let timer = 0;
  let last: ReorderState = { phase: 'idle' };

  const placeOf = (position: number): RowPlace<T> | undefined => {
    const engine = options.engine.value;
    const node = engine.nodeAt(options.pageStart() + position);
    const siblings = engine.siblingsAt(options.pageStart() + position);

    return node?.kind === TableNodeKind.Row && siblings !== undefined
      ? { position, node, siblings }
      : undefined;
  };

  const subtreeEnd = (from: number): number => {
    const source = placeOf(from);
    const count = options.rowCount();
    let end = from + 1;

    if (source === undefined) {
      return end;
    }
    while (end < count) {
      const node = options.engine.value.nodeAt(options.pageStart() + end);

      if (!belongsTo(node, source.node.level)) {
        break;
      }
      end += 1;
    }
    return end;
  };

  const renderedRows = (from: number): RenderedRow[] => {
    const end = subtreeEnd(from);

    return [...(options.viewport()?.querySelectorAll<HTMLElement>(OWN_BODY_ROWS) ?? [])].flatMap(
      (element) => {
        const position = rowPositionOf(element, options.leading());

        return position >= from && position < end
          ? []
          : [{ position, element, rect: rowRect(element) }];
      },
    );
  };

  const childAfter = (place: RowPlace<T>): RowPlace<T> | undefined => {
    const next = placeOf(place.position + 1);
    return next !== undefined && next.node.level === place.node.level + 1 ? next : undefined;
  };

  const spotOf = (place: RowPlace<T>, zone: RowZone): RowDestination<T> => {
    const beside = (index: number): RowDestination<T> => ({
      parent: place.siblings.parent,
      parentIndex: place.siblings.parentIndex,
      index,
      count: place.siblings.count,
      level: place.node.level,
    });

    const within = (index: number): RowDestination<T> => ({
      parent: place.node.row,
      parentIndex: place.node.index,
      index,
      count: options.childCount(place.node.row),
      level: place.node.level + 1,
    });

    switch (zone) {
      case RowZone.Before:
        return beside(place.siblings.index);
      case RowZone.After:
        return childAfter(place) === undefined ? beside(place.siblings.index + 1) : within(0);
      case RowZone.Inside:
        return within(options.childCount(place.node.row));
    }
  };

  const destinationOf = (from: number, at: RowTarget): RowDestination<T> | undefined => {
    const source = placeOf(from);
    const place = placeOf(at.position);

    if (source === undefined || place === undefined) {
      return undefined;
    }
    const spot = spotOf(place, at.zone);
    const same = spot.parentIndex === source.siblings.parentIndex;
    const index = same && source.siblings.index < spot.index ? spot.index - 1 : spot.index;

    return { ...spot, index, count: same ? spot.count : spot.count + 1 };
  };

  const staysPut = (from: number, destination: RowDestination<T>): boolean => {
    const source = placeOf(from);

    return (
      source !== undefined &&
      destination.parentIndex === source.siblings.parentIndex &&
      destination.index === source.siblings.index
    );
  };

  const settledZone = (
    at: RowTarget,
    place: RowPlace<T>,
    rect: DOMRect,
    clientY: number,
  ): RowZone => {
    if (at.zone !== RowZone.Inside) {
      hold = undefined;
      return at.zone;
    }
    if (!options.canNest(place.node.row)) {
      hold = undefined;
      return halfOf(clientY, rect);
    }
    const now = Date.now();

    if (hold === undefined || hold.position !== at.position) {
      hold = { position: at.position, since: now };
    }
    if (now - hold.since >= options.nestDelay()) {
      return 'inside';
    }
    window.clearTimeout(timer);
    timer = window.setTimeout(() => follow(last), options.nestDelay() - (now - hold.since));
    return halfOf(clientY, rect);
  };

  const targetAt = (clientY: number, from: number): RowTarget | undefined => {
    const rows = renderedRows(from);
    const raw = rowUnder(clientY, rows);
    const place = raw === undefined ? undefined : placeOf(raw.position);
    const rendered = rows.find((row) => row.position === raw?.position);

    if (raw === undefined || place === undefined || rendered === undefined) {
      return undefined;
    }
    return { position: raw.position, zone: settledZone(raw, place, rendered.rect, clientY) };
  };

  const frameTop = (clientY: number): number | undefined => {
    const frame = options.frame();
    return frame === null ? undefined : clientY - frame.getBoundingClientRect().top;
  };

  const insetOf = (element: HTMLElement, level: number): TableDropInset | undefined => {
    const frame = options.frame();
    const tree = element.querySelector('.nui-table__tree');

    if (frame === null || tree === null) {
      return undefined;
    }
    const outer = frame.getBoundingClientRect();
    const inner = tree.getBoundingClientRect();

    return { start: options.isRtl() ? outer.right - inner.right : inner.left - outer.left, level };
  };

  const markOf = (from: number, at: RowTarget): TableDropMark | undefined => {
    const rendered = renderedRows(from).find((row) => row.position === at.position);
    const place = placeOf(at.position);

    if (rendered === undefined || place === undefined) {
      return undefined;
    }
    const top = frameTop(rendered.rect.top) ?? 0;

    switch (at.zone) {
      case RowZone.Inside:
        return { kind: 'box', start: top, size: rendered.rect.height };
      case RowZone.Before:
        return { kind: 'line', start: top, inset: insetOf(rendered.element, place.node.level) };
      case RowZone.After: {
        const nested = childAfter(place) !== undefined;

        return {
          kind: 'line',
          start: top + rendered.rect.height,
          inset: insetOf(rendered.element, place.node.level + (nested ? 1 : 0)),
        };
      }
    }
  };

  const say = (source: RowPlace<T>, destination: RowDestination<T>): void => {
    const texts = options.messages.value;
    const row = options.labelOf(source.node.row);
    const position = destination.index + 1;
    const count = destination.count;

    if (destination.parentIndex === source.siblings.parentIndex) {
      options.announce(texts.rowMoved({ row, position, count }));
    } else if (destination.parent === undefined) {
      options.announce(texts.rowMovedToRoot({ row, position, count }));
    } else {
      const parent = options.labelOf(destination.parent);
      options.announce(texts.rowMovedInto({ row, parent, position, count }));
    }
  };

  const commit = (from: number, destination: RowDestination<T> | undefined): boolean => {
    const source = placeOf(from);

    if (source === undefined || destination === undefined || staysPut(from, destination)) {
      return false;
    }

    options.emit({
      row: source.node.row,
      from: source.siblings.index,
      to: destination.index,
      parent: source.siblings.parent,
      toParent: destination.parent,
    });

    say(source, destination);
    options.refocus(source.node.row);
    return true;
  };

  const clear = (): void => {
    window.clearTimeout(timer);
    hold = undefined;
    target = undefined;
    drop.value = undefined;
    ghost.value = undefined;
  };

  const follow = (state: ReorderState): void => {
    const frame = options.frame();

    last = state;

    if (state.phase !== ReorderPhase.Dragging || frame === null) {
      clear();
      return;
    }
    const source = placeOf(state.from);
    const at = targetAt(state.position, state.from);
    const room = frame.getBoundingClientRect().height;
    const start = state.position - frame.getBoundingClientRect().top - held.offset;

    target = at;
    drop.value = at === undefined ? undefined : markOf(state.from, at);

    ghost.value =
      source === undefined
        ? undefined
        : {
            start: Math.max(0, Math.min(room - held.size, start)),
            size: held.size,
            label: options.labelOf(source.node.row),
          };
  };

  const reorder = useReorder({
    axis: 'y',
    count: options.rowCount,
    container: options.viewport,
    indexAt: (client, from) => rowUnder(client, renderedRows(from))?.position ?? from,
    canMove: (from, to) => to !== from,
    onMove: (from) => {
      if (target !== undefined) {
        commit(from, destinationOf(from, target));
      }
    },
    onChange: follow,
  });

  const dragging = computed(() => {
    const state = reorder.state.value;
    return state.phase === ReorderPhase.Dragging ? state.from : undefined;
  });

  const ancestorOf = (place: RowPlace<T>): RowPlace<T> | undefined => {
    for (let position = place.position - 1; position >= 0; position -= 1) {
      const candidate = placeOf(position);

      if (candidate !== undefined && candidate.node.level < place.node.level) {
        return candidate;
      }
    }
    return undefined;
  };

  const previousSibling = (place: RowPlace<T>): RowPlace<T> | undefined => {
    for (let position = place.position - 1; position >= 0; position -= 1) {
      const candidate = placeOf(position);

      if (candidate === undefined || candidate.node.level < place.node.level) {
        return undefined;
      }
      if (candidate.node.level === place.node.level) {
        return candidate;
      }
    }
    return undefined;
  };

  const chordDestination = (source: RowPlace<T>, key: string): RowDestination<T> | undefined => {
    const forward = options.isRtl() ? Key.ArrowLeft : Key.ArrowRight;

    const beside = (index: number): RowDestination<T> => ({
      parent: source.siblings.parent,
      parentIndex: source.siblings.parentIndex,
      index,
      count: source.siblings.count,
      level: source.node.level,
    });

    switch (key) {
      case Key.ArrowUp:
        return source.siblings.index > 0 ? beside(source.siblings.index - 1) : undefined;
      case Key.ArrowDown:
        return source.siblings.index < source.siblings.count - 1
          ? beside(source.siblings.index + 1)
          : undefined;
      case forward:
        return nestDestination(source);
      default:
        return liftDestination(source);
    }
  };

  const nestDestination = (source: RowPlace<T>): RowDestination<T> | undefined => {
    const previous = previousSibling(source);

    if (previous === undefined || !options.canNest(previous.node.row)) {
      return undefined;
    }
    const count = options.childCount(previous.node.row);

    return {
      parent: previous.node.row,
      parentIndex: previous.node.index,
      index: count,
      count: count + 1,
      level: previous.node.level + 1,
    };
  };

  const liftDestination = (source: RowPlace<T>): RowDestination<T> | undefined => {
    const parent = ancestorOf(source);

    if (parent === undefined) {
      return undefined;
    }
    return {
      parent: parent.siblings.parent,
      parentIndex: parent.siblings.parentIndex,
      index: parent.siblings.index + 1,
      count: parent.siblings.count + 1,
      level: parent.node.level,
    };
  };

  onScopeDispose(() => {
    window.clearTimeout(timer);
  });

  return {
    dragging,
    drop,
    ghost,
    grab: (position, event) => {
      if (!options.enabled()) {
        return;
      }

      event.preventDefault();
      held = grabOf(event, options.rowSize());
      reorder.onPointerdown(position, event);
    },
    onKeydown: (event, body) => {
      if (body === undefined || !options.enabled() || !isChord(event)) {
        return false;
      }
      event.preventDefault();

      const source = placeOf(body.row);

      if (source !== undefined) {
        commit(body.row, chordDestination(source, event.key));
      }
      return true;
    },
  };
};

import { onMounted, ref, watch, type Ref, type ShallowRef } from 'vue';
import { createIntent, Key, type VirtualList } from '@numior/primitives';
import { controlled, DETAIL_CELL, OWN_ACTIVE_CELL } from './table-dom';
import { nextCell, type TableEdgeOf, type TableLastOf } from './table-keys';
import {
  TableHeaderTargetKind,
  TableRevealAxis,
  type NuiTableCellPosition,
  type TableHeaderTarget,
} from './table.types';

export interface TableFocusOptions {
  readonly viewport: Readonly<ShallowRef<HTMLElement | null>>;
  readonly active: Ref<NuiTableCellPosition>;
  readonly rows: VirtualList;
  readonly columns: VirtualList;
  readonly merges: () => unknown;
  readonly rowCount: () => number;
  readonly bodyRows: () => number;
  readonly pinnedRows: () => number;
  readonly headRows: () => number;
  readonly colCount: () => number;
  readonly firstCol: () => number;
  readonly pageRows: (row: number, forward: boolean) => number;
  readonly centreIndexOf: (visual: number) => number | undefined;
  readonly columnIndexOf: (key: string) => number;
  readonly isRtl: () => boolean;
  readonly windowed: () => boolean;
  readonly lead: () => NuiTableCellPosition;
  readonly settle: (focused: NuiTableCellPosition) => NuiTableCellPosition;
  readonly leave: (from: NuiTableCellPosition, key: string) => NuiTableCellPosition;
  readonly edge: TableEdgeOf;
  readonly last: TableLastOf;
}

export interface TableFocus {
  activeIn(position: number): number;
  reveal(target: NuiTableCellPosition, axis?: TableRevealAxis): boolean;
  focusCell(target: NuiTableCellPosition, scroll?: boolean): void;
  focusHeader(target: TableHeaderTarget): void;
  notePress(target: EventTarget | null): void;
  reclaim(): void;
  onKeydown(event: KeyboardEvent): void;
  onFocusin(target: EventTarget | null): void;
}

const CELL = '.nui-table__cell';

const DATA_CELL = 'td.nui-table__cell';

const ariaIndex = (element: Element | null | undefined, name: string): number => {
  const value = Number(element?.getAttribute(name));
  return Number.isInteger(value) ? value : 0;
};

const positionOf = (
  target: EventTarget | null,
  headRows: number,
  column: number,
): NuiTableCellPosition | undefined => {
  const cell = target instanceof Element ? target.closest(CELL) : null;
  const row = ariaIndex(cell?.closest('[role="row"]'), 'aria-rowindex');

  const col =
    cell?.classList.contains(DETAIL_CELL) === true ? column + 1 : ariaIndex(cell, 'aria-colindex');

  return row >= headRows && col > 0 ? { row: row - headRows - 1, col: col - 1 } : undefined;
};

const isCell = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement && target.matches(CELL);

const samePosition = (a: NuiTableCellPosition, b: NuiTableCellPosition): boolean =>
  a.row === b.row && a.col === b.col;

export const useTableFocus = (options: TableFocusOptions): TableFocus => {
  const intent = createIntent<boolean>();
  const requests = ref(0);
  let pressedCell: HTMLElement | null = null;
  const placement = createIntent<TableHeaderTarget>();
  const placements = ref(0);

  const revealRow = (row: number): void => {
    const body = row - options.pinnedRows();

    if (body < 0 || body >= options.bodyRows()) {
      return;
    }

    options.rows.scrollTo(body, { align: 'auto' });
  };

  const revealColumn = (col: number): void => {
    const centre = options.centreIndexOf(col);

    if (centre === undefined) {
      return;
    }

    options.columns.scrollTo(centre, { align: 'auto' });
  };

  const reveal = (target: NuiTableCellPosition, axis: TableRevealAxis = 'both'): boolean => {
    if (!options.windowed()) {
      return false;
    }
    if (axis === TableRevealAxis.Both || axis === TableRevealAxis.Row) {
      revealRow(target.row);
    }
    if (axis === TableRevealAxis.Both || axis === TableRevealAxis.Col) {
      revealColumn(target.col);
    }
    return true;
  };

  const focusCell = (target: NuiTableCellPosition, scroll = true): void => {
    options.active.value = target;

    if (scroll) {
      reveal(target);
    }
    intent.set(!scroll);
    requests.value += 1;
  };

  const headerColumn = (target: TableHeaderTarget): number => {
    const last = Math.max(0, options.colCount() - 1);

    switch (target.kind) {
      case TableHeaderTargetKind.Column:
        return Math.min(Math.max(0, options.columnIndexOf(target.key)), last);
      case TableHeaderTargetKind.Slot:
        return Math.min(target.index, last);
    }
  };

  const onKeydown = (event: KeyboardEvent): void => {
    if (!isCell(event.target) || event.altKey || event.metaKey || event.shiftKey) {
      return;
    }

    const from = options.leave(options.active.value, event.key);

    const target = nextCell({ key: event.key, ctrl: event.ctrlKey }, from, {
      rows: options.rowCount(),
      cols: options.colCount(),
      page: options.pageRows(options.active.value.row, event.key === Key.PageDown),
      rtl: options.isRtl(),
      first: options.firstCol(),
      edge: options.edge,
      last: options.last,
    });

    if (target === undefined) {
      return;
    }
    event.preventDefault();
    options.active.value = target;
    reveal(target);
    intent.set(false);
  };

  const onFocusin = (target: EventTarget | null): void => {
    const focused = positionOf(target, options.headRows(), options.active.value.col);
    const position = focused === undefined ? undefined : options.settle(focused);

    if (position === undefined || samePosition(position, options.active.value)) {
      return;
    }

    options.active.value = position;
  };

  watch(placements, () => {
    const target = placement.take();

    if (target === undefined) {
      return;
    }

    focusCell({ row: -1, col: headerColumn(target) });
  });

  onMounted(() => {
    let owned: HTMLElement | undefined;

    watch(
      [options.active, requests],
      () => {
        const quiet = intent.take();

        if (quiet === undefined) {
          return;
        }

        options.viewport.value
          ?.querySelector<HTMLElement>(OWN_ACTIVE_CELL)
          ?.focus({ preventScroll: quiet || options.windowed() });
      },
      { flush: 'post' },
    );

    watch(
      [options.rows.range, options.merges],
      () => {
        const focused = document.activeElement;

        owned =
          focused instanceof HTMLElement && options.viewport.value?.contains(focused) === true
            ? focused
            : undefined;
      },
      { flush: 'pre' },
    );

    watch(
      [options.rows.range, options.merges],
      () => {
        const viewport = options.viewport.value;
        const held = owned;

        if (held === undefined || viewport === null || viewport.contains(document.activeElement)) {
          return;
        }

        if (viewport.contains(held)) {
          held.focus({ preventScroll: true });
        }
        if (viewport.contains(document.activeElement)) {
          return;
        }

        viewport.querySelector<HTMLElement>(OWN_ACTIVE_CELL)?.focus({ preventScroll: true });
      },
      { flush: 'post' },
    );
  });

  return {
    activeIn: (position) => {
      const shown = options.lead();

      return shown.row === position ? shown.col + 1 : 0;
    },
    reveal,
    focusCell,
    notePress: (target) => {
      const asleep = options.viewport.value?.ownerDocument.hasFocus() === false;

      pressedCell =
        asleep && target instanceof Element && !controlled(target)
          ? target.closest<HTMLElement>(DATA_CELL)
          : null;
    },
    reclaim: () => {
      const owner = options.viewport.value?.ownerDocument;

      if (owner?.activeElement === owner?.body) {
        pressedCell?.focus({ preventScroll: true });
      }
      pressedCell = null;
    },
    focusHeader: (target) => {
      placement.set(target);
      placements.value += 1;
    },
    onKeydown,
    onFocusin,
  };
};

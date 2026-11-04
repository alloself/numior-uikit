import { onMounted, ref, watch, type Ref, type ShallowRef } from 'vue';
import { createIntent, Key, type VirtualList } from '@numior/primitives';
import { DETAIL_CELL, OWN_ACTIVE_CELL } from './table-dom';
import { nextCell, type TableEdgeOf } from './table-keys';
import {
  TableHeaderTargetKind,
  TableRevealAxis,
  type TableCellPosition,
  type TableHeaderTarget,
} from './table.types';

export interface TableFocusOptions {
  readonly viewport: Readonly<ShallowRef<HTMLElement | null>>;
  readonly active: Ref<TableCellPosition>;
  readonly rows: VirtualList;
  readonly columns: VirtualList;
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
  readonly lead: () => TableCellPosition;
  readonly settle: (focused: TableCellPosition) => TableCellPosition;
  readonly leave: (from: TableCellPosition, key: string) => TableCellPosition;
  readonly edge: TableEdgeOf;
}

export interface TableFocus {
  activeIn(position: number): number;
  reveal(target: TableCellPosition, axis?: TableRevealAxis): void;
  focusCell(target: TableCellPosition, scroll?: boolean): void;
  focusHeader(target: TableHeaderTarget): void;
  onKeydown(event: KeyboardEvent): void;
  onFocusin(target: EventTarget | null): void;
}

const CELL = '.nui-table__cell';

const ariaIndex = (element: Element | null | undefined, name: string): number => {
  const value = Number(element?.getAttribute(name));
  return Number.isInteger(value) ? value : 0;
};

const positionOf = (
  target: EventTarget | null,
  headRows: number,
  column: number,
): TableCellPosition | undefined => {
  const cell = target instanceof Element ? target.closest(CELL) : null;
  const row = ariaIndex(cell?.closest('[role="row"]'), 'aria-rowindex');

  const col =
    cell?.classList.contains(DETAIL_CELL) === true ? column + 1 : ariaIndex(cell, 'aria-colindex');

  return row >= headRows && col > 0 ? { row: row - headRows - 1, col: col - 1 } : undefined;
};

const isCell = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement && target.matches(CELL);

const samePosition = (a: TableCellPosition, b: TableCellPosition): boolean =>
  a.row === b.row && a.col === b.col;

export const useTableFocus = (options: TableFocusOptions): TableFocus => {
  const intent = createIntent<true>();
  const requests = ref(0);
  const placement = createIntent<TableHeaderTarget>();
  const placements = ref(0);

  const revealRow = (row: number): void => {
    const body = row - options.pinnedRows();

    if (body >= 0 && body < options.bodyRows()) {
      options.rows.scrollTo(body, { align: 'auto' });
    }
  };

  const revealColumn = (col: number): void => {
    const centre = options.centreIndexOf(col);

    if (centre !== undefined) {
      options.columns.scrollTo(centre, { align: 'auto' });
    }
  };

  const reveal = (target: TableCellPosition, axis: TableRevealAxis = 'both'): void => {
    if (!options.windowed()) {
      return;
    }
    if (axis === TableRevealAxis.Both || axis === TableRevealAxis.Row) {
      revealRow(target.row);
    }
    if (axis === TableRevealAxis.Both || axis === TableRevealAxis.Col) {
      revealColumn(target.col);
    }
  };

  const focusCell = (target: TableCellPosition, scroll = true): void => {
    options.active.value = target;

    if (scroll) {
      reveal(target);
    }
    intent.set(true);
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
    });

    if (target === undefined) {
      return;
    }
    event.preventDefault();
    options.active.value = target;
    reveal(target);
    intent.set(true);
  };

  const onFocusin = (target: EventTarget | null): void => {
    const focused = positionOf(target, options.headRows(), options.active.value.col);
    const position = focused === undefined ? undefined : options.settle(focused);

    if (position !== undefined && !samePosition(position, options.active.value)) {
      options.active.value = position;
    }
  };

  watch(placements, () => {
    const target = placement.take();

    if (target !== undefined) {
      focusCell({ row: -1, col: headerColumn(target) });
    }
  });

  onMounted(() => {
    let owned = false;

    watch(
      [options.active, requests],
      () => {
        if (intent.take() === true) {
          options.viewport.value
            ?.querySelector<HTMLElement>(OWN_ACTIVE_CELL)
            ?.focus({ preventScroll: options.windowed() });
        }
      },
      { flush: 'post' },
    );

    watch(
      options.rows.range,
      () => {
        owned = options.viewport.value?.contains(document.activeElement) ?? false;
      },
      { flush: 'pre' },
    );

    watch(
      options.rows.range,
      () => {
        const viewport = options.viewport.value;

        if (owned && viewport !== null && !viewport.contains(document.activeElement)) {
          viewport.querySelector<HTMLElement>(OWN_ACTIVE_CELL)?.focus({ preventScroll: true });
        }
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
    focusHeader: (target) => {
      placement.set(target);
      placements.value += 1;
    },
    onKeydown,
    onFocusin,
  };
};

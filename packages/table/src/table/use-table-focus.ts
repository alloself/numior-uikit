import { onMounted, ref, watch, type Ref, type ShallowRef } from 'vue';
import { createIntent, type VirtualList } from '@numior/primitives';
import { nextCell } from './table-keys';
import type { TableCellPosition, TableHeaderTarget } from './table.types';

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
  readonly rowSize: () => number;
  readonly centreIndexOf: (visual: number) => number | undefined;
  readonly columnIndexOf: (key: string) => number;
  readonly isRtl: () => boolean;
  readonly windowed: () => boolean;
}

export interface TableFocus {
  activeIn(position: number): number;
  reveal(target: TableCellPosition): void;
  focusCell(target: TableCellPosition): void;
  focusHeader(target: TableHeaderTarget): void;
  onKeydown(event: KeyboardEvent): void;
  onFocusin(event: FocusEvent): void;
}

const CELL = '.nui-table__cell';
const ACTIVE_CELL = '.nui-table__cell--active';

const ariaIndex = (element: Element | null | undefined, name: string): number => {
  const value = Number(element?.getAttribute(name));
  return Number.isInteger(value) ? value : 0;
};

const positionOf = (
  target: EventTarget | null,
  headRows: number,
): TableCellPosition | undefined => {
  const cell = target instanceof Element ? target.closest(CELL) : null;
  const row = ariaIndex(cell?.closest('[role="row"]'), 'aria-rowindex');
  const col = ariaIndex(cell, 'aria-colindex');

  return row >= headRows && col > 0 ? { row: row - headRows - 1, col: col - 1 } : undefined;
};

const isCell = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement && target.matches(CELL);

const samePosition = (a: TableCellPosition, b: TableCellPosition): boolean =>
  a.row === b.row && a.col === b.col;

const pageSpan = (): number => (typeof window === 'undefined' ? 0 : window.innerHeight);

export const useTableFocus = (options: TableFocusOptions): TableFocus => {
  const intent = createIntent<'cell'>();
  const requests = ref(0);
  const placement = createIntent<TableHeaderTarget>();
  const placements = ref(0);

  const pageRows = (): number => {
    const size = options.rowSize();
    const span = options.rows.viewport.value > 0 ? options.rows.viewport.value : pageSpan();

    return Math.max(1, Math.floor((span - size) / size));
  };

  const reveal = (target: TableCellPosition): void => {
    if (!options.windowed()) {
      return;
    }
    const body = target.row - options.pinnedRows();

    if (body >= 0 && body < options.bodyRows()) {
      options.rows.scrollTo(body, { align: 'auto' });
    }
    const centre = options.centreIndexOf(target.col);

    if (centre !== undefined) {
      options.columns.scrollTo(centre, { align: 'auto' });
    }
  };

  const focusCell = (target: TableCellPosition): void => {
    options.active.value = target;
    reveal(target);
    intent.set('cell');
    requests.value += 1;
  };

  const headerColumn = (target: TableHeaderTarget): number => {
    const last = Math.max(0, options.colCount() - 1);

    switch (target.kind) {
      case 'column':
        return Math.min(Math.max(0, options.columnIndexOf(target.key)), last);
      case 'slot':
        return Math.min(target.index, last);
    }
  };

  const onKeydown = (event: KeyboardEvent): void => {
    if (!isCell(event.target) || event.altKey || event.metaKey || event.shiftKey) {
      return;
    }

    const target = nextCell({ key: event.key, ctrl: event.ctrlKey }, options.active.value, {
      rows: options.rowCount(),
      cols: options.colCount(),
      page: pageRows(),
      rtl: options.isRtl(),
    });

    if (target === undefined) {
      return;
    }
    event.preventDefault();
    options.active.value = target;
    reveal(target);
    intent.set('cell');
  };

  const onFocusin = (event: FocusEvent): void => {
    const position = positionOf(event.target, options.headRows());

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
        if (intent.take() === 'cell') {
          options.viewport.value
            ?.querySelector<HTMLElement>(ACTIVE_CELL)
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
          viewport.querySelector<HTMLElement>(ACTIVE_CELL)?.focus({ preventScroll: true });
        }
      },
      { flush: 'post' },
    );
  });

  return {
    activeIn: (position) =>
      options.active.value.row === position ? options.active.value.col + 1 : 0,
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

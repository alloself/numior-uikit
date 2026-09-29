import { onMounted, ref, watch, type Ref, type ShallowRef } from 'vue';
import { createIntent, type VirtualList } from '@numior/primitives';
import { nextCell } from './grid-keys';
import type { GridCellPosition, GridHeaderTarget } from './data-grid.types';

export interface GridFocusOptions {
  readonly viewport: Readonly<ShallowRef<HTMLElement | null>>;
  readonly active: Ref<GridCellPosition>;
  readonly rows: VirtualList;
  readonly columns: VirtualList;
  readonly rowCount: () => number;
  readonly bodyRows: () => number;
  readonly headRows: () => number;
  readonly colCount: () => number;
  readonly rowSize: () => number;
  readonly centreIndexOf: (visual: number) => number | undefined;
  readonly columnIndexOf: (key: string) => number;
  readonly isRtl: () => boolean;
}

export interface GridFocus {
  activeIn(position: number): number;
  reveal(target: GridCellPosition): void;
  focusCell(target: GridCellPosition): void;
  focusHeader(target: GridHeaderTarget): void;
  onKeydown(event: KeyboardEvent): void;
  onFocusin(event: FocusEvent): void;
}

const CELL = '.nui-grid__cell';
const ACTIVE_CELL = '.nui-grid__cell--active';

const ariaIndex = (element: Element | null | undefined, name: string): number => {
  const value = Number(element?.getAttribute(name));
  return Number.isInteger(value) ? value : 0;
};

const positionOf = (target: EventTarget | null, headRows: number): GridCellPosition | undefined => {
  const cell = target instanceof Element ? target.closest(CELL) : null;
  const row = ariaIndex(cell?.closest('[role="row"]'), 'aria-rowindex');
  const col = ariaIndex(cell, 'aria-colindex');

  return row >= headRows && col > 0 ? { row: row - headRows - 1, col: col - 1 } : undefined;
};

const isCell = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement && target.matches(CELL);

const samePosition = (a: GridCellPosition, b: GridCellPosition): boolean =>
  a.row === b.row && a.col === b.col;

export const useGridFocus = (options: GridFocusOptions): GridFocus => {
  const intent = createIntent<'cell'>();
  const requests = ref(0);
  const placement = createIntent<GridHeaderTarget>();
  const placements = ref(0);

  const pageRows = (): number => {
    const size = options.rowSize();
    return Math.max(1, Math.floor((options.rows.viewport.value - size) / size));
  };

  const reveal = (target: GridCellPosition): void => {
    if (target.row >= 0 && target.row < options.bodyRows()) {
      options.rows.scrollTo(target.row, { align: 'auto' });
    }
    const centre = options.centreIndexOf(target.col);

    if (centre !== undefined) {
      options.columns.scrollTo(centre, { align: 'auto' });
    }
  };

  const focusCell = (target: GridCellPosition): void => {
    options.active.value = target;
    reveal(target);
    intent.set('cell');
    requests.value += 1;
  };

  const headerColumn = (target: GridHeaderTarget): number => {
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
    watch(
      [options.active, requests],
      () => {
        if (intent.take() === 'cell') {
          options.viewport.value
            ?.querySelector<HTMLElement>(ACTIVE_CELL)
            ?.focus({ preventScroll: true });
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

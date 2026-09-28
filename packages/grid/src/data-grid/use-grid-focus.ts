import { onMounted, watch, type Ref, type ShallowRef } from 'vue';
import { createIntent, type VirtualList } from '@numior/primitives';
import { nextCell } from './grid-keys';
import type { GridCellPosition } from './data-grid.types';

export interface GridFocusOptions {
  readonly viewport: Readonly<ShallowRef<HTMLElement | null>>;
  readonly active: Ref<GridCellPosition>;
  readonly rows: VirtualList;
  readonly columns: VirtualList;
  readonly rowCount: () => number;
  readonly colCount: () => number;
  readonly rowSize: () => number;
  readonly centreIndexOf: (visual: number) => number | undefined;
  readonly isRtl: () => boolean;
}

export interface GridFocus {
  activeIn(position: number): number;
  reveal(target: GridCellPosition): void;
  onKeydown(event: KeyboardEvent): void;
  onFocusin(event: FocusEvent): void;
}

const CELL = '.nui-grid__cell';
const ACTIVE_CELL = '.nui-grid__cell--active';

const ariaIndex = (element: Element | null | undefined, name: string): number => {
  const value = Number(element?.getAttribute(name));
  return Number.isInteger(value) ? value : 0;
};

const positionOf = (target: EventTarget | null): GridCellPosition | undefined => {
  const cell = target instanceof Element ? target.closest(CELL) : null;
  const row = ariaIndex(cell?.closest('[role="row"]'), 'aria-rowindex');
  const col = ariaIndex(cell, 'aria-colindex');

  return row > 0 && col > 0 ? { row: row - 2, col: col - 1 } : undefined;
};

const isCell = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement && target.matches(CELL);

const samePosition = (a: GridCellPosition, b: GridCellPosition): boolean =>
  a.row === b.row && a.col === b.col;

export const useGridFocus = (options: GridFocusOptions): GridFocus => {
  const intent = createIntent<'cell'>();

  const pageRows = (): number => {
    const size = options.rowSize();
    return Math.max(1, Math.floor((options.rows.viewport.value - size) / size));
  };

  const reveal = (target: GridCellPosition): void => {
    if (target.row >= 0) {
      options.rows.scrollTo(target.row, { align: 'auto' });
    }
    const centre = options.centreIndexOf(target.col);

    if (centre !== undefined) {
      options.columns.scrollTo(centre, { align: 'auto' });
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
    const position = positionOf(event.target);

    if (position !== undefined && !samePosition(position, options.active.value)) {
      options.active.value = position;
    }
  };

  onMounted(() => {
    watch(
      options.active,
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
    onKeydown,
    onFocusin,
  };
};

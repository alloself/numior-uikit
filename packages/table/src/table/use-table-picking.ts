import { onScopeDispose } from 'vue';
import { edgeDirectionOf, stepCell, type TableSize } from './table-keys';
import type { NuiTableEditMove, NuiTableRange, TableCellPosition } from './table.types';

export interface TablePickingOptions {
  readonly active: () => boolean;
  readonly origin: () => TableCellPosition | undefined;
  readonly locate: (target: EventTarget | null) => TableCellPosition | undefined;
  readonly cellAt: (x: number, y: number) => TableCellPosition | undefined;
  readonly whole: (range: NuiTableRange) => NuiTableRange;
  readonly leave: (from: TableCellPosition, move: NuiTableEditMove) => TableCellPosition;
  readonly bounds: () => TableSize;
  readonly isRtl: () => boolean;
  readonly reveal: (position: TableCellPosition) => void;
  readonly pick: (range: NuiTableRange) => void;
}

export interface TablePicking {
  onPointerdown(event: PointerEvent): boolean;
  onMousedown(event: MouseEvent): boolean;
  onClick(event: MouseEvent): boolean;
  onKeydown(event: KeyboardEvent): boolean;
  reset(): void;
}

interface PickCursor {
  readonly anchor: TableCellPosition;
  readonly focus: TableCellPosition;
}

const samePosition = (a: TableCellPosition, b: TableCellPosition): boolean =>
  a.row === b.row && a.col === b.col;

const isPlain = (event: KeyboardEvent): boolean =>
  !event.altKey && !event.ctrlKey && !event.metaKey;

export const useTablePicking = (options: TablePickingOptions): TablePicking => {
  let cursor: PickCursor | undefined;
  let touched = false;

  const send = (next: PickCursor): void => {
    cursor = next;
    options.pick(options.whole({ from: next.anchor, to: next.focus }));
  };

  const targetOf = (event: Event): TableCellPosition | undefined =>
    options.active() ? options.locate(event.target) : undefined;

  const onMove = (event: PointerEvent): void => {
    const cell = options.cellAt(event.clientX, event.clientY);

    if (cell !== undefined && cursor !== undefined && !samePosition(cell, cursor.focus)) {
      send({ anchor: cursor.anchor, focus: cell });
    }
  };

  const stop = (): void => {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', stop);
    window.removeEventListener('pointercancel', stop);
  };

  const onPointerdown = (event: PointerEvent): boolean => {
    touched = event.pointerType === 'touch';
    const cell = touched || event.button !== 0 ? undefined : targetOf(event);

    if (cell === undefined) {
      return false;
    }
    event.preventDefault();
    send({ anchor: cell, focus: cell });
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);
    return true;
  };

  const onMousedown = (event: MouseEvent): boolean => {
    if (targetOf(event) === undefined) {
      return false;
    }
    event.preventDefault();
    return true;
  };

  const onClick = (event: MouseEvent): boolean => {
    const cell = targetOf(event);

    if (cell === undefined) {
      return false;
    }
    if (touched) {
      send({ anchor: cell, focus: cell });
    }
    return true;
  };

  const onKeydown = (event: KeyboardEvent): boolean => {
    const move = isPlain(event) ? edgeDirectionOf(event.key, options.isRtl()) : undefined;
    const origin = options.origin();

    if (move === undefined || origin === undefined || !options.active()) {
      return false;
    }
    const start = cursor ?? { anchor: origin, focus: origin };
    const next = stepCell(options.leave(start.focus, move), move, options.bounds());

    event.preventDefault();
    send(event.shiftKey ? { anchor: start.anchor, focus: next } : { anchor: next, focus: next });
    options.reveal(next);
    return true;
  };

  onScopeDispose(stop);

  return {
    onPointerdown,
    onMousedown,
    onClick,
    onKeydown,
    reset: () => {
      cursor = undefined;
    },
  };
};

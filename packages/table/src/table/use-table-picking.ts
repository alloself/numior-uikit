import { onScopeDispose } from 'vue';
import { edgeDirectionOf, stepCell, type TableSize } from './table-keys';
import type { NuiTableEditMove, NuiTableRange, NuiTableCellPosition } from './table.types';
import { PointerType } from '@numior/primitives';

export interface TablePickingOptions {
  readonly active: () => boolean;
  readonly origin: () => NuiTableCellPosition | undefined;
  readonly locate: (target: EventTarget | null) => NuiTableCellPosition | undefined;
  readonly cellAt: (x: number, y: number) => NuiTableCellPosition | undefined;
  readonly whole: (range: NuiTableRange) => NuiTableRange;
  readonly leave: (from: NuiTableCellPosition, move: NuiTableEditMove) => NuiTableCellPosition;
  readonly bounds: () => TableSize;
  readonly isRtl: () => boolean;
  readonly reveal: (position: NuiTableCellPosition) => void;
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
  readonly anchor: NuiTableCellPosition;
  readonly focus: NuiTableCellPosition;
}

const samePosition = (a: NuiTableCellPosition, b: NuiTableCellPosition): boolean =>
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

  const targetOf = (event: Event): NuiTableCellPosition | undefined =>
    options.active() ? options.locate(event.target) : undefined;

  const onMove = (event: PointerEvent): void => {
    const cell = options.cellAt(event.clientX, event.clientY);

    if (cell === undefined || cursor === undefined || samePosition(cell, cursor.focus)) {
      return;
    }

    send({ anchor: cursor.anchor, focus: cell });
  };

  const stop = (): void => {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', stop);
    window.removeEventListener('pointercancel', stop);
  };

  const onPointerdown = (event: PointerEvent): boolean => {
    touched = event.pointerType === PointerType.Touch;
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

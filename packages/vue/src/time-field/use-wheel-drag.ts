import { PointerType, usePointerSession } from '@numior/primitives';
import { WheelDragKind } from './time-field.types';

export interface WheelDragOptions {
  readonly element: () => HTMLElement | null;
  readonly release: () => void;
}

export interface WheelDrag {
  holding(): boolean;
  swallowClick(): boolean;
  onPointerdown(event: PointerEvent): void;
}

interface HeldDrag {
  readonly kind: typeof WheelDragKind.Pressed | typeof WheelDragKind.Dragging;
  readonly pointer: number;
  readonly y: number;
  readonly top: number;
}

type DragState = { readonly kind: typeof WheelDragKind.Idle } | HeldDrag;

const IDLE: DragState = { kind: WheelDragKind.Idle };
const DRAG_THRESHOLD = 4;

const advance = (drag: HeldDrag, y: number, element: HTMLElement): HeldDrag => {
  const distance = y - drag.y;

  if (drag.kind === WheelDragKind.Pressed && Math.abs(distance) < DRAG_THRESHOLD) {
    return drag;
  }
  element.style.scrollSnapType = 'none';
  element.style.cursor = 'grabbing';
  element.scrollTop = drag.top - distance;
  return { ...drag, kind: WheelDragKind.Dragging };
};

export const useWheelDrag = (options: WheelDragOptions): WheelDrag => {
  const state: { drag: DragState; dragged: boolean } = { drag: IDLE, dragged: false };
  const pointer = usePointerSession();

  const onMove = (event: PointerEvent): void => {
    const { drag } = state;
    const element = options.element();

    if (!element || drag.kind === WheelDragKind.Idle || event.pointerId !== drag.pointer) {
      return;
    }

    state.drag = advance(drag, event.clientY, element);
  };

  const stop = (): void => {
    state.drag = IDLE;
    pointer.end();
  };

  const finish = (): void => {
    const element = options.element();

    if (element) {
      element.style.scrollSnapType = '';
      element.style.cursor = '';
    }
    state.dragged = true;
    options.release();
  };

  const onUp = (event: PointerEvent): void => {
    const { drag } = state;

    if (drag.kind === WheelDragKind.Idle || event.pointerId !== drag.pointer) {
      return;
    }
    stop();

    if (drag.kind !== WheelDragKind.Dragging) {
      return;
    }

    finish();
  };

  const onPointerdown = (event: PointerEvent): void => {
    const element = options.element();

    state.dragged = false;

    if (!element || event.pointerType !== PointerType.Mouse || event.button !== 0) {
      return;
    }

    state.drag = {
      kind: WheelDragKind.Pressed,
      pointer: event.pointerId,
      y: event.clientY,
      top: element.scrollTop,
    };

    pointer.begin({ move: onMove, up: onUp, cancel: onUp });
  };

  return {
    holding: () => state.drag.kind !== WheelDragKind.Idle,
    swallowClick: () => {
      const dragged = state.dragged;

      state.dragged = false;
      return dragged;
    },
    onPointerdown,
  };
};

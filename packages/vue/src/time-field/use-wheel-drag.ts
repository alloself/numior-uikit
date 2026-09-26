import { onScopeDispose } from 'vue';

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
  readonly kind: 'pressed' | 'dragging';
  readonly pointer: number;
  readonly y: number;
  readonly top: number;
}

type DragState = { readonly kind: 'idle' } | HeldDrag;

const IDLE: DragState = { kind: 'idle' };
const DRAG_THRESHOLD = 4;

const advance = (drag: HeldDrag, y: number, element: HTMLElement): HeldDrag => {
  const distance = y - drag.y;

  if (drag.kind === 'pressed' && Math.abs(distance) < DRAG_THRESHOLD) {
    return drag;
  }
  element.style.scrollSnapType = 'none';
  element.scrollTop = drag.top - distance;
  return { ...drag, kind: 'dragging' };
};

export const useWheelDrag = (options: WheelDragOptions): WheelDrag => {
  const state: { drag: DragState; dragged: boolean } = { drag: IDLE, dragged: false };

  const onMove = (event: PointerEvent): void => {
    const { drag } = state;
    const element = options.element();

    if (element && drag.kind !== 'idle' && event.pointerId === drag.pointer) {
      state.drag = advance(drag, event.clientY, element);
    }
  };

  const stop = (): void => {
    state.drag = IDLE;
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onUp);
  };

  const finish = (): void => {
    const element = options.element();

    if (element) {
      element.style.scrollSnapType = '';
    }
    state.dragged = true;
    options.release();
  };

  const onUp = (event: PointerEvent): void => {
    const { drag } = state;

    if (drag.kind === 'idle' || event.pointerId !== drag.pointer) {
      return;
    }
    stop();

    if (drag.kind === 'dragging') {
      finish();
    }
  };

  const onPointerdown = (event: PointerEvent): void => {
    const element = options.element();

    state.dragged = false;

    if (!element || event.pointerType !== 'mouse' || event.button !== 0) {
      return;
    }

    state.drag = {
      kind: 'pressed',
      pointer: event.pointerId,
      y: event.clientY,
      top: element.scrollTop,
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  };

  onScopeDispose(stop);

  return {
    holding: () => state.drag.kind !== 'idle',
    swallowClick: () => {
      const dragged = state.dragged;

      state.dragged = false;
      return dragged;
    },
    onPointerdown,
  };
};

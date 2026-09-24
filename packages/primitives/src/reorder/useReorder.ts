import { onScopeDispose, ref, toValue, type MaybeRefOrGetter, type Ref } from 'vue';

export type ReorderAxis = 'x' | 'y';
export type ReorderPhase = 'idle' | 'pending' | 'dragging' | 'keyboard';

export interface ReorderState {
  readonly phase: ReorderPhase;
  readonly from: number;
  readonly to: number;
  readonly position: number;
}

export interface ReorderOptions {
  readonly axis: ReorderAxis;
  readonly count: MaybeRefOrGetter<number>;
  readonly container: MaybeRefOrGetter<HTMLElement | null | undefined>;
  readonly indexAt: (client: number) => number;
  readonly canMove?: ((from: number, to: number) => boolean) | undefined;
  readonly onMove: (from: number, to: number) => void;
  readonly onChange?: ((state: ReorderState) => void) | undefined;
  readonly threshold?: number | undefined;
  readonly rtl?: MaybeRefOrGetter<boolean | undefined>;
}

export interface Reorder {
  readonly state: Readonly<Ref<ReorderState>>;
  onPointerdown(index: number, event: PointerEvent): void;
  onKeydown(index: number, event: KeyboardEvent): boolean;
  cancel(): void;
}

const IDLE: ReorderState = { phase: 'idle', from: -1, to: -1, position: 0 };
const DEFAULT_THRESHOLD = 5;
const EDGE = 24;
const STEP = 8;

const isSelectKey = (key: string): boolean => key === ' ' || key === 'Enter';

const clientOf = (event: PointerEvent, axis: ReorderAxis): number =>
  axis === 'x' ? event.clientX : event.clientY;

const stepFor = (key: string, axis: ReorderAxis, rtl: boolean): number => {
  if (axis === 'y') {
    return key === 'ArrowUp' ? -1 : key === 'ArrowDown' ? 1 : 0;
  }
  const forward = rtl ? 'ArrowLeft' : 'ArrowRight';
  const backward = rtl ? 'ArrowRight' : 'ArrowLeft';
  return key === forward ? 1 : key === backward ? -1 : 0;
};

const edgeDelta = (container: HTMLElement, client: number, axis: ReorderAxis): number => {
  const rect = container.getBoundingClientRect();
  const start = axis === 'x' ? rect.left : rect.top;
  const end = axis === 'x' ? rect.right : rect.bottom;
  if (client < start + EDGE) {
    return -STEP;
  }
  return client > end - EDGE ? STEP : 0;
};

export const useReorder = (options: ReorderOptions): Reorder => {
  const state = ref<ReorderState>(IDLE);
  const origin = { client: 0, pointerId: -1 };
  let frame: number | undefined;

  const publish = (next: ReorderState): void => {
    state.value = next;
    options.onChange?.(next);
  };
  const allowed = (from: number, to: number): boolean =>
    to >= 0 && to < toValue(options.count) && (options.canMove?.(from, to) ?? true);

  const stopScrolling = (): void => {
    if (frame !== undefined && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(frame);
    }
    frame = undefined;
  };
  const scrollBy = (delta: number): void => {
    const container = toValue(options.container);
    if (!container || delta === 0) {
      stopScrolling();
      return;
    }
    if (options.axis === 'x') {
      container.scrollLeft += delta;
    } else {
      container.scrollTop += delta;
    }
    if (typeof requestAnimationFrame !== 'undefined') {
      frame = requestAnimationFrame(() => scrollBy(delta));
    }
  };

  const detach = (): void => {
    if (typeof window === 'undefined') {
      return;
    }
    window.removeEventListener('pointermove', onPointermove);
    window.removeEventListener('pointerup', onPointerup);
    window.removeEventListener('pointercancel', cancel);
    window.removeEventListener('keydown', onWindowKeydown);
  };
  const finish = (next: ReorderState): void => {
    stopScrolling();
    detach();
    publish(next);
  };
  const cancel = (): void => {
    if (state.value.phase !== 'idle') {
      finish(IDLE);
    }
  };
  const track = (event: PointerEvent): void => {
    const client = clientOf(event, options.axis);
    const target = options.indexAt(client);
    const { from, to } = state.value;
    publish({
      phase: 'dragging',
      from,
      to: allowed(from, target) ? target : to,
      position: client,
    });
    const container = toValue(options.container);
    stopScrolling();
    if (container) {
      scrollBy(edgeDelta(container, client, options.axis));
    }
  };
  const onPointermove = (event: PointerEvent): void => {
    if (event.pointerId !== origin.pointerId) {
      return;
    }
    const current = state.value;
    if (current.phase === 'pending') {
      const distance = Math.abs(clientOf(event, options.axis) - origin.client);
      if (distance < (options.threshold ?? DEFAULT_THRESHOLD)) {
        return;
      }
      publish({ ...current, phase: 'dragging' });
    }
    if (state.value.phase === 'dragging') {
      event.preventDefault();
      track(event);
    }
  };
  const onPointerup = (event: PointerEvent): void => {
    if (event.pointerId !== origin.pointerId) {
      return;
    }
    const { phase, from, to } = state.value;
    finish(IDLE);
    if (phase === 'dragging' && to !== from && allowed(from, to)) {
      options.onMove(from, to);
    }
  };
  const onWindowKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && state.value.phase !== 'keyboard') {
      cancel();
    }
  };

  const onPointerdown = (index: number, event: PointerEvent): void => {
    if (event.button !== 0 || state.value.phase !== 'idle' || typeof window === 'undefined') {
      return;
    }
    origin.client = clientOf(event, options.axis);
    origin.pointerId = event.pointerId;
    publish({ phase: 'pending', from: index, to: index, position: origin.client });
    window.addEventListener('pointermove', onPointermove);
    window.addEventListener('pointerup', onPointerup);
    window.addEventListener('pointercancel', cancel);
    window.addEventListener('keydown', onWindowKeydown);
  };

  const grab = (index: number): void => {
    publish({ phase: 'keyboard', from: index, to: index, position: 0 });
  };
  const drop = (current: ReorderState): void => {
    finish(IDLE);
    if (current.to !== current.from) {
      options.onMove(current.from, current.to);
    }
  };
  const nudge = (current: ReorderState, step: number): void => {
    const target = current.to + step;
    if (allowed(current.from, target)) {
      publish({ ...current, to: target });
    }
  };
  const handleActive = (current: ReorderState, key: string): boolean => {
    if (isSelectKey(key)) {
      drop(current);
      return true;
    }
    if (key === 'Escape') {
      cancel();
      return true;
    }
    const step = stepFor(key, options.axis, toValue(options.rtl) ?? false);
    if (step !== 0) {
      nudge(current, step);
    }
    return step !== 0;
  };
  const onKeydown = (index: number, event: KeyboardEvent): boolean => {
    const current = state.value;
    if (current.phase === 'idle') {
      if (!isSelectKey(event.key)) {
        return false;
      }
      grab(index);
      return true;
    }
    return (
      current.phase === 'keyboard' && current.from === index && handleActive(current, event.key)
    );
  };

  onScopeDispose(cancel);

  return { state, onPointerdown, onKeydown, cancel };
};

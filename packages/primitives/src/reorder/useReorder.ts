import { useRafFn } from '@vueuse/core';
import {
  computed,
  onScopeDispose,
  shallowRef,
  toValue,
  type ComputedRef,
  type MaybeRefOrGetter,
  type Ref,
} from 'vue';

export type ReorderAxis = 'x' | 'y';

export type ReorderState =
  | { readonly phase: 'idle' }
  | {
      readonly phase: 'pending';
      readonly from: number;
      readonly pointerId: number;
      readonly origin: number;
    }
  | {
      readonly phase: 'dragging';
      readonly from: number;
      readonly to: number;
      readonly pointerId: number;
      readonly position: number;
    }
  | { readonly phase: 'keyboard'; readonly from: number; readonly to: number };

export type ReorderPhase = ReorderState['phase'];

export type ReorderEvent =
  | { readonly type: 'grabbed'; readonly from: number }
  | { readonly type: 'moved'; readonly from: number; readonly to: number }
  | { readonly type: 'dropped'; readonly from: number; readonly to: number }
  | { readonly type: 'cancelled'; readonly from: number };

type PointerState = Extract<ReorderState, { readonly pointerId: number }>;

type KeyboardState = Extract<ReorderState, { readonly phase: 'keyboard' }>;

export interface ReorderOptions {
  readonly axis: ReorderAxis;
  readonly count: MaybeRefOrGetter<number>;
  readonly container: MaybeRefOrGetter<HTMLElement | null | undefined>;
  readonly indexAt: (client: number, from: number) => number;
  readonly canMove?: ((from: number, to: number) => boolean) | undefined;
  readonly onMove: (from: number, to: number) => void;
  readonly onChange?: ((state: ReorderState) => void) | undefined;
  readonly onEvent?: ((event: ReorderEvent) => void) | undefined;
  readonly threshold?: number | undefined;
  readonly rtl?: MaybeRefOrGetter<boolean | undefined>;
}

export interface Reorder {
  readonly state: Readonly<Ref<ReorderState>>;
  readonly source: ComputedRef<number | undefined>;
  onPointerdown(index: number, event: PointerEvent): void;
  onKeydown(index: number, event: KeyboardEvent): boolean;
  cancel(): void;
}

const IDLE: ReorderState = { phase: 'idle' };
const DEFAULT_THRESHOLD = 5;
const EDGE = 24;
const STEP = 8;

const isSelectKey = (key: string): boolean => key === ' ' || key === 'Enter';

const isPointer = (state: ReorderState): state is PointerState =>
  state.phase === 'pending' || state.phase === 'dragging';

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
  const state = shallowRef<ReorderState>(IDLE);
  let scrollDelta = 0;

  const source = computed(() => {
    const current = state.value;
    return current.phase === 'idle' ? undefined : current.from;
  });

  const publish = (next: ReorderState): void => {
    state.value = next;
    options.onChange?.(next);
  };

  const emit = (event: ReorderEvent): void => {
    options.onEvent?.(event);
  };

  const allowed = (from: number, to: number): boolean =>
    to >= 0 && to < toValue(options.count) && (options.canMove?.(from, to) ?? true);

  const retarget = (): void => {
    const current = state.value;

    if (current.phase !== 'dragging') {
      return;
    }
    const target = options.indexAt(current.position, current.from);

    if (target !== current.to && allowed(current.from, target)) {
      publish({ ...current, to: target });
    }
  };

  const scrollStep = (): void => {
    const container = toValue(options.container);
    if (!container || scrollDelta === 0) {
      autoscroll.pause();
      return;
    }
    if (options.axis === 'x') {
      container.scrollLeft += scrollDelta;
    } else {
      container.scrollTop += scrollDelta;
    }
    retarget();
  };

  const autoscroll = useRafFn(scrollStep, { immediate: false });

  const stopScrolling = (): void => {
    scrollDelta = 0;
    autoscroll.pause();
  };

  const scrollBy = (delta: number): void => {
    scrollDelta = delta;
    scrollStep();
    if (scrollDelta !== 0) {
      autoscroll.resume();
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

  const finish = (): void => {
    stopScrolling();
    detach();
    publish(IDLE);
  };

  const cancel = (): void => {
    const current = state.value;

    if (current.phase === 'idle') {
      return;
    }
    finish();

    if (current.phase === 'keyboard') {
      emit({ type: 'cancelled', from: current.from });
    }
  };

  const drop = (current: KeyboardState | PointerState, to: number): void => {
    const moved = to !== current.from && allowed(current.from, to);

    if (moved) {
      options.onMove(current.from, to);
    }
    finish();

    if (moved) {
      emit({ type: 'dropped', from: current.from, to });
    } else if (current.phase === 'keyboard') {
      emit({ type: 'cancelled', from: current.from });
    }
  };

  const track = (current: PointerState, event: PointerEvent): void => {
    const client = clientOf(event, options.axis);
    const target = options.indexAt(client, current.from);
    const to = current.phase === 'dragging' ? current.to : current.from;

    publish({
      phase: 'dragging',
      from: current.from,
      to: allowed(current.from, target) ? target : to,
      pointerId: current.pointerId,
      position: client,
    });

    const container = toValue(options.container);

    stopScrolling();

    if (container) {
      scrollBy(edgeDelta(container, client, options.axis));
    }
  };

  const onPointermove = (event: PointerEvent): void => {
    const current = state.value;

    if (!isPointer(current) || event.pointerId !== current.pointerId) {
      return;
    }
    if (
      current.phase === 'pending' &&
      Math.abs(clientOf(event, options.axis) - current.origin) <
        (options.threshold ?? DEFAULT_THRESHOLD)
    ) {
      return;
    }
    event.preventDefault();
    track(current, event);
  };

  const onPointerup = (event: PointerEvent): void => {
    const current = state.value;

    if (!isPointer(current) || event.pointerId !== current.pointerId) {
      return;
    }
    if (current.phase === 'dragging') {
      drop(current, current.to);
    } else {
      finish();
    }
  };

  const onWindowKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && isPointer(state.value)) {
      cancel();
    }
  };

  const onPointerdown = (index: number, event: PointerEvent): void => {
    if (event.button !== 0 || state.value.phase !== 'idle' || typeof window === 'undefined') {
      return;
    }

    publish({
      phase: 'pending',
      from: index,
      pointerId: event.pointerId,
      origin: clientOf(event, options.axis),
    });

    window.addEventListener('pointermove', onPointermove);
    window.addEventListener('pointerup', onPointerup);
    window.addEventListener('pointercancel', cancel);
    window.addEventListener('keydown', onWindowKeydown);
  };

  const nextAllowed = (from: number, start: number, step: number): number | undefined => {
    const count = toValue(options.count);

    for (let to = start + step; to >= 0 && to < count; to += step) {
      if (allowed(from, to)) {
        return to;
      }
    }
    return undefined;
  };

  const nudge = (current: KeyboardState, step: number): void => {
    const to = nextAllowed(current.from, current.to, step);

    if (to !== undefined) {
      publish({ ...current, to });
      emit({ type: 'moved', from: current.from, to });
    }
  };

  const handleActive = (current: KeyboardState, key: string): boolean => {
    if (isSelectKey(key)) {
      drop(current, current.to);
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

    switch (current.phase) {
      case 'idle':
        if (!isSelectKey(event.key)) {
          return false;
        }
        publish({ phase: 'keyboard', from: index, to: index });
        emit({ type: 'grabbed', from: index });
        return true;
      case 'keyboard':
        return current.from === index && handleActive(current, event.key);
      default:
        return false;
    }
  };

  onScopeDispose(cancel);

  return { state, source, onPointerdown, onKeydown, cancel };
};

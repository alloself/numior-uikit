import {
  computed,
  onScopeDispose,
  shallowRef,
  toValue,
  type ComputedRef,
  type MaybeRefOrGetter,
  type Ref,
} from 'vue';
import { Key } from '../keyboard/key.types';
import { usePointerSession } from '../pointer/usePointerSession';
import { useEdgeScroll } from './useEdgeScroll';
import { ReorderAxis, ReorderEventType, ReorderPhase } from './reorder.types';

export type ReorderState =
  | { readonly phase: typeof ReorderPhase.Idle }
  | {
      readonly phase: typeof ReorderPhase.Pending;
      readonly from: number;
      readonly pointerId: number;
      readonly origin: number;
    }
  | {
      readonly phase: typeof ReorderPhase.Dragging;
      readonly from: number;
      readonly to: number;
      readonly pointerId: number;
      readonly position: number;
    }
  | { readonly phase: typeof ReorderPhase.Keyboard; readonly from: number; readonly to: number };

export type ReorderEvent =
  | { readonly type: typeof ReorderEventType.Grabbed; readonly from: number }
  | { readonly type: typeof ReorderEventType.Moved; readonly from: number; readonly to: number }
  | { readonly type: typeof ReorderEventType.Dropped; readonly from: number; readonly to: number }
  | { readonly type: typeof ReorderEventType.Cancelled; readonly from: number };

type PointerState = Extract<ReorderState, { readonly pointerId: number }>;

type KeyboardState = Extract<ReorderState, { readonly phase: typeof ReorderPhase.Keyboard }>;

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
  onBlur(index: number): void;
  cancel(): void;
}

const IDLE: ReorderState = { phase: ReorderPhase.Idle };
const DEFAULT_THRESHOLD = 5;

const isSelectKey = (key: string): boolean => key === Key.Space || key === Key.Enter;

const isPointer = (state: ReorderState): state is PointerState =>
  state.phase === ReorderPhase.Pending || state.phase === ReorderPhase.Dragging;

const clientOf = (event: PointerEvent, axis: ReorderAxis): number =>
  axis === ReorderAxis.X ? event.clientX : event.clientY;

const stepFor = (key: string, axis: ReorderAxis, rtl: boolean): number => {
  if (axis === ReorderAxis.Y) {
    return key === Key.ArrowUp ? -1 : key === Key.ArrowDown ? 1 : 0;
  }
  const forward = rtl ? Key.ArrowLeft : Key.ArrowRight;
  const backward = rtl ? Key.ArrowRight : Key.ArrowLeft;
  return key === forward ? 1 : key === backward ? -1 : 0;
};

export const useReorder = (options: ReorderOptions): Reorder => {
  const state = shallowRef<ReorderState>(IDLE);

  const source = computed(() => {
    const current = state.value;
    return current.phase === ReorderPhase.Idle ? undefined : current.from;
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

    if (current.phase !== ReorderPhase.Dragging) {
      return;
    }
    const target = options.indexAt(current.position, current.from);

    publish({ ...current, to: allowed(current.from, target) ? target : current.to });
  };

  const edge = useEdgeScroll({ container: options.container, onStep: retarget });

  const pointer = usePointerSession();

  const detach = (): void => {
    pointer.end();

    if (typeof window === 'undefined') {
      return;
    }
    window.removeEventListener('keydown', onWindowKeydown);
  };

  const finish = (): void => {
    edge.stop();
    detach();
    publish(IDLE);
  };

  const cancel = (): void => {
    const current = state.value;

    if (current.phase === ReorderPhase.Idle) {
      return;
    }
    finish();

    if (current.phase !== ReorderPhase.Keyboard) {
      return;
    }

    emit({ type: ReorderEventType.Cancelled, from: current.from });
  };

  const drop = (current: KeyboardState | PointerState, to: number): void => {
    const moved = to !== current.from && allowed(current.from, to);

    try {
      if (moved) {
        options.onMove(current.from, to);
      }
    } finally {
      finish();
    }

    if (moved) {
      emit({ type: ReorderEventType.Dropped, from: current.from, to });
    } else if (current.phase === ReorderPhase.Keyboard) {
      emit({ type: ReorderEventType.Cancelled, from: current.from });
    }
  };

  const track = (current: PointerState, event: PointerEvent): void => {
    const client = clientOf(event, options.axis);
    const target = options.indexAt(client, current.from);
    const to = current.phase === ReorderPhase.Dragging ? current.to : current.from;

    publish({
      phase: ReorderPhase.Dragging,
      from: current.from,
      to: allowed(current.from, target) ? target : to,
      pointerId: current.pointerId,
      position: client,
    });

    edge.follow(options.axis === ReorderAxis.X ? { x: client } : { y: client });
  };

  const onPointermove = (event: PointerEvent): void => {
    const current = state.value;

    if (!isPointer(current) || event.pointerId !== current.pointerId) {
      return;
    }
    if (
      current.phase === ReorderPhase.Pending &&
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
    if (current.phase === ReorderPhase.Dragging) {
      drop(current, current.to);
    } else {
      finish();
    }
  };

  const onPointercancel = (event: PointerEvent): void => {
    const current = state.value;

    if (!isPointer(current) || event.pointerId !== current.pointerId) {
      return;
    }

    cancel();
  };

  const onWindowKeydown = (event: KeyboardEvent): void => {
    if (event.key !== Key.Escape || !isPointer(state.value)) {
      return;
    }

    cancel();
  };

  const onPointerdown = (index: number, event: PointerEvent): void => {
    if (
      event.button !== 0 ||
      state.value.phase !== ReorderPhase.Idle ||
      typeof window === 'undefined'
    ) {
      return;
    }

    publish({
      phase: ReorderPhase.Pending,
      from: index,
      pointerId: event.pointerId,
      origin: clientOf(event, options.axis),
    });

    pointer.begin({ move: onPointermove, up: onPointerup, cancel: onPointercancel });
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

    if (to === undefined) {
      return;
    }

    publish({ ...current, to });
    emit({ type: ReorderEventType.Moved, from: current.from, to });
  };

  const handleActive = (current: KeyboardState, key: string): boolean => {
    if (isSelectKey(key)) {
      drop(current, current.to);
      return true;
    }
    if (key === Key.Escape) {
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
      case ReorderPhase.Idle:
        if (!isSelectKey(event.key)) {
          return false;
        }
        publish({ phase: ReorderPhase.Keyboard, from: index, to: index });
        emit({ type: ReorderEventType.Grabbed, from: index });
        return true;
      case ReorderPhase.Keyboard:
        return current.from === index && handleActive(current, event.key);
      default:
        return false;
    }
  };

  const onBlur = (index: number): void => {
    const current = state.value;

    if (current.phase !== ReorderPhase.Keyboard || current.from !== index) {
      return;
    }

    cancel();
  };

  onScopeDispose(cancel);

  return { state, source, onPointerdown, onKeydown, onBlur, cancel };
};

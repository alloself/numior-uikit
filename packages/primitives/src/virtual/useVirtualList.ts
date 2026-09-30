import { useEventListener, useResizeObserver } from '@vueuse/core';
import {
  computed,
  onMounted,
  ref,
  toValue,
  watch,
  type ComputedRef,
  type MaybeRefOrGetter,
  type Ref,
} from 'vue';
import { useDirection } from '../direction/direction-context';
import {
  buildSizeModel,
  canvasScaleFor,
  countOf,
  offsetAt,
  rangeFor,
  scrollTargetFor,
  sizeAt,
  totalSizeOf,
  type ItemSize,
  type VirtualAlign,
  type VirtualRange,
} from './offsets';
import { assignSlots, type SlotMap } from './slots';

export type { ItemSize, VirtualAlign, VirtualRange } from './offsets';

export type VirtualAxis = 'y' | 'x';

export interface VirtualListOptions {
  readonly count: MaybeRefOrGetter<number>;
  readonly itemSize: MaybeRefOrGetter<ItemSize>;
  readonly axis?: MaybeRefOrGetter<VirtualAxis | undefined>;
  readonly overscan?: MaybeRefOrGetter<number | undefined>;
  readonly initialCount?: MaybeRefOrGetter<number | undefined>;
  readonly enabled?: MaybeRefOrGetter<boolean | undefined>;
  readonly pinned?: MaybeRefOrGetter<number | undefined>;
  readonly maxSize?: MaybeRefOrGetter<number | undefined>;
  readonly inset?: MaybeRefOrGetter<number | undefined>;
  readonly listen?: MaybeRefOrGetter<boolean | undefined>;
}

export interface VirtualItem {
  readonly index: number;
  readonly slot: number;
  readonly start: number;
  readonly offset: number;
  readonly size: number;
}

export interface VirtualScrollOptions {
  readonly align?: VirtualAlign | undefined;
}

export interface VirtualList {
  readonly range: ComputedRef<VirtualRange>;
  readonly items: ComputedRef<readonly VirtualItem[]>;
  readonly totalSize: ComputedRef<number>;
  readonly canvasSize: ComputedRef<number>;
  readonly shift: ComputedRef<number>;
  readonly windowOffset: ComputedRef<number>;
  readonly startSize: ComputedRef<number>;
  readonly endSize: ComputedRef<number>;
  readonly viewport: Readonly<Ref<number>>;
  readonly scrollTop: Readonly<Ref<number>>;
  offsetOf(index: number): number;
  scrollTo(index: number, options?: VirtualScrollOptions): void;
  onScroll(): void;
  measure(): void;
}

const DEFAULT_OVERSCAN = 4;
const DEFAULT_INITIAL = 20;

const withPinned = (list: number[], range: VirtualRange, pinned: number | undefined): number[] => {
  if (pinned === undefined || (pinned >= range.start && pinned < range.end)) {
    return list;
  }
  return pinned < range.start ? [pinned, ...list] : [...list, pinned];
};

const slotsOf = (items: readonly VirtualItem[] = []): SlotMap =>
  new Map(items.map((item) => [item.index, item.slot]));

export const useVirtualList = (
  container: MaybeRefOrGetter<HTMLElement | null | undefined>,
  options: VirtualListOptions,
): VirtualList => {
  const viewport = ref(0);
  const physical = ref(0);
  const direction = useDirection(container);
  const model = computed(() => buildSizeModel(toValue(options.count), toValue(options.itemSize)));
  const enabled = (): boolean => toValue(options.enabled) ?? true;
  const axis = (): VirtualAxis => toValue(options.axis) ?? 'y';
  const totalSize = computed(() => totalSizeOf(model.value));
  const span = computed(() => Math.max(0, viewport.value - (toValue(options.inset) ?? 0)));

  const scale = computed(() =>
    canvasScaleFor(totalSize.value, span.value, toValue(options.maxSize)),
  );

  const scrollTop = computed(() => physical.value * scale.value.factor);
  const shift = computed(() => scrollTop.value - physical.value);

  const nextRange = (): VirtualRange => {
    const count = countOf(model.value);

    if (!enabled()) {
      return { start: 0, end: count };
    }
    if (viewport.value === 0) {
      return { start: 0, end: Math.min(count, toValue(options.initialCount) ?? DEFAULT_INITIAL) };
    }
    const overscan = toValue(options.overscan) ?? DEFAULT_OVERSCAN;
    return rangeFor(model.value, scrollTop.value, span.value, overscan);
  };

  const range = computed<VirtualRange>((previous) => {
    const next = nextRange();

    return previous !== undefined && previous.start === next.start && previous.end === next.end
      ? previous
      : next;
  });

  const itemAt = (index: number, slot: number): VirtualItem => {
    const start = offsetAt(model.value, index);
    return { index, slot, start, offset: start - shift.value, size: sizeAt(model.value, index) };
  };

  const items = computed<readonly VirtualItem[]>((previous) => {
    const { start, end } = range.value;
    const list = Array.from({ length: end - start }, (_, offset) => start + offset);
    const pinned = toValue(options.pinned);
    const valid = pinned !== undefined && pinned >= 0 && pinned < countOf(model.value);
    const indices = withPinned(list, range.value, valid ? pinned : undefined);
    const slots = assignSlots(slotsOf(previous), indices);
    return indices.map((index) => itemAt(index, slots.get(index) ?? 0));
  });

  const canvasSize = computed(() => scale.value.canvas);
  const windowOffset = computed(() => offsetAt(model.value, range.value.start) - scrollTop.value);
  const startSize = computed(() => offsetAt(model.value, range.value.start) - shift.value);

  const endSize = computed(
    () => canvasSize.value - (offsetAt(model.value, range.value.end) - shift.value),
  );

  const readScroll = (element: HTMLElement): number =>
    axis() === 'x' ? Math.abs(element.scrollLeft) : element.scrollTop;

  const writeScroll = (element: HTMLElement, value: number): void => {
    if (axis() === 'x') {
      element.scrollLeft = direction.isRtl() ? -value : value;
    } else {
      element.scrollTop = value;
    }
  };

  const measure = (): void => {
    const element = toValue(container);

    if (element) {
      viewport.value = axis() === 'x' ? element.clientWidth : element.clientHeight;
      physical.value = readScroll(element);
    }
  };

  const scrollTo = (index: number, { align = 'auto' }: VirtualScrollOptions = {}): void => {
    const element = toValue(container);

    if (!element) {
      return;
    }
    const target = scrollTargetFor(model.value, index, scrollTop.value, span.value, align);

    if (target === undefined) {
      return;
    }
    const next = target / scale.value.factor;
    writeScroll(element, next);
    physical.value = next;
  };

  const active = (): HTMLElement | undefined =>
    enabled() ? (toValue(container) ?? undefined) : undefined;

  onMounted(() => {
    if (toValue(options.listen) ?? true) {
      useEventListener(active, 'scroll', measure, { passive: true });
    }
    useResizeObserver(active, measure);

    watch(
      [() => toValue(container), enabled, axis],
      ([element, on]) => {
        if (element && on) {
          measure();
        }
      },
      { immediate: true, flush: 'post' },
    );
  });

  return {
    range,
    items,
    totalSize,
    canvasSize,
    shift,
    windowOffset,
    startSize,
    endSize,
    viewport,
    scrollTop,
    offsetOf: (index) => offsetAt(model.value, index),
    scrollTo,
    onScroll: measure,
    measure,
  };
};

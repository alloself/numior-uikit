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
import {
  buildSizeModel,
  countOf,
  offsetAt,
  rangeFor,
  scrollTargetFor,
  sizeAt,
  totalSizeOf,
  type VirtualAlign,
  type VirtualRange,
} from './offsets';

export type { VirtualAlign, VirtualRange } from './offsets';

export interface VirtualListOptions {
  readonly count: MaybeRefOrGetter<number>;
  readonly itemSize: MaybeRefOrGetter<number | ((index: number) => number)>;
  readonly overscan?: MaybeRefOrGetter<number | undefined>;
  readonly initialCount?: MaybeRefOrGetter<number | undefined>;
  readonly enabled?: MaybeRefOrGetter<boolean | undefined>;
  readonly pinned?: MaybeRefOrGetter<number | undefined>;
}

export interface VirtualItem {
  readonly index: number;
  readonly start: number;
  readonly size: number;
}

export interface VirtualScrollOptions {
  readonly align?: VirtualAlign | undefined;
}

export interface VirtualList {
  readonly range: ComputedRef<VirtualRange>;
  readonly items: ComputedRef<readonly VirtualItem[]>;
  readonly totalSize: ComputedRef<number>;
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

const withPinned = (
  list: VirtualItem[],
  range: VirtualRange,
  pinned: VirtualItem | undefined,
): VirtualItem[] => {
  if (!pinned || (pinned.index >= range.start && pinned.index < range.end)) {
    return list;
  }
  return pinned.index < range.start ? [pinned, ...list] : [...list, pinned];
};

export const useVirtualList = (
  container: MaybeRefOrGetter<HTMLElement | null | undefined>,
  options: VirtualListOptions,
): VirtualList => {
  const viewport = ref(0);
  const scrollTop = ref(0);
  const model = computed(() => buildSizeModel(toValue(options.count), toValue(options.itemSize)));
  const enabled = (): boolean => toValue(options.enabled) ?? true;

  const range = computed<VirtualRange>(() => {
    const count = countOf(model.value);
    if (!enabled()) {
      return { start: 0, end: count };
    }
    if (viewport.value === 0) {
      return { start: 0, end: Math.min(count, toValue(options.initialCount) ?? DEFAULT_INITIAL) };
    }
    const overscan = toValue(options.overscan) ?? DEFAULT_OVERSCAN;
    return rangeFor(model.value, scrollTop.value, viewport.value, overscan);
  });

  const itemAt = (index: number): VirtualItem => ({
    index,
    start: offsetAt(model.value, index),
    size: sizeAt(model.value, index),
  });

  const items = computed(() => {
    const { start, end } = range.value;
    const list = Array.from({ length: end - start }, (_, offset) => itemAt(start + offset));
    const pinned = toValue(options.pinned);
    const valid = pinned !== undefined && pinned >= 0 && pinned < countOf(model.value);
    return withPinned(list, range.value, valid ? itemAt(pinned) : undefined);
  });

  const totalSize = computed(() => totalSizeOf(model.value));
  const startSize = computed(() => offsetAt(model.value, range.value.start));
  const endSize = computed(() => totalSize.value - offsetAt(model.value, range.value.end));

  const measure = (): void => {
    const element = toValue(container);
    if (element) {
      viewport.value = element.clientHeight;
      scrollTop.value = element.scrollTop;
    }
  };

  const scrollTo = (index: number, { align = 'auto' }: VirtualScrollOptions = {}): void => {
    const element = toValue(container);
    if (!element) {
      return;
    }
    const target = scrollTargetFor(model.value, index, scrollTop.value, viewport.value, align);
    if (target === undefined) {
      return;
    }
    element.scrollTop = target;
    scrollTop.value = target;
  };

  onMounted(() => {
    watch(
      [() => toValue(container), enabled],
      ([element, on], _previous, onCleanup) => {
        if (!element || !on) {
          return;
        }
        measure();
        element.addEventListener('scroll', measure, { passive: true });

        const observer =
          typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(measure);

        observer?.observe(element);

        onCleanup(() => {
          element.removeEventListener('scroll', measure);
          observer?.disconnect();
        });
      },
      { immediate: true, flush: 'post' },
    );
  });

  return {
    range,
    items,
    totalSize,
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

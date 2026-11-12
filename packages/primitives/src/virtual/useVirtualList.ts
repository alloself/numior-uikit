import { clamp, useEventListener, useResizeObserver } from '@vueuse/core';
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
import { sameFrame, virtualFrameOf, type VirtualFrame } from './frame';
import {
  buildSizeModel,
  canvasScaleFor,
  countOf,
  indexAt,
  offsetAt,
  rangeFor,
  scrollTargetFor,
  sizeAt,
  totalSizeOf,
  type ItemSize,
  type SizeModel,
  type VirtualRange,
} from './offsets';
import type { SizeIndex, VirtualSize } from './size-index';
import { assignSlots, type SlotMap } from './slots';
import { SizeModelKind, VirtualAlign, VirtualAxis } from './virtual.types';

export type { VirtualFrame } from './frame';
export type { ItemSize, VirtualRange } from './offsets';
export type { VirtualSize } from './size-index';

export interface VirtualListOptions {
  readonly count: MaybeRefOrGetter<number>;
  readonly itemSize: MaybeRefOrGetter<ItemSize>;
  readonly axis?: MaybeRefOrGetter<VirtualAxis | undefined>;
  readonly overscan?: MaybeRefOrGetter<number | undefined>;
  readonly initialCount?: MaybeRefOrGetter<number | undefined>;
  readonly enabled?: MaybeRefOrGetter<boolean | undefined>;
  readonly pinned?: MaybeRefOrGetter<number | undefined>;
  readonly frozen?: MaybeRefOrGetter<number | undefined>;
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

export interface VirtualAnchor {
  readonly index: number;
  readonly within: number;
}

export interface VirtualList {
  readonly range: ComputedRef<VirtualRange>;
  readonly items: ComputedRef<readonly VirtualItem[]>;
  readonly totalSize: ComputedRef<number>;
  readonly canvasSize: ComputedRef<number>;
  readonly shift: ComputedRef<number>;
  readonly windowOffset: ComputedRef<number>;
  readonly windowOrigin: ComputedRef<number>;
  readonly startSize: ComputedRef<number>;
  readonly endSize: ComputedRef<number>;
  readonly frame: ComputedRef<VirtualFrame>;
  readonly viewport: Readonly<Ref<number>>;
  readonly scrollTop: Readonly<Ref<number>>;
  offsetOf(index: number): number;
  indexAt(position: number): number;
  scrollTo(index: number, options?: VirtualScrollOptions): void;
  anchor(): VirtualAnchor;
  scrollToAnchor(anchor: VirtualAnchor): void;
  resize(sizes: Iterable<VirtualSize>): boolean;
  onScroll(): void;
  measure(): void;
}

const DEFAULT_OVERSCAN = 4;
const DEFAULT_INITIAL = 20;

const indicesOf = (range: VirtualRange, frozen: number, pinned: number | undefined): number[] => {
  const held = Array.from({ length: frozen }, (_, index) => index);
  const list = Array.from({ length: range.end - range.start }, (_, offset) => range.start + offset);

  if (pinned === undefined || pinned < frozen || (pinned >= range.start && pinned < range.end)) {
    return [...held, ...list];
  }
  return pinned < range.start ? [...held, pinned, ...list] : [...held, ...list, pinned];
};

const slotsOf = (items: readonly VirtualItem[] = []): SlotMap =>
  new Map(items.map((item) => [item.index, item.slot]));

const indexOf = (model: SizeModel): SizeIndex | undefined =>
  model.kind === SizeModelKind.Indexed ? model.index : undefined;

export const useVirtualList = (
  container: MaybeRefOrGetter<HTMLElement | null | undefined>,
  options: VirtualListOptions,
): VirtualList => {
  const viewport = ref(0);
  const physical = ref(0);
  const direction = useDirection(container);
  const model = computed(() => buildSizeModel(toValue(options.count), toValue(options.itemSize)));
  const enabled = (): boolean => toValue(options.enabled) ?? true;
  const axis = (): VirtualAxis => toValue(options.axis) ?? VirtualAxis.Y;
  const totalSize = computed(() => totalSizeOf(model.value));
  const span = computed(() => Math.max(0, viewport.value - (toValue(options.inset) ?? 0)));

  const scale = computed(() =>
    canvasScaleFor(totalSize.value, span.value, toValue(options.maxSize)),
  );

  const scrollTop = computed(() => physical.value * scale.value.factor);
  const shift = computed(() => scrollTop.value - physical.value);

  const frozen = computed(() =>
    enabled() ? clamp(Math.floor(toValue(options.frozen) ?? 0) || 0, 0, countOf(model.value)) : 0,
  );

  const frozenSize = computed(() => offsetAt(model.value, frozen.value));
  const room = computed(() => Math.max(0, span.value - frozenSize.value));

  const nextRange = (): VirtualRange => {
    const count = countOf(model.value);
    const held = frozen.value;

    if (!enabled()) {
      return { start: 0, end: count };
    }
    if (viewport.value === 0) {
      const initial = Math.min(count, toValue(options.initialCount) ?? DEFAULT_INITIAL);

      return { start: held, end: Math.max(held, initial) };
    }
    const overscan = toValue(options.overscan) ?? DEFAULT_OVERSCAN;
    const found = rangeFor(model.value, scrollTop.value + frozenSize.value, room.value, overscan);

    return { start: Math.max(held, found.start), end: Math.max(held, found.end) };
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
    const pinned = toValue(options.pinned);
    const valid = pinned !== undefined && pinned >= 0 && pinned < countOf(model.value);
    const indices = indicesOf(range.value, frozen.value, valid ? pinned : undefined);
    const slots = assignSlots(slotsOf(previous), indices);

    return indices.map((index) => itemAt(index, slots.get(index) ?? 0));
  });

  const canvasSize = computed(() => scale.value.canvas);
  const windowOffset = computed(() => offsetAt(model.value, range.value.start) - scrollTop.value);
  const startSize = computed(() => offsetAt(model.value, range.value.start) - shift.value);

  const windowOrigin = computed(() =>
    items.value.reduce(
      (origin, item) => origin - (item.index < range.value.start ? item.size : 0),
      offsetAt(model.value, range.value.start),
    ),
  );

  const endSize = computed(
    () => canvasSize.value - (offsetAt(model.value, range.value.end) - shift.value),
  );

  const frame = computed<VirtualFrame>((previous) => {
    const next = virtualFrameOf({
      items: items.value,
      range: range.value,
      startSize: startSize.value,
      endSize: endSize.value,
      viewport: viewport.value,
      inset: toValue(options.inset) ?? 0,
      frozen: frozen.value,
    });

    return previous !== undefined && sameFrame(previous, next) ? previous : next;
  });

  const readScroll = (element: HTMLElement): number =>
    axis() === VirtualAxis.X ? Math.abs(element.scrollLeft) : element.scrollTop;

  const writeScroll = (element: HTMLElement, value: number): void => {
    if (axis() === VirtualAxis.X) {
      element.scrollLeft = direction.isRtl() ? -value : value;
    } else {
      element.scrollTop = value;
    }
  };

  const measure = (): void => {
    const element = toValue(container);

    if (!element) {
      return;
    }

    viewport.value = axis() === VirtualAxis.X ? element.clientWidth : element.clientHeight;
    physical.value = readScroll(element);
  };

  const scrollTo = (
    index: number,
    { align = VirtualAlign.Auto }: VirtualScrollOptions = {},
  ): void => {
    const element = toValue(container);

    if (!element || index < frozen.value) {
      return;
    }
    const held = frozenSize.value;
    const target = scrollTargetFor(model.value, index, scrollTop.value + held, room.value, align);

    if (target === undefined) {
      return;
    }
    const next = Math.max(0, target - held) / scale.value.factor;

    writeScroll(element, next);
    physical.value = next;
  };

  const sizeIndex = (): SizeIndex | undefined => {
    const size = toValue(options.itemSize);
    return typeof size === 'object' ? size : undefined;
  };

  const settle = (logical: number): void => {
    const element = toValue(container);
    const next = logical / scale.value.factor;

    if (!element || next === physical.value) {
      return;
    }

    writeScroll(element, next);
    physical.value = next;
  };

  const anchor = (): VirtualAnchor => {
    const edge = scrollTop.value + frozenSize.value;
    const index = indexAt(model.value, edge);

    return { index, within: edge - offsetAt(model.value, index) };
  };

  const scrollToAnchor = ({ index, within }: VirtualAnchor): void => {
    const top = Math.max(index, frozen.value);
    const into = top === index ? Math.min(within, sizeAt(model.value, top)) : 0;
    const end = Math.max(0, totalSize.value - span.value);

    settle(clamp(offsetAt(model.value, top) + into - frozenSize.value, 0, end));
  };

  const resize = (sizes: Iterable<VirtualSize>): boolean => {
    const index = sizeIndex();

    if (index === undefined) {
      return false;
    }
    const top = scrollTop.value;
    const end = totalSize.value - span.value;
    const edge = top + frozenSize.value;
    const first = indexAt(model.value, edge);
    const within = edge - offsetAt(model.value, first);
    let changed = false;

    for (const [position, size] of sizes) {
      changed = index.set(position, size) || changed;
    }
    if (changed) {
      settle(
        end > 0 && top >= end - 1
          ? index.total() - span.value
          : index.offsetAt(first) +
              Math.min(within, index.sizeAt(first)) -
              index.offsetAt(frozen.value),
      );
    }
    return changed;
  };

  watch(model, (next, previous) => {
    if (indexOf(next) === indexOf(previous)) {
      return;
    }
    const before = canvasScaleFor(totalSizeOf(previous), span.value, toValue(options.maxSize));
    const edge = physical.value * before.factor + offsetAt(previous, frozen.value);
    const first = indexAt(previous, edge);
    const within = edge - offsetAt(previous, first);

    settle(
      offsetAt(next, first) + Math.min(within, sizeAt(next, first)) - offsetAt(next, frozen.value),
    );
  });

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
        if (!element || !on) {
          return;
        }

        measure();
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
    windowOrigin,
    startSize,
    endSize,
    frame,
    viewport,
    scrollTop,
    offsetOf: (index) => offsetAt(model.value, index),
    indexAt: (position) => indexAt(model.value, position),
    scrollTo,
    anchor,
    scrollToAnchor,
    resize,
    onScroll: measure,
    measure,
  };
};

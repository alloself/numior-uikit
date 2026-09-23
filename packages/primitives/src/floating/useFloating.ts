import {
  arrow as arrowMiddleware,
  autoUpdate,
  computePosition,
  flip,
  offset as offsetMiddleware,
  shift,
  size as sizeMiddleware,
  type Middleware,
} from '@floating-ui/dom';
import {
  computed,
  onMounted,
  ref,
  shallowRef,
  toValue,
  watch,
  type ComputedRef,
  type MaybeRefOrGetter,
  type Ref,
} from 'vue';

export type FloatingSide = 'top' | 'bottom' | 'left' | 'right';

export type FloatingPlacement = FloatingSide | `${FloatingSide}-start` | `${FloatingSide}-end`;

export type FloatingStrategy = 'fixed' | 'absolute';

export interface FloatingSize {
  readonly matchWidth?: boolean | undefined;
  readonly fitHeight?: boolean | undefined;
}

export interface FloatingOptions {
  readonly placement?: MaybeRefOrGetter<FloatingPlacement | undefined>;
  readonly offset?: MaybeRefOrGetter<number | undefined>;
  readonly arrow?: MaybeRefOrGetter<HTMLElement | null | undefined>;
  readonly size?: MaybeRefOrGetter<FloatingSize | undefined>;
  readonly enabled?: MaybeRefOrGetter<boolean | undefined>;
  readonly strategy?: FloatingStrategy | undefined;
}

export interface Floating {
  readonly placement: Readonly<Ref<FloatingPlacement>>;
  readonly side: ComputedRef<FloatingSide>;
  readonly floatingStyles: ComputedRef<Record<string, string>>;
  readonly arrowStyles: ComputedRef<Record<string, string>>;
  update(): Promise<void>;
}

interface Elements {
  readonly reference: HTMLElement;
  readonly floating: HTMLElement;
}

interface ArrowPosition {
  readonly x?: number | undefined;
  readonly y?: number | undefined;
}

interface Bounds {
  readonly width?: number | undefined;
  readonly height?: number | undefined;
}

const sideOf = (placement: FloatingPlacement): FloatingSide => {
  const [side] = placement.split('-');
  return side === 'top' || side === 'left' || side === 'right' ? side : 'bottom';
};

const middleware = (options: FloatingOptions, onBounds: (bounds: Bounds) => void): Middleware[] => {
  const list: Middleware[] = [
    offsetMiddleware(toValue(options.offset) ?? 0),
    flip(),
    shift({ padding: 8 }),
  ];
  const size = toValue(options.size);
  if (size?.matchWidth || size?.fitHeight) {
    list.push(
      sizeMiddleware({
        padding: 8,
        apply: ({ rects, availableHeight }) =>
          onBounds({ width: rects.reference.width, height: availableHeight }),
      }),
    );
  }
  const element = toValue(options.arrow);
  if (element) {
    list.push(arrowMiddleware({ element }));
  }
  return list;
};

const sizeStyles = (size: FloatingSize | undefined, bounds: Bounds): Record<string, string> => ({
  ...(size?.matchWidth && bounds.width !== undefined ? { minInlineSize: `${bounds.width}px` } : {}),
  ...(size?.fitHeight && bounds.height !== undefined ? { maxBlockSize: `${bounds.height}px` } : {}),
});

const pxStyles = (position: ArrowPosition): Record<string, string> => ({
  ...(position.x === undefined ? {} : { left: `${position.x}px` }),
  ...(position.y === undefined ? {} : { top: `${position.y}px` }),
});

export const useFloating = (
  reference: MaybeRefOrGetter<HTMLElement | null | undefined>,
  floating: MaybeRefOrGetter<HTMLElement | null | undefined>,
  options: FloatingOptions = {},
): Floating => {
  const strategy = options.strategy ?? 'fixed';
  const requested = (): FloatingPlacement => toValue(options.placement) ?? 'bottom';
  const placement = ref<FloatingPlacement>(requested());
  const position = shallowRef({ x: 0, y: 0 });
  const arrowPosition = shallowRef<ArrowPosition>({});
  const bounds = shallowRef<Bounds>({});
  const elements = (): Elements | null => {
    const referenceElement = toValue(reference);
    const floatingElement = toValue(floating);
    return referenceElement && floatingElement
      ? { reference: referenceElement, floating: floatingElement }
      : null;
  };

  const update = async (): Promise<void> => {
    const pair = elements();
    if (!pair) {
      return;
    }
    const result = await computePosition(pair.reference, pair.floating, {
      placement: requested(),
      strategy,
      middleware: middleware(options, (next) => {
        bounds.value = next;
      }),
    });
    position.value = { x: result.x, y: result.y };
    placement.value = result.placement;
    arrowPosition.value = result.middlewareData.arrow ?? {};
  };

  onMounted(() => {
    watch(
      [elements, () => toValue(options.enabled) ?? true],
      ([pair, enabled], _, onCleanup) => {
        if (!pair || !enabled) {
          return;
        }
        onCleanup(autoUpdate(pair.reference, pair.floating, () => void update()));
      },
      { immediate: true, flush: 'post' },
    );
    watch(
      [
        requested,
        () => toValue(options.offset),
        () => toValue(options.arrow),
        () => toValue(options.size),
      ],
      () => void update(),
    );
  });

  return {
    placement,
    side: computed(() => sideOf(placement.value)),
    floatingStyles: computed(() => ({
      position: strategy,
      left: `${position.value.x}px`,
      top: `${position.value.y}px`,
      ...sizeStyles(toValue(options.size), bounds.value),
    })),
    arrowStyles: computed(() => pxStyles(arrowPosition.value)),
    update,
  };
};

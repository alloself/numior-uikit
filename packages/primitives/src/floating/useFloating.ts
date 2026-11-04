import {
  arrow as arrowMiddleware,
  autoUpdate,
  computePosition,
  flip,
  offset as offsetMiddleware,
  shift,
  size as sizeMiddleware,
  type Middleware,
  type MiddlewareData,
} from '@floating-ui/dom';
import { onMounted, toValue, watch, type MaybeRefOrGetter } from 'vue';
import { FloatingSide, FloatingStrategy } from './floating.types';

export type FloatingPlacement = FloatingSide | `${FloatingSide}-start` | `${FloatingSide}-end`;

export interface FloatingSize {
  readonly matchWidth?: boolean | undefined;
  readonly fitHeight?: boolean | undefined;
  readonly maxBlockSize?: number | undefined;
}

export interface FloatingOptions {
  readonly placement?: MaybeRefOrGetter<FloatingPlacement | undefined>;
  readonly offset?: MaybeRefOrGetter<number | undefined>;
  readonly arrow?: MaybeRefOrGetter<HTMLElement | null | undefined>;
  readonly size?: MaybeRefOrGetter<FloatingSize | undefined>;
  readonly enabled?: MaybeRefOrGetter<boolean | undefined>;
  readonly strategy?: FloatingStrategy | undefined;
}

interface Elements {
  readonly reference: HTMLElement;
  readonly floating: HTMLElement;
}

interface SideVector {
  readonly x: number;
  readonly y: number;
}

const SIDE_VECTORS: Record<FloatingSide, SideVector> = {
  [FloatingSide.Top]: { x: 0, y: -1 },
  [FloatingSide.Bottom]: { x: 0, y: 1 },
  [FloatingSide.Left]: { x: -1, y: 0 },
  [FloatingSide.Right]: { x: 1, y: 0 },
};

const STATIC_SIDES: Record<FloatingSide, FloatingSide> = {
  [FloatingSide.Top]: FloatingSide.Bottom,
  [FloatingSide.Bottom]: FloatingSide.Top,
  [FloatingSide.Left]: FloatingSide.Right,
  [FloatingSide.Right]: FloatingSide.Left,
};

const SIDES: ReadonlySet<string> = new Set(Object.values(FloatingSide));

const isSide = (value: string | undefined): value is FloatingSide =>
  value !== undefined && SIDES.has(value);

const sideOf = (placement: FloatingPlacement): FloatingSide => {
  const [side] = placement.split('-');
  return isSide(side) ? side : FloatingSide.Bottom;
};

const roundToPixel = (value: number): number => {
  const ratio = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1;
  return Math.round(value * ratio) / ratio;
};

const cappedHeight = (size: FloatingSize, height: number): number =>
  size.maxBlockSize === undefined ? height : Math.min(height, size.maxBlockSize);

const applySize = (
  floating: HTMLElement,
  size: FloatingSize,
  referenceWidth: number,
  availableHeight: number,
): void => {
  if (size.matchWidth) {
    floating.style.minInlineSize = `${referenceWidth}px`;
  }

  if (size.fitHeight) {
    floating.style.maxBlockSize = `${cappedHeight(size, availableHeight)}px`;
  }
};

const middleware = (options: FloatingOptions, floating: HTMLElement): Middleware[] => {
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
          applySize(floating, size, rects.reference.width, availableHeight),
      }),
    );
  }

  const element = toValue(options.arrow);

  if (element) {
    list.push(arrowMiddleware({ element }));
  }

  return list;
};

const applySide = (floating: HTMLElement, side: FloatingSide): void => {
  const vector = SIDE_VECTORS[side];

  floating.style.setProperty('--_side-x', String(vector.x));
  floating.style.setProperty('--_side-y', String(vector.y));
};

const applyPosition = (floating: HTMLElement, strategy: FloatingStrategy, x: number, y: number) => {
  floating.style.position = strategy;
  floating.style.left = `${roundToPixel(x)}px`;
  floating.style.top = `${roundToPixel(y)}px`;
};

const applyArrow = (
  arrow: HTMLElement,
  side: FloatingSide,
  data: MiddlewareData['arrow'] | undefined,
): void => {
  const vertical = SIDE_VECTORS[side].y !== 0;
  const half = (vertical ? arrow.offsetHeight : arrow.offsetWidth) / 2;

  arrow.style.left = data?.x === undefined ? '' : `${roundToPixel(data.x)}px`;
  arrow.style.top = data?.y === undefined ? '' : `${roundToPixel(data.y)}px`;
  arrow.style.right = '';
  arrow.style.bottom = '';
  arrow.style[STATIC_SIDES[side]] = `${-half}px`;
};

export const useFloating = (
  reference: MaybeRefOrGetter<HTMLElement | null | undefined>,
  floating: MaybeRefOrGetter<HTMLElement | null | undefined>,
  options: FloatingOptions = {},
): void => {
  const strategy = options.strategy ?? FloatingStrategy.Fixed;
  const requested = (): FloatingPlacement => toValue(options.placement) ?? FloatingSide.Bottom;

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
      middleware: middleware(options, pair.floating),
    });

    const side = sideOf(result.placement);
    const arrow = toValue(options.arrow);

    applyPosition(pair.floating, strategy, result.x, result.y);
    applySide(pair.floating, side);

    if (arrow) {
      applyArrow(arrow, side, result.middlewareData.arrow);
    }
  };

  onMounted(() => {
    watch(
      [elements, () => toValue(options.enabled) ?? true],
      ([pair, enabled], _, onCleanup) => {
        if (!pair || !enabled) {
          return;
        }

        applySide(pair.floating, sideOf(requested()));
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
};

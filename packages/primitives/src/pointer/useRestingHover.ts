import { useEventListener } from '@vueuse/core';
import { shallowRef, toValue, type MaybeRefOrGetter, type ShallowRef } from 'vue';
import { PointerType } from './pointer.types';
import { usePointerSession } from './usePointerSession';

export interface RestingHover {
  readonly hovered: Readonly<ShallowRef<boolean>>;
  readonly end: () => void;
}

interface Spot {
  readonly x: number;
  readonly y: number;
}

const spotOf = (event: PointerEvent): Spot => ({ x: event.clientX, y: event.clientY });

const isAt = (event: PointerEvent, spot: Spot | undefined): boolean =>
  spot !== undefined && event.clientX === spot.x && event.clientY === spot.y;

export const useRestingHover = (
  target: MaybeRefOrGetter<HTMLElement | null | undefined>,
): RestingHover => {
  const hovered = shallowRef(false);
  const page = usePointerSession({ capture: true });

  let last: Spot | undefined;

  const end = (): void => {
    page.end();
    last = undefined;
    hovered.value = false;
  };

  const settle = (event: PointerEvent): void => {
    const over = event.target;

    page.end();

    if (over instanceof Node && toValue(target)?.contains(over) === true) {
      return;
    }

    end();
  };

  const onPageMove = (event: PointerEvent): void => {
    if (isAt(event, last)) {
      return;
    }

    settle(event);
  };

  useEventListener(
    target,
    'pointerenter',
    (event) => {
      page.end();
      last = spotOf(event);
      hovered.value = true;
    },
    { passive: true },
  );

  useEventListener(
    target,
    'pointermove',
    (event) => {
      last = spotOf(event);
    },
    { passive: true },
  );

  useEventListener(
    target,
    'pointerleave',
    (event) => {
      if (event.pointerType === PointerType.Mouse && isAt(event, last)) {
        page.begin({ move: onPageMove, down: settle });
        return;
      }

      end();
    },
    { passive: true },
  );

  return { hovered, end };
};

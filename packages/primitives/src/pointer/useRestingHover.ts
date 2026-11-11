import { useEventListener } from '@vueuse/core';
import { shallowRef, toValue, type MaybeRefOrGetter, type ShallowRef } from 'vue';
import { PointerType } from './pointer.types';

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
  const resting = shallowRef(false);

  let last: Spot | undefined;

  const page = (): HTMLElement | undefined =>
    resting.value ? toValue(target)?.ownerDocument.documentElement : undefined;

  const end = (): void => {
    resting.value = false;
    last = undefined;
    hovered.value = false;
  };

  const settle = (event: PointerEvent): void => {
    const over = event.target;

    resting.value = false;

    if (!(over instanceof Node) || toValue(target)?.contains(over) !== true) {
      end();
    }
  };

  useEventListener(
    target,
    'pointerenter',
    (event) => {
      resting.value = false;
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
        resting.value = true;
        return;
      }

      end();
    },
    { passive: true },
  );

  useEventListener(
    page,
    'pointermove',
    (event) => {
      if (!isAt(event, last)) {
        settle(event);
      }
    },
    { capture: true, passive: true },
  );

  useEventListener(page, 'pointerdown', settle, { capture: true, passive: true });

  return { hovered, end };
};

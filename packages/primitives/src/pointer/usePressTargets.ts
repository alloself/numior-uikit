import { toValue, watch, type MaybeRefOrGetter } from 'vue';
import type { PointerHandler, PressRef, PressTargets } from './pointer.types';

const startOf = (event: PointerEvent): Element | null =>
  event.target instanceof Element ? event.target : null;

export const createPressTargets = (): PressTargets => {
  const presses = new WeakMap<Element, PointerHandler>();

  const onPointerdown = (event: PointerEvent): void => {
    const root = event.currentTarget;
    let node = startOf(event);

    while (node !== null && !event.cancelBubble) {
      presses.get(node)?.(event);
      node = node === root ? null : node.parentElement;
    }
  };

  return {
    attach: (element, press) => {
      presses.set(element, press);
    },
    onPointerdown,
  };
};

export const usePressTarget = (
  targets: PressTargets | undefined,
  element: MaybeRefOrGetter<Element | null | undefined>,
  press: PointerHandler,
): void => {
  watch(
    () => toValue(element),
    (current) => {
      if (targets === undefined || current === null || current === undefined) {
        return;
      }

      targets.attach(current, press);
    },
    { immediate: true, flush: 'sync' },
  );
};

export const pressRefOf =
  (targets: PressTargets | undefined, press: PointerHandler): PressRef =>
  (element) => {
    if (targets === undefined || !(element instanceof Element)) {
      return;
    }

    targets.attach(element, press);
  };

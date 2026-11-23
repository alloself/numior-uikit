import { computed, toValue, watch, type ComputedRef, type MaybeRefOrGetter } from 'vue';
import type { VirtualFrame } from './frame';
import { VirtualAxis } from './virtual.types';

export type VirtualFrameStyle = Readonly<Record<string, string>>;

export interface VirtualFrameStyles {
  readonly canvasStyle: ComputedRef<VirtualFrameStyle | undefined>;
  readonly windowStyle: ComputedRef<VirtualFrameStyle | undefined>;
}

interface FrameNames {
  readonly lead: string;
  readonly rest: string;
  readonly clampStart: string;
  readonly clampEnd: string;
}

const NAMES: Readonly<Record<VirtualAxis, FrameNames>> = {
  [VirtualAxis.Y]: {
    lead: '--_window-lead',
    rest: '--_window-rest',
    clampStart: '--_window-clamp-start',
    clampEnd: '--_window-clamp-end',
  },
  [VirtualAxis.X]: {
    lead: '--_window-inline-lead',
    rest: '--_window-inline-rest',
    clampStart: '--_window-inline-clamp-start',
    clampEnd: '--_window-inline-clamp-end',
  },
};

const px = (value: number): string => `${value}px`;

export const useVirtualFrame = (
  container: MaybeRefOrGetter<HTMLElement | null | undefined>,
  frame: MaybeRefOrGetter<VirtualFrame | undefined>,
  axis: VirtualAxis = VirtualAxis.Y,
): VirtualFrameStyles => {
  const names = NAMES[axis];
  const current = computed(() => toValue(frame));

  const canvasStyle = computed(() => {
    const value = current.value;

    return value === undefined
      ? undefined
      : { [names.lead]: px(value.lead), [names.rest]: px(value.rest) };
  });

  const windowStyle = computed(() => {
    const value = current.value;

    return value === undefined
      ? undefined
      : { [names.clampStart]: px(value.clampStart), [names.clampEnd]: px(value.clampEnd) };
  });

  watch(current, (next, previous) => {
    const element = toValue(container);

    if (!element || next === undefined || previous === undefined) {
      return;
    }
    if (next.lead > previous.lead) {
      element.style.setProperty(names.lead, px(next.lead));
    }
    if (next.rest <= previous.rest) {
      return;
    }

    element.style.setProperty(names.rest, px(next.rest));
  });

  return { canvasStyle, windowStyle };
};

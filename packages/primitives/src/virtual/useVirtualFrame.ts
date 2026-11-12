import { computed, toValue, watch, type ComputedRef, type MaybeRefOrGetter } from 'vue';
import type { VirtualFrame } from './frame';

export type VirtualFrameStyle = Readonly<Record<string, string>>;

export interface VirtualFrameStyles {
  readonly canvasStyle: ComputedRef<VirtualFrameStyle | undefined>;
  readonly windowStyle: ComputedRef<VirtualFrameStyle | undefined>;
}

const LEAD = '--_window-lead';
const REST = '--_window-rest';
const CLAMP_START = '--_window-clamp-start';
const CLAMP_END = '--_window-clamp-end';

const px = (value: number): string => `${value}px`;

export const useVirtualFrame = (
  container: MaybeRefOrGetter<HTMLElement | null | undefined>,
  frame: MaybeRefOrGetter<VirtualFrame | undefined>,
): VirtualFrameStyles => {
  const current = computed(() => toValue(frame));

  const canvasStyle = computed(() => {
    const value = current.value;

    return value === undefined ? undefined : { [LEAD]: px(value.lead), [REST]: px(value.rest) };
  });

  const windowStyle = computed(() => {
    const value = current.value;

    return value === undefined
      ? undefined
      : { [CLAMP_START]: px(value.clampStart), [CLAMP_END]: px(value.clampEnd) };
  });

  watch(current, (next, previous) => {
    const element = toValue(container);

    if (!element || next === undefined || previous === undefined) {
      return;
    }
    if (next.lead > previous.lead) {
      element.style.setProperty(LEAD, px(next.lead));
    }
    if (next.rest <= previous.rest) {
      return;
    }

    element.style.setProperty(REST, px(next.rest));
  });

  return { canvasStyle, windowStyle };
};

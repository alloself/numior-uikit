import { useResizeObserver } from '@vueuse/core';
import { computed, onMounted, shallowRef, type ComputedRef, type ShallowRef } from 'vue';
import type { ChartMeasure } from './chart.types';

export interface ChartFrame {
  readonly width: Readonly<ShallowRef<number>>;
  readonly measure: ComputedRef<ChartMeasure | undefined>;
}

const measures = new Map<string, ChartMeasure>();

const canvasMeasure = (family: string): ChartMeasure | undefined => {
  const known = measures.get(family);

  if (known !== undefined) {
    return known;
  }

  const context = document.createElement('canvas').getContext('2d');

  if (context === null) {
    return undefined;
  }

  const widths = new Map<string, number>();

  const measure: ChartMeasure = (text, fontSize) => {
    const key = `${fontSize}|${text}`;
    const cached = widths.get(key);

    if (cached !== undefined) {
      return cached;
    }
    context.font = `${fontSize}px ${family}`;

    const width = context.measureText(text).width;

    widths.set(key, width);
    return width;
  };

  measures.set(family, measure);
  return measure;
};

export const useChartFrame = (frame: Readonly<ShallowRef<HTMLElement | null>>): ChartFrame => {
  const width = shallowRef(0);
  const family = shallowRef<string | undefined>(undefined);

  const read = (): void => {
    width.value = frame.value?.clientWidth ?? 0;
  };

  useResizeObserver(frame, read);

  onMounted(() => {
    read();
    family.value = frame.value === null ? undefined : getComputedStyle(frame.value).fontFamily;
  });

  return {
    width,
    measure: computed(() => (family.value === undefined ? undefined : canvasMeasure(family.value))),
  };
};

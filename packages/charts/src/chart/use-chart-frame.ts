import { useEventListener, useResizeObserver } from '@vueuse/core';
import { computed, onMounted, shallowRef, type ComputedRef, type ShallowRef } from 'vue';
import type { ChartMeasure } from './chart.types';

export interface ChartFrame {
  readonly width: Readonly<ShallowRef<number>>;
  readonly height: Readonly<ShallowRef<number>>;
  readonly measure: ComputedRef<ChartMeasure | undefined>;
}

const measures = new Map<string, ChartMeasure>();

const fontsOf = (): FontFaceSet | undefined =>
  typeof document === 'undefined' ? undefined : document.fonts;

const canvasMeasure = (family: string, revision: number): ChartMeasure | undefined => {
  const id = `${String(revision)}|${family}`;
  const known = measures.get(id);

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

  measures.set(id, measure);
  return measure;
};

export const useChartFrame = (frame: Readonly<ShallowRef<HTMLElement | null>>): ChartFrame => {
  const width = shallowRef(0);
  const height = shallowRef(0);
  const family = shallowRef<string | undefined>(undefined);
  const fonts = shallowRef(0);

  const read = (): void => {
    width.value = frame.value?.clientWidth ?? 0;
    height.value = frame.value?.clientHeight ?? 0;
  };

  const remeasure = (): void => {
    measures.clear();
    fonts.value += 1;
  };

  useResizeObserver(frame, read);

  useEventListener(fontsOf, 'loadingdone', remeasure);

  onMounted(() => {
    read();
    family.value = frame.value === null ? undefined : getComputedStyle(frame.value).fontFamily;
  });

  return {
    width,
    height,
    measure: computed(() =>
      family.value === undefined ? undefined : canvasMeasure(family.value, fonts.value),
    ),
  };
};

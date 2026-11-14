import { useResizeObserver } from '@vueuse/core';
import { computed, onMounted, shallowRef, type ComputedRef, type ShallowRef } from 'vue';
import { FontSetStatus, type ChartMeasure } from './chart.types';

export interface ChartFrame {
  readonly width: Readonly<ShallowRef<number>>;
  readonly height: Readonly<ShallowRef<number>>;
  readonly fontSize: Readonly<ShallowRef<number | undefined>>;
  readonly restyled: Readonly<ShallowRef<number>>;
  readonly measure: ComputedRef<ChartMeasure | undefined>;
}

const measures = new Map<string, ChartMeasure>();

const revision = shallowRef(0);

const awaited = new Set<string>();

let arriving: Promise<unknown> | undefined;

const fontsOf = (): FontFaceSet | undefined =>
  typeof document === 'undefined' ? undefined : document.fonts;

const relayoutAfter = async (batch: Promise<unknown>): Promise<void> => {
  await batch;

  if (arriving !== batch) {
    return;
  }
  arriving = undefined;
  measures.clear();
  revision.value += 1;
};

const awaitFaces = (fonts: FontFaceSet, font: string, text: string): void => {
  const faces = Promise.allSettled([fonts.load(font, text), fonts.ready]);
  const batch = arriving === undefined ? faces : Promise.allSettled([arriving, faces]);

  arriving = batch;
  void relayoutAfter(batch);
};

const canvasMeasure = (family: string, current: number): ChartMeasure | undefined => {
  const id = `${String(current)}|${family}`;
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
    const font = `${String(fontSize)}px ${family}`;
    const fonts = fontsOf();

    context.font = font;

    const width = context.measureText(text).width;

    const pending = `${font}|${text}`;

    const missing =
      fonts !== undefined &&
      !awaited.has(pending) &&
      (fonts.status === FontSetStatus.Loading || !fonts.check(font, text));

    if (missing) {
      awaited.add(pending);
      awaitFaces(fonts, font, text);
      return width;
    }
    widths.set(key, width);
    return width;
  };

  measures.set(id, measure);
  return measure;
};

export const useChartFrame = (
  frame: Readonly<ShallowRef<HTMLElement | null>>,
  probe: Readonly<ShallowRef<HTMLElement | null>>,
): ChartFrame => {
  const width = shallowRef(0);
  const height = shallowRef(0);
  const family = shallowRef<string | undefined>(undefined);
  const fontSize = shallowRef<number | undefined>(undefined);
  const restyled = shallowRef(0);

  const read = (): void => {
    width.value = frame.value?.clientWidth ?? 0;
    height.value = frame.value?.clientHeight ?? 0;
  };

  const readStyle = (): void => {
    const style = probe.value === null ? undefined : getComputedStyle(probe.value);
    const size = Number.parseFloat(style?.fontSize ?? '');

    family.value = style?.fontFamily;
    fontSize.value = size > 0 ? size : undefined;
    restyled.value += 1;
  };

  useResizeObserver(frame, read);
  useResizeObserver(probe, readStyle);

  onMounted(() => {
    read();
    readStyle();
  });

  return {
    width,
    height,
    fontSize,
    restyled,
    measure: computed(() =>
      family.value === undefined ? undefined : canvasMeasure(family.value, revision.value),
    ),
  };
};

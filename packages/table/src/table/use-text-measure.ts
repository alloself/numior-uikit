import { useEventListener } from '@vueuse/core';
import { nextTick, onMounted, shallowRef, type ShallowRef } from 'vue';

interface TextMetrics {
  readonly style: string;
  readonly weight: string;
  readonly size: number;
  readonly family: string;
  readonly padding: number;
  readonly frame: number;
  readonly rem: number;
}

export interface TextMeasure {
  needOf(text: string, style?: TextStyle): number;
  groupNeedOf(text: string, count: string, level: number): number;
  widthOf(text: string, style?: TextStyle, icon?: boolean): number | undefined;
}

type TextStyle = Readonly<Record<string, string>> | undefined;

const sizeOf = (metrics: TextMetrics, size: string | undefined): number =>
  size?.endsWith('em') === true ? metrics.size * (Number.parseFloat(size) || 1) : metrics.size;

const fontOf = (metrics: TextMetrics, style: TextStyle): string =>
  `${style?.['font-style'] ?? metrics.style} ${style?.['font-weight'] ?? metrics.weight} ${String(
    sizeOf(metrics, style?.['font-size']),
  )}px ${metrics.family}`;

const ICON_EMS = 1.15;

const ICON_STEP = 2;

const GAP_REMS = 0.25;

const GROUP_REMS = 1.5;

const INDENT_REMS = 1.25;

const GROUP_TEXT: TextStyle = { 'font-weight': '500' };

const GROUP_COUNT: TextStyle = { 'font-weight': '400' };

const iconRoom = (metrics: TextMetrics, size: string | undefined): number =>
  Math.round((sizeOf(metrics, size) * ICON_EMS) / ICON_STEP) * ICON_STEP + metrics.rem * GAP_REMS;

const BODY = '.nui-table__body';

const SAMPLE = [
  '.nui-table__body .nui-table__cell--data > .nui-table__content--text',
  '.nui-table__body .nui-table__cell--data > .nui-table__content > .nui-table__text',
  '.nui-table__body .nui-table__cell--data > .nui-table__content > .nui-table__group-room',
].join(', ');

const fontsOf = (): FontFaceSet | undefined =>
  typeof document === 'undefined' ? undefined : document.fonts;

const contextOf = (): OffscreenCanvasRenderingContext2D | null =>
  typeof OffscreenCanvas === 'undefined' ? null : new OffscreenCanvas(1, 1).getContext('2d');

const frameOf = (cell: Element | null): number => {
  if (cell === null) {
    return 0;
  }

  const style = getComputedStyle(cell);

  return (
    (Number.parseFloat(style.borderInlineStartWidth) || 0) +
    (Number.parseFloat(style.borderInlineEndWidth) || 0)
  );
};

const metricsOf = (root: HTMLElement): TextMetrics | undefined => {
  const body = root.querySelector(BODY);
  const content = root.querySelector(SAMPLE)?.closest('.nui-table__content');

  if (body === null || content === null || content === undefined) {
    return undefined;
  }
  const style = getComputedStyle(body);

  return {
    style: style.fontStyle,
    weight: style.fontWeight,
    size: Number.parseFloat(style.fontSize) || 0,
    family: style.fontFamily,
    padding: Number.parseFloat(getComputedStyle(content).paddingInlineStart) || 0,
    frame: frameOf(content.closest('.nui-table__cell')),
    rem: Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 0,
  };
};

export const useTextMeasure = (
  root: Readonly<ShallowRef<HTMLElement | null>>,
  key: () => string,
): TextMeasure => {
  const ready = shallowRef(0);
  const metrics = new Map<string, TextMetrics>();
  const widths = new Map<string, number>();
  let context: OffscreenCanvasRenderingContext2D | null = null;
  let contextFont = '';
  let waiting = false;

  const retry = (): void => {
    if (waiting) {
      return;
    }
    waiting = true;

    void nextTick(() => {
      waiting = false;
      if (root.value?.querySelector(SAMPLE) === null) {
        return;
      }

      ready.value += 1;
    });
  };

  const metricsFor = (element: HTMLElement): TextMetrics | undefined => {
    const known = metrics.get(key()) ?? metricsOf(element);

    if (known === undefined) {
      retry();
    } else {
      metrics.set(key(), known);
    }
    return known;
  };

  const measured = (font: string, text: string): number | undefined => {
    if (context === null) {
      return undefined;
    }
    if (contextFont !== font) {
      context.font = font;
      contextFont = font;
    }
    return context.measureText(text).width;
  };

  const textWidth = (font: string, text: string): number => {
    const id = `${font}\n${text}`;
    const known = widths.get(id) ?? measured(font, text);

    if (known === undefined) {
      return Number.POSITIVE_INFINITY;
    }

    widths.set(id, known);
    return known;
  };

  const metricsNow = (): TextMetrics | undefined => {
    const element = root.value;

    return ready.value > 0 && element !== null ? metricsFor(element) : undefined;
  };

  const remeasure = (): void => {
    widths.clear();
    contextFont = '';
    ready.value += 1;
  };

  onMounted(() => {
    context = contextOf();
    ready.value += 1;
  });

  useEventListener(fontsOf, 'loadingdone', remeasure);

  return {
    needOf: (text, style) => {
      const found = metricsNow();

      return found === undefined
        ? Number.POSITIVE_INFINITY
        : Math.ceil(textWidth(fontOf(found, style), text) + 2 * found.padding);
    },
    groupNeedOf: (text, count, level) => {
      const found = metricsNow();

      return found === undefined
        ? Number.POSITIVE_INFINITY
        : Math.ceil(
            textWidth(fontOf(found, GROUP_TEXT), text) +
              textWidth(fontOf(found, GROUP_COUNT), count) +
              found.rem * (GROUP_REMS + level * INDENT_REMS) +
              2 * found.padding +
              found.frame,
          );
    },
    widthOf: (text, style, icon = false) => {
      const found = metricsNow();
      const width = found === undefined ? undefined : measured(fontOf(found, style), text);

      if (found === undefined || width === undefined) {
        return undefined;
      }

      const lead = icon ? iconRoom(found, style?.['font-size']) : 0;

      return Math.ceil(width + lead + 2 * found.padding + found.frame);
    },
  };
};

import { nextTick, onMounted, shallowRef, type ShallowRef } from 'vue';

interface TextMetrics {
  readonly style: string;
  readonly weight: string;
  readonly size: number;
  readonly family: string;
  readonly padding: number;
}

type TextStyle = Readonly<Record<string, string>> | undefined;

const sizeOf = (metrics: TextMetrics, size: string | undefined): number =>
  size?.endsWith('em') === true ? metrics.size * (Number.parseFloat(size) || 1) : metrics.size;

const fontOf = (metrics: TextMetrics, style: TextStyle): string =>
  `${style?.['font-style'] ?? metrics.style} ${style?.['font-weight'] ?? metrics.weight} ${String(
    sizeOf(metrics, style?.['font-size']),
  )}px ${metrics.family}`;

const SAMPLE = [
  '.nui-table__body .nui-table__cell--data > .nui-table__content--text',
  '.nui-table__body .nui-table__cell--data > .nui-table__content > .nui-table__text',
].join(', ');

const contextOf = (): OffscreenCanvasRenderingContext2D | null =>
  typeof OffscreenCanvas === 'undefined' ? null : new OffscreenCanvas(1, 1).getContext('2d');

const metricsOf = (root: HTMLElement): TextMetrics | undefined => {
  const text = root.querySelector(SAMPLE);
  const content = text?.classList.contains('nui-table__content--text') ? text : text?.parentElement;

  if (text === null || content === null || content === undefined) {
    return undefined;
  }
  const style = getComputedStyle(text);

  return {
    style: style.fontStyle,
    weight: style.fontWeight,
    size: Number.parseFloat(style.fontSize) || 0,
    family: style.fontFamily,
    padding: Number.parseFloat(getComputedStyle(content).paddingInlineStart) || 0,
  };
};

export const useTextMeasure = (
  root: Readonly<ShallowRef<HTMLElement | null>>,
  key: () => string,
) => {
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
      if (root.value?.querySelector(SAMPLE) !== null) {
        ready.value += 1;
      }
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

  const textWidth = (font: string, text: string): number => {
    const id = `${font}\n${text}`;
    const known = widths.get(id);

    if (known !== undefined || context === null) {
      return known ?? Number.POSITIVE_INFINITY;
    }
    if (contextFont !== font) {
      context.font = font;
      contextFont = font;
    }
    const width = context.measureText(text).width;

    widths.set(id, width);
    return width;
  };

  onMounted(() => {
    context = contextOf();
    ready.value += 1;
  });

  return {
    needOf: (text: string, style?: TextStyle): number => {
      const element = root.value;
      const found = ready.value > 0 && element !== null ? metricsFor(element) : undefined;

      return found === undefined
        ? Number.POSITIVE_INFINITY
        : Math.ceil(textWidth(fontOf(found, style), text) + 2 * found.padding);
    },
  };
};

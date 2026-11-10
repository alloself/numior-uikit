import { useMounted } from '@vueuse/core';
import { computed, onScopeDispose, watch, type ComputedRef } from 'vue';
import { DrawingKind, type SheetDrawing } from '../../core';
import { lineSizesOf } from '../sheet-cells';
import { spanOf } from './drawing-box';
import { chartSpecOf } from './drawing-chart';
import {
  ShownDrawingKind,
  type ChartSource,
  type LineSizes,
  type SheetDrawingsOptions,
  type ShownDrawing,
} from './drawings.types';

const pictureUrl = (bytes: Uint8Array, type: string): string =>
  URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type }));

export const useSheetDrawings = (
  options: SheetDrawingsOptions,
): ComputedRef<readonly ShownDrawing[]> => {
  const mounted = useMounted();

  const urls = new Map<Uint8Array, string>();

  const urlOf = (bytes: Uint8Array, type: string): string | undefined => {
    if (!mounted.value || typeof URL.createObjectURL !== 'function') {
      return undefined;
    }

    const known = urls.get(bytes);

    if (known !== undefined) {
      return known;
    }

    const url = pictureUrl(bytes, type);

    urls.set(bytes, url);
    return url;
  };

  const shownOf = (drawing: SheetDrawing, sizes: LineSizes, source: ChartSource): ShownDrawing => {
    const span = spanOf(drawing.anchor, sizes);
    const { content } = drawing;
    const texts = options.messages();

    switch (content.kind) {
      case DrawingKind.Picture:
        return {
          kind: ShownDrawingKind.Picture,
          drawing,
          span,
          url: urlOf(content.bytes, content.type),
          label: drawing.alt || drawing.name || texts.picture,
        };
      case DrawingKind.Chart:
        return {
          kind: ShownDrawingKind.Chart,
          drawing,
          span,
          spec: chartSpecOf(content.chart, source),
          title: content.chart.title,
          legend: content.chart.legend,
          label: content.chart.title ?? (drawing.name || texts.chart),
        };
      case DrawingKind.Foreign:
        return {
          kind: ShownDrawingKind.Foreign,
          drawing,
          span,
          label: texts.foreignDrawing({
            label: drawing.name === '' ? content.label : `${drawing.name} (${content.label})`,
          }),
        };
    }
  };

  const shown = computed((): readonly ShownDrawing[] => {
    const sheet = options.sheet();

    if (sheet === undefined || options.revision() < 0) {
      return [];
    }

    const sizes = lineSizesOf(sheet);

    const source: ChartSource = {
      book: options.book(),
      sheet,
      locale: options.locale(),
      seriesName: (index) => options.messages().chartSeries({ index }),
    };

    return sheet.layout.drawings.map((drawing) => shownOf(drawing, sizes, source));
  });

  watch(shown, (drawings) => {
    const kept = new Set(
      drawings.reduce<string[]>((found, drawing) => {
        if (drawing.kind === ShownDrawingKind.Picture && drawing.url !== undefined) {
          found.push(drawing.url);
        }
        return found;
      }, []),
    );

    urls.forEach((url, bytes) => {
      if (kept.has(url)) {
        return;
      }

      URL.revokeObjectURL(url);
      urls.delete(bytes);
    });
  });

  onScopeDispose(() => {
    urls.forEach((url) => {
      URL.revokeObjectURL(url);
    });

    urls.clear();
  });

  return shown;
};

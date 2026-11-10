import { NuiMenuEntryType, type NuiMenuEntry } from '@numior/vue';
import {
  DrawingKind,
  chartAnchorAt,
  chartDataRange,
  chartOfRange,
  freshDrawingId,
  insertDrawing,
  type CellRange,
  type DrawingAnchor,
  type SheetChartKind,
} from '../../core';
import { applyLayout } from '../sheet-layout-step';
import { CHART_CHOICES, CHART_INSERT_ICON } from './chart-choices';
import type { ChartInsertOptions } from './drawings.types';
import { useSheetInsertSpot } from './use-sheet-insert-spot';

const BESIDE_DATA = 2;

export const useSheetChartInsert = (
  options: ChartInsertOptions,
): { readonly tools: () => readonly NuiMenuEntry[] } => {
  const spot = useSheetInsertSpot(options);

  const anchorFor = (range: CellRange): DrawingAnchor => {
    const start = spot.start();

    return start === undefined
      ? chartAnchorAt(range.top, range.right + BESIDE_DATA)
      : chartAnchorAt(start.row, start.col, spot.end());
  };

  const insert = (kind: SheetChartKind): void => {
    const sheet = options.sheet();
    const picked = options.selection.current.value?.ranges[0];

    const range =
      sheet === undefined || picked === undefined ? undefined : chartDataRange(sheet.cells, picked);

    const chart =
      sheet === undefined || range === undefined
        ? undefined
        : chartOfRange(sheet.cells, sheet.name, range, kind);

    if (sheet === undefined || range === undefined || chart === undefined) {
      options.announce(options.messages().chartNoData);
      return;
    }

    const id = freshDrawingId(sheet.layout);
    const name = options.messages().chartName({ index: sheet.layout.drawings.length + 1 });

    const layout = insertDrawing(sheet.layout, {
      id,
      name,
      alt: '',
      anchor: anchorFor(range),
      content: { kind: DrawingKind.Chart, chart },
    });

    if (applyLayout(options.editing, sheet, layout)) {
      options.select(id, name);
    }
  };

  const tools = (): readonly NuiMenuEntry[] =>
    options.readonly()
      ? []
      : [
          {
            type: NuiMenuEntryType.Sub,
            key: 'chart-insert',
            label: options.messages().insertChart,
            icon: CHART_INSERT_ICON,
            items: CHART_CHOICES.map((choice) => ({
              key: `chart-${choice.kind}`,
              label: choice.label(options.messages()),
              icon: choice.icon,
              onSelect: () => {
                insert(choice.kind);
              },
            })),
          },
        ];

  return { tools };
};

import {
  ChartArea,
  ChartBar,
  ChartColumn,
  ChartLine,
  ChartPie,
  ChartScatter,
  Donut,
} from '@lucide/vue';
import { NuiMenuEntryType, type NuiMenuEntry } from '@numior/vue';
import { markRaw } from 'vue';
import {
  DrawingKind,
  SheetChartKind,
  StepKind,
  chartAnchorAt,
  chartDataRange,
  chartOfRange,
  freshDrawingId,
  insertDrawing,
  type CellRange,
  type DrawingAnchor,
} from '../../core';
import type { NuiSpreadsheetMessages } from '../spreadsheet.messages';
import type { ChartInsertOptions } from './drawings.types';
import { useSheetInsertSpot } from './use-sheet-insert-spot';

interface ChartChoice {
  readonly kind: SheetChartKind;
  readonly icon: object;
  readonly label: (messages: NuiSpreadsheetMessages) => string;
}

const BESIDE_DATA = 2;

const INSERT_ICON = markRaw(ChartColumn);

const CHOICES: readonly ChartChoice[] = [
  { kind: SheetChartKind.Column, icon: INSERT_ICON, label: (texts) => texts.chartColumn },
  { kind: SheetChartKind.Bar, icon: markRaw(ChartBar), label: (texts) => texts.chartBar },
  { kind: SheetChartKind.Line, icon: markRaw(ChartLine), label: (texts) => texts.chartLine },
  { kind: SheetChartKind.Area, icon: markRaw(ChartArea), label: (texts) => texts.chartArea },
  { kind: SheetChartKind.Pie, icon: markRaw(ChartPie), label: (texts) => texts.chartPie },
  { kind: SheetChartKind.Doughnut, icon: markRaw(Donut), label: (texts) => texts.chartDoughnut },
  {
    kind: SheetChartKind.Scatter,
    icon: markRaw(ChartScatter),
    label: (texts) => texts.chartScatter,
  },
];

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

    if (options.editing.apply([{ kind: StepKind.SetLayout, sheet: sheet.name, layout }])) {
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
            icon: INSERT_ICON,
            items: CHOICES.map((choice) => ({
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

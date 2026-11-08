import {
  ChartArea,
  ChartBar,
  ChartColumn,
  ChartLine,
  ChartPie,
  ChartScatter,
  Donut,
} from '@lucide/vue';
import type { NuiTableRange, TableCellPosition } from '@numior/table';
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
  type CellAddress,
  type CellRange,
  type DrawingAnchor,
} from '../../core';
import type { NuiSpreadsheetMessages } from '../spreadsheet.messages';
import type { ChartInsertOptions } from './drawings.types';

interface ChartChoice {
  readonly kind: SheetChartKind;
  readonly icon: object;
  readonly label: (messages: NuiSpreadsheetMessages) => string;
}

const VIEW_ACROSS = 0.25;

const VIEW_DOWN = 0.3;

const VIEW_RIGHT = 0.95;

const VIEW_BOTTOM = 0.9;

const BESIDE_DATA = 2;

const FIRST_CELL: NuiTableRange = { from: { row: 0, col: 0 }, to: { row: 0, col: 0 } };

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
  const leadWidth = (): number => options.table.value?.rectOf(FIRST_CELL)?.start ?? 0;

  const pointAcross = (box: DOMRect, across: number): number => {
    const lead = leadWidth();
    const offset = lead + (box.width - lead) * across;

    return options.rtl() ? box.right - offset : box.left + offset;
  };

  const cellInView = (across: number, down: number): TableCellPosition | undefined => {
    const box = options.root.value?.getBoundingClientRect();

    return box === undefined
      ? undefined
      : options.table.value?.cellNear(pointAcross(box, across), box.top + box.height * down);
  };

  const wholeColumn = (cell: TableCellPosition): TableCellPosition => {
    const start = options.table.value?.rectOf({ from: cell, to: cell })?.start ?? 0;
    const scrolled = Math.abs(options.table.value?.scrollPosition().left ?? 0);

    return start < scrolled + leadWidth() ? { ...cell, col: cell.col + 1 } : cell;
  };

  const addressOf = (cell: TableCellPosition | undefined): CellAddress | undefined => {
    const cells = options.cells();

    return cell === undefined || cells === undefined
      ? undefined
      : { row: cells.rowAt(cell.row), col: cells.colAt(cell.col) };
  };

  const anchorFor = (range: CellRange): DrawingAnchor => {
    const near = cellInView(VIEW_ACROSS, VIEW_DOWN);
    const start = addressOf(near === undefined ? undefined : wholeColumn(near));

    return start === undefined
      ? chartAnchorAt(range.top, range.right + BESIDE_DATA)
      : chartAnchorAt(start.row, start.col, addressOf(cellInView(VIEW_RIGHT, VIEW_BOTTOM)));
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

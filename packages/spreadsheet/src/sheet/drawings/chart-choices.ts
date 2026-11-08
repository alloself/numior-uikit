import {
  ChartArea,
  ChartBar,
  ChartColumn,
  ChartLine,
  ChartPie,
  ChartScatter,
  Donut,
} from '@lucide/vue';
import { markRaw } from 'vue';
import { SheetChartKind } from '../../core';
import type { NuiSpreadsheetMessages } from '../spreadsheet.messages';

interface ChartChoice {
  readonly kind: SheetChartKind;
  readonly icon: object;
  readonly label: (messages: NuiSpreadsheetMessages) => string;
}

export const CHART_INSERT_ICON = markRaw(ChartColumn);

export const CHART_CHOICES: readonly ChartChoice[] = [
  { kind: SheetChartKind.Column, icon: CHART_INSERT_ICON, label: (texts) => texts.chartColumn },
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

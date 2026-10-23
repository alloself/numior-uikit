import type { ChartScene, ChartSlot, ChartSpec } from '../core';

export interface NuiChartProps {
  spec: ChartSpec;
  label: string;
  height?: number | undefined;
  locale?: string | undefined;
  showTable?: boolean | undefined;
}

export interface NuiChartLegendItem {
  readonly id: string;
  readonly name: string;
  readonly slot: ChartSlot;
}

export interface NuiChartLegendProps {
  readonly items: readonly NuiChartLegendItem[];
  readonly label: string;
}

export interface NuiChartSceneProps {
  readonly scene: ChartScene;
}

export interface NuiChartTableProps {
  spec: ChartSpec;
  label: string;
  locale: string;
  categoryTitle: string;
  shown: boolean;
}

export type ChartMeasure = (text: string, fontSize: number) => number;

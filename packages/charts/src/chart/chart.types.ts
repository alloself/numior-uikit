import type { ChartHit, ChartScene, ChartSlot, ChartSpec } from '../core';

export type ChartFocusSource = (typeof ChartFocusSource)[keyof typeof ChartFocusSource];

export type NuiChartHeight = (typeof NuiChartHeight)[keyof typeof NuiChartHeight];

export interface NuiChartProps {
  spec: ChartSpec;
  label: string;
  height?: number | NuiChartHeight | undefined;
  focusable?: boolean | undefined;
  locale?: string | undefined;
  timeZone?: string | undefined;
  showTable?: boolean | undefined;
  legend?: boolean | undefined;
}

export type CategoryName = (index: number) => string;

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
  readonly focus: ChartHit | undefined;
}

export interface NuiChartTooltipRow {
  readonly key: string;
  readonly slot: ChartSlot | undefined;
  readonly name: string;
  readonly value: string;
}

export interface NuiChartTooltipContent {
  readonly title: string;
  readonly rows: readonly NuiChartTooltipRow[];
}

export interface NuiChartTooltipSlot {
  readonly hit: ChartHit;
  readonly content: NuiChartTooltipContent;
}

export type NuiChartTooltipSide = (typeof NuiChartTooltipSide)[keyof typeof NuiChartTooltipSide];

export interface NuiChartTooltipProps {
  readonly content: NuiChartTooltipContent;
  readonly x: number;
  readonly y: number;
  readonly side: NuiChartTooltipSide;
  readonly reach: number;
  readonly shown: boolean;
}

export interface NuiChartTableProps {
  spec: ChartSpec;
  label: string;
  locale: string;
  categoryName: CategoryName;
  categoryTitle: string;
  shown: boolean;
}

export type ChartMeasure = (text: string, fontSize: number) => number;

export const NuiChartTooltipSide = {
  Start: 'start',
  End: 'end',
  Above: 'above',
  Below: 'below',
} as const;

export const NuiChartHeight = { Fill: 'fill' } as const;

export const ChartFocusSource = { Pointer: 'pointer', Keyboard: 'keyboard' } as const;

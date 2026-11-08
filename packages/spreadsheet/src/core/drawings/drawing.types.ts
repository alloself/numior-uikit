import type { FormulaNode } from '../formula/formula.types';

export type DrawingPlacement = (typeof DrawingPlacement)[keyof typeof DrawingPlacement];

export type DrawingAnchorKind = (typeof DrawingAnchorKind)[keyof typeof DrawingAnchorKind];

export type DrawingKind = (typeof DrawingKind)[keyof typeof DrawingKind];

export type SheetChartKind = (typeof SheetChartKind)[keyof typeof SheetChartKind];

export type SheetChartStacking = (typeof SheetChartStacking)[keyof typeof SheetChartStacking];

export type SheetChartGaps = (typeof SheetChartGaps)[keyof typeof SheetChartGaps];

export interface DrawingMark {
  readonly row: number;
  readonly col: number;
  readonly dx: number;
  readonly dy: number;
}

export interface DrawingSize {
  readonly width: number;
  readonly height: number;
}

export type DrawingAnchor =
  | {
      readonly kind: typeof DrawingAnchorKind.Cells;
      readonly placement: DrawingPlacement;
      readonly from: DrawingMark;
      readonly to: DrawingMark;
    }
  | ({
      readonly kind: typeof DrawingAnchorKind.Cell;
      readonly from: DrawingMark;
    } & DrawingSize)
  | ({
      readonly kind: typeof DrawingAnchorKind.Point;
      readonly x: number;
      readonly y: number;
    } & DrawingSize);

export interface SheetChartSeries {
  readonly name: FormulaNode | string | undefined;
  readonly categories: FormulaNode | undefined;
  readonly values: FormulaNode | undefined;
}

export interface SheetChart {
  readonly kind: SheetChartKind;
  readonly title: string | undefined;
  readonly legend: boolean;
  readonly stacking: SheetChartStacking;
  readonly gaps: SheetChartGaps;
  readonly hole: number | undefined;
  readonly series: readonly SheetChartSeries[];
}

export type DrawingContent =
  | {
      readonly kind: typeof DrawingKind.Picture;
      readonly media: string;
      readonly type: string;
      readonly bytes: Uint8Array;
    }
  | { readonly kind: typeof DrawingKind.Chart; readonly chart: SheetChart }
  | { readonly kind: typeof DrawingKind.Foreign; readonly label: string };

export interface DrawingSource {
  readonly part: string;
  readonly anchor: number;
}

export interface SheetDrawing {
  readonly id: string;
  readonly name: string;
  readonly alt: string;
  readonly anchor: DrawingAnchor;
  readonly content: DrawingContent;
  readonly source?: DrawingSource | undefined;
}

export const DrawingPlacement = {
  TwoCell: 'twoCell',
  OneCell: 'oneCell',
  Absolute: 'absolute',
} as const;

export const DrawingAnchorKind = { Cells: 'cells', Cell: 'cell', Point: 'point' } as const;

export const DrawingKind = { Picture: 'picture', Chart: 'chart', Foreign: 'foreign' } as const;

export const SheetChartKind = {
  Column: 'column',
  Bar: 'bar',
  Line: 'line',
  Area: 'area',
  Pie: 'pie',
  Doughnut: 'doughnut',
  Scatter: 'scatter',
} as const;

export const SheetChartStacking = { None: 'none', Stacked: 'stacked', Percent: 'percent' } as const;

export const SheetChartGaps = { Break: 'break', Connect: 'connect' } as const;

export type ScenePathRole = (typeof ScenePathRole)[keyof typeof ScenePathRole];

export type SceneLineRole = (typeof SceneLineRole)[keyof typeof SceneLineRole];

export type SceneTextRole = (typeof SceneTextRole)[keyof typeof SceneTextRole];

export type ChartAxis = (typeof ChartAxis)[keyof typeof ChartAxis];

export type ChartScale = (typeof ChartScale)[keyof typeof ChartScale];

export type NumberStyle = (typeof NumberStyle)[keyof typeof NumberStyle];

export type BarEnd = (typeof BarEnd)[keyof typeof BarEnd];

export type ChartKind = (typeof ChartKind)[keyof typeof ChartKind];

export type ChartStacking = (typeof ChartStacking)[keyof typeof ChartStacking];

export type ChartValue = number | null;

export type ChartSlot = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface ChartSeries {
  readonly id: string;
  readonly name: string;
  readonly values: readonly ChartValue[];
  readonly slot?: ChartSlot | undefined;
}

export type ChartCategories =
  | { readonly kind: typeof ChartCategoriesKind.Text; readonly labels: readonly string[] }
  | { readonly kind: typeof ChartCategoriesKind.Time; readonly values: readonly number[] }
  | { readonly kind: typeof ChartCategoriesKind.Number; readonly values: readonly number[] };

export interface ChartValueAxis {
  readonly title?: string | undefined;
  readonly min?: number | undefined;
  readonly max?: number | undefined;
  readonly scale?: ChartScale | undefined;
  readonly gridlines?: boolean | undefined;
}

export interface ChartCategoryAxis {
  readonly title?: string | undefined;
}

export interface ChartSpec {
  readonly kind: ChartKind;
  readonly categories: ChartCategories;
  readonly series: readonly ChartSeries[];
  readonly stacking?: ChartStacking | undefined;
  readonly valueAxis?: ChartValueAxis | undefined;
  readonly categoryAxis?: ChartCategoryAxis | undefined;
  readonly hole?: number | undefined;
}

export interface ChartSize {
  readonly width: number;
  readonly height: number;
}

export interface LayoutOptions {
  readonly rtl?: boolean | undefined;
  readonly locale?: string | undefined;
  readonly fontSize?: number | undefined;
  readonly measure?: ((text: string, fontSize: number) => number) | undefined;
  readonly formatNumber?: ((value: number, step: number) => string) | undefined;
  readonly formatTime?: ((value: number, unit: TimeUnit) => string) | undefined;
}

export type TimeUnit = (typeof TimeUnit)[keyof typeof TimeUnit];

export interface Box {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface SceneBar extends Box {
  readonly series: number;
  readonly index: number;
  readonly value: number;
  readonly slot: ChartSlot;
  readonly path: string;
}

export interface ScenePath {
  readonly role: ScenePathRole;
  readonly series: number;
  readonly slot: ChartSlot;
  readonly d: string;
}

export interface ScenePoint {
  readonly series: number;
  readonly index: number;
  readonly value: number;
  readonly x: number;
  readonly y: number;
  readonly slot: ChartSlot;
  readonly marker: boolean;
}

export interface SceneSlice {
  readonly series: number;
  readonly index: number;
  readonly value: number;
  readonly share: number;
  readonly from: number;
  readonly to: number;
  readonly inner: number;
  readonly outer: number;
  readonly slot: ChartSlot;
  readonly path: string;
  readonly x: number;
  readonly y: number;
}

export interface SceneLine {
  readonly role: SceneLineRole;
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
}

export interface SceneText {
  readonly role: SceneTextRole;
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly anchor: 'start' | 'middle' | 'end';
  readonly baseline: 'top' | 'middle' | 'bottom';
  readonly rotate?: number | undefined;
}

export interface SceneAxis {
  readonly horizontal: boolean;
  readonly positions: readonly number[];
}

export interface ChartHit {
  readonly index: number;
  readonly series: number | undefined;
}

export interface ChartScene {
  readonly width: number;
  readonly height: number;
  readonly plot: Box;
  readonly bars: readonly SceneBar[];
  readonly paths: readonly ScenePath[];
  readonly points: readonly ScenePoint[];
  readonly slices: readonly SceneSlice[];
  readonly axis: SceneAxis | undefined;
  readonly lines: readonly SceneLine[];
  readonly texts: readonly SceneText[];
  readonly slots: readonly ChartSlot[];
}

export const ChartKind = {
  Column: 'column',
  Bar: 'bar',
  Line: 'line',
  Area: 'area',
  Pie: 'pie',
  Doughnut: 'doughnut',
  Scatter: 'scatter',
} as const;

export const ChartStacking = { None: 'none', Stacked: 'stacked', Percent: 'percent' } as const;

export const TimeUnit = {
  Second: 'second',
  Minute: 'minute',
  Hour: 'hour',
  Day: 'day',
  Week: 'week',
  Month: 'month',
  Year: 'year',
} as const;

export const BarEnd = { Top: 'top', Bottom: 'bottom', Left: 'left', Right: 'right' } as const;

export const NumberStyle = { Plain: 'plain', Compact: 'compact', Percent: 'percent' } as const;

export const ChartCategoriesKind = { Text: 'text', Time: 'time', Number: 'number' } as const;

export const ChartScale = { Linear: 'linear', Log: 'log' } as const;

export const ScenePathRole = { Line: 'line', Area: 'area' } as const;

export const SceneLineRole = { Grid: 'grid', Baseline: 'baseline' } as const;

export const SceneTextRole = {
  ValueTick: 'value-tick',
  CategoryTick: 'category-tick',
  ValueTitle: 'value-title',
  CategoryTitle: 'category-title',
} as const;

export const ChartAxis = { X: 'x', Y: 'y' } as const;

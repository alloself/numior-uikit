export type ChartKind = 'column' | 'bar';

export type ChartStacking = 'none' | 'stacked' | 'percent';

export type ChartValue = number | null;

export type ChartSlot = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface ChartSeries {
  readonly id: string;
  readonly name: string;
  readonly values: readonly ChartValue[];
  readonly slot?: ChartSlot | undefined;
}

export type ChartCategories =
  | { readonly kind: 'text'; readonly labels: readonly string[] }
  | { readonly kind: 'time'; readonly values: readonly number[] };

export interface ChartValueAxis {
  readonly title?: string | undefined;
  readonly min?: number | undefined;
  readonly max?: number | undefined;
  readonly scale?: 'linear' | 'log' | undefined;
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

export type TimeUnit = 'second' | 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year';

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

export interface SceneLine {
  readonly role: 'grid' | 'baseline';
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
}

export interface SceneText {
  readonly role: 'value-tick' | 'category-tick' | 'value-title' | 'category-title';
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly anchor: 'start' | 'middle' | 'end';
  readonly baseline: 'top' | 'middle' | 'bottom';
  readonly rotate?: number | undefined;
}

export interface ChartScene {
  readonly width: number;
  readonly height: number;
  readonly plot: Box;
  readonly bars: readonly SceneBar[];
  readonly lines: readonly SceneLine[];
  readonly texts: readonly SceneText[];
  readonly slots: readonly ChartSlot[];
}

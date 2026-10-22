import type { LineMove } from '../lines';

export interface LineStyle {
  readonly format: number;
  readonly decoration: number;
}

export interface LineLayout {
  readonly size: number | undefined;
  readonly custom: boolean;
  readonly hidden: boolean;
  readonly level: number;
  readonly collapsed: boolean;
  readonly style: LineStyle | undefined;
  readonly extra: readonly (readonly [name: string, value: string])[];
}

export interface LineLayouts {
  readonly size: number;
  get(line: number): LineLayout | undefined;
  last(): number;
  forEach(visit: (line: number, layout: LineLayout) => void): void;
  forEachIn(from: number, to: number, visit: (line: number, layout: LineLayout) => void): void;
  shifted(change: LineMove): LineLayouts;
}

export interface SheetLayout {
  readonly rows: LineLayouts;
  readonly cols: LineLayouts;
}

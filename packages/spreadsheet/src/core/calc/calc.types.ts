import type { CellRange, CellValue } from '../cell.types';
import type { FormulaNode } from '../formula/formula.types';
import type { Sheet } from '../workbook';

export type EvalValue =
  | CellValue
  | { readonly kind: 'reference'; readonly sheet: Sheet; readonly range: CellRange }
  | { readonly kind: 'array'; readonly rows: readonly (readonly CellValue[])[] };

export type FormulaState = 'fresh' | 'stale' | 'cycle';

export interface FormulaCell {
  readonly text: string;
  readonly ast: FormulaNode;
  state: FormulaState;
}

export interface FunctionArgs {
  readonly count: number;
  missing(index: number): boolean;
  value(index: number): EvalValue;
  scalar(index: number): CellValue;
  number(index: number, fallback?: number): number;
  text(index: number): string;
  logical(index: number, fallback?: boolean): boolean;
  forEachValue(from: number, visit: (value: CellValue, direct: boolean) => void): void;
  lookup(table: EvalValue, column: number, wanted: CellValue): number | undefined;
}

export interface FunctionSpec {
  readonly name: string;
  readonly min: number;
  readonly max: number;
  evaluate(args: FunctionArgs): EvalValue;
}

export interface FunctionRegistry {
  get(name: string): FunctionSpec | undefined;
  readonly names: readonly string[];
}

export interface Limitation {
  readonly kind: 'function';
  readonly name: string;
}

export interface Recalculation {
  readonly total: number;
  readonly done: number;
  readonly settled: Promise<void>;
  cancel(): void;
}

export interface RecalcOptions {
  readonly budgetMs?: number | undefined;
  readonly yieldTo?: (() => Promise<void>) | undefined;
  readonly viewport?: { readonly sheet: Sheet; readonly range: CellRange } | undefined;
}

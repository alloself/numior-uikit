import type { NumberLocale } from '../format/format.types';
import type { CellRange, CellValue } from '../cell.types';
import type { FormulaNode } from '../formula/formula.types';
import type { Sheet } from '../workbook';

export interface ArrayValue {
  readonly kind: 'array';
  readonly rows: readonly (readonly CellValue[])[];
}

export type EvalValue =
  | CellValue
  | { readonly kind: 'reference'; readonly sheet: Sheet; readonly range: CellRange }
  | ArrayValue;

export type FormulaResult = CellValue | ArrayValue;

export type FormulaState = 'fresh' | 'stale' | 'cycle' | 'imported';

export type CellContent =
  | { readonly kind: 'empty' }
  | { readonly kind: 'value'; readonly value: CellValue }
  | { readonly kind: 'formula'; readonly ast: FormulaNode };

export interface ShiftedFormulaCell {
  readonly sheet: Sheet;
  readonly row: number;
  readonly col: number;
  readonly before: FormulaNode;
}

export interface ShiftedName {
  readonly name: string;
  readonly scope: Sheet | undefined;
  readonly before: FormulaNode;
}

export interface FormulaCell {
  readonly ast: FormulaNode;
  state: FormulaState;
}

export interface FunctionArgs {
  readonly count: number;
  readonly locale: NumberLocale;
  missing(index: number): boolean;
  value(index: number): EvalValue;
  scalar(index: number): CellValue;
  number(index: number, fallback?: number): number;
  text(index: number): string;
  logical(index: number, fallback?: boolean): boolean;
  forEachValue(from: number, visit: (value: CellValue, direct: boolean) => void, to?: number): void;
  lookup(table: EvalValue, column: number, wanted: CellValue): number | undefined;
  matrix(index: number): readonly (readonly CellValue[])[];
  now(): number;
  random(): number;
  here(): FormulaPlace;
  refer(sheet: Sheet, range: CellRange): EvalValue;
  indirect(text: string, a1: boolean): EvalValue;
  subtotalAt(sheet: Sheet, row: number, col: number): boolean;
}

export interface FormulaPlace {
  readonly sheet: Sheet;
  readonly row: number;
  readonly col: number;
}

export interface FunctionSpec {
  readonly name: string;
  readonly min: number;
  readonly max: number;
  readonly volatile?: boolean | undefined;
  readonly array?: boolean | undefined;
  readonly lift?: readonly number[] | undefined;
  readonly broadcast?: readonly number[] | undefined;
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
  readonly busyMs: number;
  readonly longestMs: number;
  readonly finished: boolean;
  readonly settled: Promise<void>;
  cancel(): void;
}

export interface RecalcOptions {
  readonly budgetMs?: number | undefined;
  readonly yieldTo?: (() => Promise<void>) | undefined;
  readonly viewport?: { readonly sheet: Sheet; readonly range: CellRange } | undefined;
  readonly volatile?: boolean | undefined;
}

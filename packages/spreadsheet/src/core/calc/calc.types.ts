import type { NumberLocale } from '../format/format.types';
import { type CellInputKind, type CellRange, type CellValue, CellValueKind } from '../cell.types';
import type { CallSignature, FormulaNode } from '../formula/formula.types';
import type { Sheet } from '../workbook';

export interface ArrayValue {
  readonly kind: typeof EvalValueKind.Array;
  readonly rows: readonly (readonly CellValue[])[];
}

export interface AreasValue {
  readonly kind: typeof EvalValueKind.Areas;
  readonly sheet: Sheet;
  readonly ranges: readonly CellRange[];
}

export type EvalValue =
  | CellValue
  | {
      readonly kind: typeof EvalValueKind.Reference;
      readonly sheet: Sheet;
      readonly range: CellRange;
    }
  | AreasValue
  | ArrayValue;

export type FormulaResult = CellValue | ArrayValue;

export type FormulaState = (typeof FormulaState)[keyof typeof FormulaState];

export type CellContent =
  | { readonly kind: typeof CellInputKind.Empty }
  | { readonly kind: typeof CellInputKind.Value; readonly value: CellValue }
  | { readonly kind: typeof CellInputKind.Formula; readonly ast: FormulaNode };

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

export interface FunctionSpec extends CallSignature {
  readonly name: string;
  readonly volatile?: boolean | undefined;
  readonly array?: boolean | undefined;
  readonly arrays?: readonly number[] | typeof ArrayScope.All | undefined;
  readonly lift?: readonly number[] | undefined;
  readonly broadcast?: readonly number[] | undefined;
  readonly unreadAt?: ((index: number) => boolean) | undefined;
  readonly passesAt?: ((index: number, count: number) => boolean) | undefined;
  readonly readsPlace?: boolean | undefined;
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
  readonly planned: boolean;
  readonly settled: Promise<void>;
  cancel(): void;
}

export interface RecalcOptions {
  readonly budgetMs?: number | undefined;
  readonly yieldTo?: (() => Promise<void>) | undefined;
  readonly viewport?: { readonly sheet: Sheet; readonly range: CellRange } | undefined;
  readonly reaching?: { readonly sheet: Sheet; readonly range: CellRange } | undefined;
  readonly volatile?: boolean | undefined;
  readonly imported?: boolean | undefined;
}

export const EvalValueKind = {
  ...CellValueKind,
  Reference: 'reference',
  Areas: 'areas',
  Array: 'array',
} as const;

export const FormulaState = {
  Fresh: 'fresh',
  Stale: 'stale',
  Cycle: 'cycle',
  Imported: 'imported',
} as const;

export const ArrayScope = { All: 'all' } as const;

export const CriteriaToken = {
  AnyText: '*',
  AnyChar: '?',
  EscapedTilde: '~~',
  EscapedStar: '~*',
  EscapedQuestion: '~?',
} as const;

export const DatedifUnit = { Y: 'Y', M: 'M', D: 'D', YM: 'YM', MD: 'MD', YD: 'YD' } as const;

export const WeekendMask = { Weekend: '1' } as const;

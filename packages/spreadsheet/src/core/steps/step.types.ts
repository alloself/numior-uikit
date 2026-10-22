import type { CellContent } from '../calc/calc.types';
import type { CellRange } from '../cell.types';
import type { FormulaNode } from '../formula/formula.types';
import type { LineChange } from '../formula/rewrite';

export type LineAxis = LineChange['axis'];

export interface CellEdit {
  readonly row: number;
  readonly col: number;
  readonly content?: CellContent | undefined;
  readonly format?: string | undefined;
}

export type WorkbookStep =
  | { readonly kind: 'setCells'; readonly sheet: string; readonly cells: readonly CellEdit[] }
  | {
      readonly kind: 'setFormat';
      readonly sheet: string;
      readonly range: CellRange;
      readonly format: string;
    }
  | {
      readonly kind: 'insertLines' | 'deleteLines';
      readonly sheet: string;
      readonly axis: LineAxis;
      readonly at: number;
      readonly count: number;
    }
  | { readonly kind: 'addSheet'; readonly name: string; readonly index: number }
  | { readonly kind: 'removeSheet'; readonly name: string }
  | { readonly kind: 'renameSheet'; readonly from: string; readonly to: string }
  | {
      readonly kind: 'setName';
      readonly name: string;
      readonly scope?: string | undefined;
      readonly ast: FormulaNode | undefined;
    }
  | { readonly kind: 'batch'; readonly steps: readonly WorkbookStep[] };

export type StepRefusal =
  | 'missing-sheet'
  | 'sheet-full'
  | 'name-taken'
  | 'last-sheet'
  | 'invalid-name';

export type StepResult =
  | {
      readonly ok: true;
      readonly inverse: WorkbookStep;
      readonly changes: readonly LineChange[];
    }
  | { readonly ok: false; readonly reason: StepRefusal };

export type StepOutcome =
  | { readonly ok: true; readonly changes: readonly LineChange[] }
  | { readonly ok: false; readonly reason: StepRefusal };

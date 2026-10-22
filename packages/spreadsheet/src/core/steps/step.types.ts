import type { CellContent } from '../calc/calc.types';
import type { CellRange } from '../cell.types';
import type { ConditionalFormat } from '../conditional/conditional.types';
import type { CellDecoration } from '../decorations';
import type { FormulaNode } from '../formula/formula.types';
import type { SheetLayout } from '../layout/layout.types';
import type { PivotSpec, PivotState } from '../pivot/pivot.types';
import type { LineChange } from '../formula/rewrite';
import type { TableShape } from '../tables';

export type LineAxis = LineChange['axis'];

export interface CellEdit {
  readonly row: number;
  readonly col: number;
  readonly content?: CellContent | undefined;
  readonly format?: string | undefined;
  readonly decoration?: CellDecoration | undefined;
}

export interface TableSpec extends TableShape {
  readonly sheet: string;
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
  | { readonly kind: 'addTable'; readonly name: string; readonly table: TableSpec }
  | { readonly kind: 'setTable'; readonly name: string; readonly table: TableSpec | undefined }
  | { readonly kind: 'renameTable'; readonly from: string; readonly to: string }
  | {
      readonly kind: 'setConditional';
      readonly sheet: string;
      readonly formats: readonly ConditionalFormat[];
    }
  | { readonly kind: 'setLayout'; readonly sheet: string; readonly layout: SheetLayout }
  | {
      readonly kind: 'setPivot';
      readonly sheet: string;
      readonly name: string;
      readonly pivot: PivotSpec | undefined;
    }
  | { readonly kind: 'refreshPivot'; readonly sheet: string; readonly name: string }
  | {
      readonly kind: 'putPivot';
      readonly sheet: string;
      readonly name: string;
      readonly pivot: PivotState | undefined;
      readonly cells?: readonly CellEdit[] | undefined;
    }
  | { readonly kind: 'batch'; readonly steps: readonly WorkbookStep[] };

export type SheetStep = Extract<WorkbookStep, { readonly sheet: string }>;

export type StepRefusal =
  | 'missing-sheet'
  | 'sheet-full'
  | 'name-taken'
  | 'last-sheet'
  | 'invalid-name'
  | 'missing-table'
  | 'invalid-table'
  | 'table-overlap'
  | 'invalid-pivot'
  | 'pivot-overlap'
  | 'missing-pivot'
  | 'pivot-output';

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

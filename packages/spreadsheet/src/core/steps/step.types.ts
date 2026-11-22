import type { CellContent } from '../calc/calc.types';
import type { CellRange, LineAxis } from '../cell.types';
import type { ConditionalFormat } from '../conditional/conditional.types';
import type { CellDecoration } from '../decorations';
import type { FormulaNode } from '../formula/formula.types';
import type { SheetLayout } from '../layout/layout.types';
import type { PivotSpec, PivotState } from '../pivot/pivot.types';
import type { LineChange } from '../formula/rewrite';
import type { TableShape } from '../tables';

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
  | {
      readonly kind: typeof StepKind.SetCells;
      readonly sheet: string;
      readonly cells: readonly CellEdit[];
    }
  | {
      readonly kind: typeof StepKind.SetFormat;
      readonly sheet: string;
      readonly range: CellRange;
      readonly format: string;
    }
  | {
      readonly kind: typeof StepKind.InsertLines | typeof StepKind.DeleteLines;
      readonly sheet: string;
      readonly axis: LineAxis;
      readonly at: number;
      readonly count: number;
    }
  | {
      readonly kind: typeof StepKind.AddSheet;
      readonly name: string;
      readonly index: number;
      readonly key?: string | undefined;
    }
  | { readonly kind: typeof StepKind.RemoveSheet; readonly name: string }
  | { readonly kind: typeof StepKind.RenameSheet; readonly from: string; readonly to: string }
  | {
      readonly kind: typeof StepKind.SetName;
      readonly name: string;
      readonly scope?: string | undefined;
      readonly ast: FormulaNode | undefined;
    }
  | { readonly kind: typeof StepKind.AddTable; readonly name: string; readonly table: TableSpec }
  | {
      readonly kind: typeof StepKind.SetTable;
      readonly name: string;
      readonly table: TableSpec | undefined;
    }
  | { readonly kind: typeof StepKind.RenameTable; readonly from: string; readonly to: string }
  | {
      readonly kind: typeof StepKind.SetConditional;
      readonly sheet: string;
      readonly formats: readonly ConditionalFormat[];
      readonly base?: readonly ConditionalFormat[] | undefined;
    }
  | {
      readonly kind: typeof StepKind.SetLayout;
      readonly sheet: string;
      readonly layout: SheetLayout;
      readonly base?: SheetLayout | undefined;
    }
  | {
      readonly kind: typeof StepKind.SetPivot;
      readonly sheet: string;
      readonly name: string;
      readonly pivot: PivotSpec | undefined;
    }
  | { readonly kind: typeof StepKind.RefreshPivot; readonly sheet: string; readonly name: string }
  | {
      readonly kind: typeof StepKind.PutPivot;
      readonly sheet: string;
      readonly name: string;
      readonly pivot: PivotState | undefined;
      readonly cells?: readonly CellEdit[] | undefined;
      readonly layout?: SheetLayout | undefined;
      readonly base?: SheetLayout | undefined;
    }
  | { readonly kind: typeof StepKind.Batch; readonly steps: readonly WorkbookStep[] };

export type SheetStep = Extract<WorkbookStep, { readonly sheet: string }>;

export type StepRefusal = (typeof StepRefusal)[keyof typeof StepRefusal];

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

export const StepRefusal = {
  MissingSheet: 'missing-sheet',
  SheetFull: 'sheet-full',
  NameTaken: 'name-taken',
  KeyTaken: 'key-taken',
  LastSheet: 'last-sheet',
  InvalidName: 'invalid-name',
  MissingTable: 'missing-table',
  InvalidTable: 'invalid-table',
  TableOverlap: 'table-overlap',
  InvalidPivot: 'invalid-pivot',
  PivotOverlap: 'pivot-overlap',
  MissingPivot: 'missing-pivot',
  PivotOutput: 'pivot-output',
} as const;

export const StepKind = {
  SetCells: 'setCells',
  SetFormat: 'setFormat',
  InsertLines: 'insertLines',
  DeleteLines: 'deleteLines',
  AddSheet: 'addSheet',
  RemoveSheet: 'removeSheet',
  RenameSheet: 'renameSheet',
  SetName: 'setName',
  AddTable: 'addTable',
  SetTable: 'setTable',
  RenameTable: 'renameTable',
  SetConditional: 'setConditional',
  SetLayout: 'setLayout',
  SetPivot: 'setPivot',
  RefreshPivot: 'refreshPivot',
  PutPivot: 'putPivot',
  Batch: 'batch',
} as const;

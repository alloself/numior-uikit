import type { Calculator } from '../calc/calculator';
import type { LineChange } from '../formula/rewrite';
import type { Stepper } from '../steps/apply-step';
import type { WorkbookHistory } from '../steps/history';
import type { WorkbookStep } from '../steps/step.types';
import type { WireWorkbookStep } from '../wire/wire.types';
import type { Workbook } from '../workbook';

export interface SchemaStampLike {
  readonly name: string;
  readonly version: number;
}

export type RemoteChange =
  | { readonly kind: typeof RemoteChangeKind.Lines; readonly change: LineChange }
  | {
      readonly kind: typeof RemoteChangeKind.RenameSheet;
      readonly from: string;
      readonly to: string;
    }
  | { readonly kind: typeof RemoteChangeKind.RemoveSheet; readonly name: string }
  | {
      readonly kind: typeof RemoteChangeKind.RenameTable;
      readonly from: string;
      readonly to: string;
    };

export interface RemoteBatch {
  readonly version: number;
  readonly clientId: string;
  readonly steps: readonly unknown[];
}

export interface WorkbookDocumentOptions {
  readonly book: Workbook;
  readonly calculator: Calculator;
  readonly version?: number | null | undefined;
}

export type WorkbookDocumentListener = (
  steps: readonly WorkbookStep[],
  lines: readonly LineChange[],
) => void;

export interface WorkbookDocument {
  readonly version: () => number | null;
  readonly pending: () => readonly WireWorkbookStep[];
  readonly load: (snapshot: unknown, version: number) => boolean;
  readonly receive: (batch: RemoteBatch) => boolean;
  readonly confirm: (count: number, version: number) => void;
  readonly settle: (count: number, steps: readonly unknown[], version: number) => boolean;
  readonly stepper: Stepper;
  readonly follow: (history: WorkbookHistory) => void;
  readonly subscribe: (listener: WorkbookDocumentListener) => () => void;
}

export interface WorkbookAuthority {
  readonly schema: SchemaStampLike;
  readonly snapshot: () => unknown;
  readonly apply: (steps: readonly unknown[]) => boolean;
  readonly rebase: (
    steps: readonly unknown[],
    behind: number,
  ) => readonly WireWorkbookStep[] | undefined;
}

export interface WorkbookAuthorityOptions {
  readonly window?: number | undefined;
}

export const RemoteChangeKind = {
  Lines: 'lines',
  RenameSheet: 'renameSheet',
  RemoveSheet: 'removeSheet',
  RenameTable: 'renameTable',
} as const;

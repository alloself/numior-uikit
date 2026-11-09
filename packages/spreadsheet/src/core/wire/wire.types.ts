import type { CellDecoration } from '../decorations';
import type { DrawingContent, DrawingKind, SheetDrawing } from '../drawings/drawing.types';
import type { LineLayout, SheetLayout } from '../layout/layout.types';
import type { StepKind, WorkbookStep } from '../steps/step.types';

export type WireLineStyle = {
  readonly format: string;
  readonly decoration: CellDecoration;
};

export type WireLine = Omit<LineLayout, 'style'> & {
  readonly style: WireLineStyle | undefined;
};

export type WireLines = readonly (readonly [line: number, layout: WireLine])[];

export type WireDrawingContent =
  | Exclude<DrawingContent, { readonly kind: typeof DrawingKind.Picture }>
  | {
      readonly kind: typeof DrawingKind.Picture;
      readonly media: string;
      readonly type: string;
      readonly bytes: string;
    };

export type WireDrawing = Omit<SheetDrawing, 'content'> & {
  readonly content: WireDrawingContent;
};

export type WireLayout = Omit<SheetLayout, 'rows' | 'cols' | 'drawings'> & {
  readonly rows: WireLines;
  readonly cols: WireLines;
  readonly drawings: readonly WireDrawing[];
};

type ConvertedKind = typeof StepKind.SetLayout | typeof StepKind.PutPivot | typeof StepKind.Batch;

type PlainWorkbookStep = Exclude<WorkbookStep, { readonly kind: ConvertedKind }>;

type PutPivotStep = Extract<WorkbookStep, { readonly kind: typeof StepKind.PutPivot }>;

export type WireWorkbookStep =
  | PlainWorkbookStep
  | {
      readonly kind: typeof StepKind.SetLayout;
      readonly sheet: string;
      readonly layout: WireLayout;
    }
  | (Omit<PutPivotStep, 'layout'> & { readonly layout?: WireLayout | undefined })
  | { readonly kind: typeof StepKind.Batch; readonly steps: readonly WireWorkbookStep[] };

export interface StepCodec {
  readonly encode: (step: WorkbookStep) => WireWorkbookStep;
  readonly decode: (value: unknown) => WorkbookStep | undefined;
}

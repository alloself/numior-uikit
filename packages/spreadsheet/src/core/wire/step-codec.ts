import {
  isBoolean,
  isString,
  listOf,
  oneOf,
  optional,
  shapeOf,
  type Guard,
} from '@numior/primitives/guards';
import { LineAxis } from '../cell.types';
import { DrawingKind, type DrawingContent, type SheetDrawing } from '../drawings/drawing.types';
import { lineLayoutsOf } from '../layout/line-layouts';
import type { LineLayout, LineLayouts, SheetLayout } from '../layout/layout.types';
import { StepKind, type CellEdit, type TableSpec, type WorkbookStep } from '../steps/step.types';
import type { Workbook } from '../workbook';
import { isWireLayout } from './wire-layout';
import { isPivotSpec, isPivotState } from './wire-pivot';
import { isConditionalFormat } from './wire-rules';
import { isDecoration } from './wire-styles';
import {
  byKind,
  isCellContent,
  isCol,
  isCount,
  isFormula,
  isRange,
  isRow,
  lazy,
} from './wire-values';
import type {
  StepCodec,
  WireDrawing,
  WireLayout,
  WireLine,
  WireLines,
  WireWorkbookStep,
} from './wire.types';

const BYTES_PER_PIECE = 0x8000;

const isCellEdit: Guard<CellEdit> = shapeOf({
  row: isRow,
  col: isCol,
  content: optional(isCellContent),
  format: optional(isString),
  decoration: optional(isDecoration),
});

const isTableSpec: Guard<TableSpec> = shapeOf({
  sheet: isString,
  range: isRange,
  columns: listOf(isString),
  headers: isBoolean,
  totals: isBoolean,
});

const isPositive: Guard<number> = (value): value is number => isCount(value) && value > 0;

const LINES = {
  sheet: isString,
  axis: oneOf(...Object.values(LineAxis)),
  at: isCount,
  count: isPositive,
};

const nested: Guard<WireWorkbookStep> = lazy(() => isWireStep);

const isWireStep: Guard<WireWorkbookStep> = byKind({
  [StepKind.SetCells]: shapeOf({
    kind: oneOf(StepKind.SetCells),
    sheet: isString,
    cells: listOf(isCellEdit),
  }),
  [StepKind.SetFormat]: shapeOf({
    kind: oneOf(StepKind.SetFormat),
    sheet: isString,
    range: isRange,
    format: isString,
  }),
  [StepKind.InsertLines]: shapeOf({ kind: oneOf(StepKind.InsertLines), ...LINES }),
  [StepKind.DeleteLines]: shapeOf({ kind: oneOf(StepKind.DeleteLines), ...LINES }),
  [StepKind.AddSheet]: shapeOf({ kind: oneOf(StepKind.AddSheet), name: isString, index: isCount }),
  [StepKind.RemoveSheet]: shapeOf({ kind: oneOf(StepKind.RemoveSheet), name: isString }),
  [StepKind.RenameSheet]: shapeOf({
    kind: oneOf(StepKind.RenameSheet),
    from: isString,
    to: isString,
  }),
  [StepKind.SetName]: shapeOf({
    kind: oneOf(StepKind.SetName),
    name: isString,
    scope: optional(isString),
    ast: optional(isFormula),
  }),
  [StepKind.AddTable]: shapeOf({
    kind: oneOf(StepKind.AddTable),
    name: isString,
    table: isTableSpec,
  }),
  [StepKind.SetTable]: shapeOf({
    kind: oneOf(StepKind.SetTable),
    name: isString,
    table: optional(isTableSpec),
  }),
  [StepKind.RenameTable]: shapeOf({
    kind: oneOf(StepKind.RenameTable),
    from: isString,
    to: isString,
  }),
  [StepKind.SetConditional]: shapeOf({
    kind: oneOf(StepKind.SetConditional),
    sheet: isString,
    formats: listOf(isConditionalFormat),
  }),
  [StepKind.SetLayout]: shapeOf({
    kind: oneOf(StepKind.SetLayout),
    sheet: isString,
    layout: isWireLayout,
  }),
  [StepKind.SetPivot]: shapeOf({
    kind: oneOf(StepKind.SetPivot),
    sheet: isString,
    name: isString,
    pivot: optional(isPivotSpec),
  }),
  [StepKind.RefreshPivot]: shapeOf({
    kind: oneOf(StepKind.RefreshPivot),
    sheet: isString,
    name: isString,
  }),
  [StepKind.PutPivot]: shapeOf({
    kind: oneOf(StepKind.PutPivot),
    sheet: isString,
    name: isString,
    pivot: optional(isPivotState),
    cells: optional(listOf(isCellEdit)),
    layout: optional(isWireLayout),
  }),
  [StepKind.Batch]: shapeOf({ kind: oneOf(StepKind.Batch), steps: listOf(nested) }),
});

const toBase64 = (bytes: Uint8Array): string => {
  const pieces: string[] = [];

  for (let at = 0; at < bytes.length; at += BYTES_PER_PIECE) {
    pieces.push(String.fromCharCode(...bytes.subarray(at, at + BYTES_PER_PIECE)));
  }
  return btoa(pieces.join(''));
};

const fromBase64 = (text: string): Uint8Array | undefined => {
  try {
    return Uint8Array.from(atob(text), (char) => char.charCodeAt(0));
  } catch {
    return undefined;
  }
};

const drawingToWire = (drawing: SheetDrawing): WireDrawing =>
  drawing.content.kind === DrawingKind.Picture
    ? { ...drawing, content: { ...drawing.content, bytes: toBase64(drawing.content.bytes) } }
    : { ...drawing, content: drawing.content };

const contentFromWire = (content: WireDrawing['content']): DrawingContent | undefined => {
  if (content.kind !== DrawingKind.Picture) {
    return content;
  }

  const bytes = fromBase64(content.bytes);

  return bytes === undefined ? undefined : { ...content, bytes };
};

const drawingsFromWire = (drawings: readonly WireDrawing[]): readonly SheetDrawing[] | undefined =>
  drawings.reduce<SheetDrawing[] | undefined>((decoded, drawing) => {
    const content = contentFromWire(drawing.content);

    return decoded === undefined || content === undefined
      ? undefined
      : [...decoded, { ...drawing, content }];
  }, []);

export const createStepCodec = (book: Workbook): StepCodec => {
  const lineToWire = (layout: LineLayout): WireLine => ({
    ...layout,
    style:
      layout.style === undefined
        ? undefined
        : {
            format: book.formats.code(layout.style.format),
            decoration: book.decorations.get(layout.style.decoration),
          },
  });

  const lineFromWire = (layout: WireLine): LineLayout => ({
    ...layout,
    style:
      layout.style === undefined
        ? undefined
        : {
            format: book.formats.id(layout.style.format),
            decoration: book.decorations.id(layout.style.decoration),
          },
  });

  const linesToWire = (lines: LineLayouts): WireLines => {
    const entries: [number, WireLine][] = [];

    lines.forEach((line, layout) => {
      entries.push([line, lineToWire(layout)]);
    });

    return entries;
  };

  const linesFromWire = (lines: WireLines): LineLayouts =>
    lineLayoutsOf(lines.map(([line, layout]) => [line, lineFromWire(layout)]));

  const layoutToWire = (layout: SheetLayout): WireLayout => ({
    ...layout,
    rows: linesToWire(layout.rows),
    cols: linesToWire(layout.cols),
    drawings: layout.drawings.map(drawingToWire),
  });

  const layoutFromWire = (layout: WireLayout): SheetLayout | undefined => {
    const drawings = drawingsFromWire(layout.drawings);

    return drawings === undefined
      ? undefined
      : {
          ...layout,
          rows: linesFromWire(layout.rows),
          cols: linesFromWire(layout.cols),
          drawings,
        };
  };

  const encode = (step: WorkbookStep): WireWorkbookStep => {
    switch (step.kind) {
      case StepKind.SetLayout:
        return { ...step, layout: layoutToWire(step.layout) };
      case StepKind.PutPivot:
        return {
          ...step,
          layout: step.layout === undefined ? undefined : layoutToWire(step.layout),
        };
      case StepKind.Batch:
        return { ...step, steps: step.steps.map(encode) };
      default:
        return step;
    }
  };

  const fromWire = (step: WireWorkbookStep): WorkbookStep | undefined => {
    switch (step.kind) {
      case StepKind.SetLayout: {
        const layout = layoutFromWire(step.layout);

        return layout === undefined ? undefined : { ...step, layout };
      }
      case StepKind.PutPivot: {
        if (step.layout === undefined) {
          return { ...step, layout: undefined };
        }

        const layout = layoutFromWire(step.layout);

        return layout === undefined ? undefined : { ...step, layout };
      }
      case StepKind.Batch: {
        const steps = step.steps.reduce<WorkbookStep[] | undefined>((decoded, part) => {
          const inner = fromWire(part);

          return decoded === undefined || inner === undefined ? undefined : [...decoded, inner];
        }, []);

        return steps === undefined ? undefined : { kind: StepKind.Batch, steps };
      }
      default:
        return step;
    }
  };

  return {
    encode,
    decode: (value) => (isWireStep(value) ? fromWire(value) : undefined),
  };
};

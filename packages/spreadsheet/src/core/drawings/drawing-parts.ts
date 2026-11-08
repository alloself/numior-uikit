import { LineAxis } from '../cell.types';
import { isSlot } from '../layout/fragments';
import {
  FragmentSlotKind,
  MeasureName,
  type Fragment,
  type FragmentPiece,
  type FragmentSlot,
  type PartXml,
} from '../layout/fragments.types';
import type { SheetLayout } from '../layout/layout.types';
import { emuOfPixels } from './drawings';
import {
  DrawingAnchorKind,
  DrawingKind,
  type DrawingAnchor,
  type DrawingMark,
  type DrawingSource,
  type SheetChart,
  type SheetDrawing,
} from './drawing.types';

type MeasureValues = ReadonlyMap<MeasureName, readonly number[]>;

interface AnchorValues {
  readonly lines: ReadonlyMap<LineAxis, readonly number[]>;
  readonly measures: MeasureValues;
}

const isChild = (piece: FragmentPiece): piece is Fragment =>
  typeof piece !== 'string' && !isSlot(piece);

const marksOf = (anchor: DrawingAnchor): readonly DrawingMark[] => {
  switch (anchor.kind) {
    case DrawingAnchorKind.Cells:
      return [anchor.from, anchor.to];
    case DrawingAnchorKind.Cell:
      return [anchor.from];
    case DrawingAnchorKind.Point:
      return [];
  }
};

const sizeValues = (anchor: DrawingAnchor): [MeasureName, readonly number[]][] => {
  if (anchor.kind === DrawingAnchorKind.Cells) {
    return [];
  }

  return [
    [MeasureName.Width, [emuOfPixels(anchor.width)]],
    [MeasureName.Height, [emuOfPixels(anchor.height)]],
  ];
};

const pointValues = (anchor: DrawingAnchor): [MeasureName, readonly number[]][] =>
  anchor.kind === DrawingAnchorKind.Point
    ? [
        [MeasureName.X, [emuOfPixels(anchor.x)]],
        [MeasureName.Y, [emuOfPixels(anchor.y)]],
      ]
    : [];

const valuesOf = (anchor: DrawingAnchor): AnchorValues => {
  const marks = marksOf(anchor);

  return {
    lines: new Map([
      [LineAxis.Cols, marks.map((mark) => mark.col)],
      [LineAxis.Rows, marks.map((mark) => mark.row)],
    ]),
    measures: new Map([
      [MeasureName.ColOff, marks.map((mark) => emuOfPixels(mark.dx))],
      [MeasureName.RowOff, marks.map((mark) => emuOfPixels(mark.dy))],
      ...sizeValues(anchor),
      ...pointValues(anchor),
    ]),
  };
};

const placeFragment = (fragment: Fragment, anchor: DrawingAnchor): Fragment => {
  const values = valuesOf(anchor);
  const seen = new Map<string, number>();

  const next = (key: string): number => {
    const index = seen.get(key) ?? 0;

    seen.set(key, index + 1);
    return index;
  };

  const placeSlot = (slot: FragmentSlot): FragmentSlot => {
    if (slot.kind === FragmentSlotKind.Line) {
      const line = values.lines.get(slot.axis)?.[next(slot.axis)];

      return line === undefined || line === slot.line ? slot : { ...slot, line };
    }
    if (slot.kind === FragmentSlotKind.Measure) {
      const value = values.measures.get(slot.name)?.[next(slot.name)];

      return value === undefined || value === slot.value ? slot : { ...slot, value };
    }
    return slot;
  };

  return {
    ...fragment,
    pieces: fragment.pieces.map((piece) =>
      typeof piece !== 'string' && isSlot(piece) ? placeSlot(piece) : piece,
    ),
  };
};

const placeInRoot = (root: Fragment, index: number, anchor: DrawingAnchor): Fragment => {
  let at = -1;

  return {
    ...root,
    pieces: root.pieces.map((piece) => {
      at += isChild(piece) ? 1 : 0;
      return isChild(piece) && at === index ? placeFragment(piece, anchor) : piece;
    }),
  };
};

const dropFromRoot = (root: Fragment, index: number): Fragment => {
  let at = -1;

  return {
    ...root,
    pieces: root.pieces.filter((piece) => {
      at += isChild(piece) ? 1 : 0;
      return !isChild(piece) || at !== index;
    }),
  };
};

const withPart = (
  parts: readonly PartXml[],
  source: DrawingSource | undefined,
  change: (root: Fragment, index: number) => Fragment,
): readonly PartXml[] =>
  source === undefined
    ? parts
    : parts.map((part) =>
        part.path === source.part ? { ...part, root: change(part.root, source.anchor) } : part,
      );

const afterRemoval = (drawing: SheetDrawing, removed: DrawingSource | undefined): SheetDrawing => {
  const { source } = drawing;

  return source === undefined ||
    removed === undefined ||
    source.part !== removed.part ||
    source.anchor < removed.anchor
    ? drawing
    : { ...drawing, source: { ...source, anchor: source.anchor - 1 } };
};

export const canEditDrawing = (layout: SheetLayout, drawing: SheetDrawing): boolean =>
  drawing.source === undefined || layout.parts.some((part) => part.path === drawing.source?.part);

export const placeDrawing = (
  layout: SheetLayout,
  id: string,
  anchor: DrawingAnchor,
): SheetLayout => {
  const drawing = layout.drawings.find((each) => each.id === id);

  return drawing === undefined
    ? layout
    : {
        ...layout,
        parts: withPart(layout.parts, drawing.source, (root, index) =>
          placeInRoot(root, index, anchor),
        ),
        drawings: layout.drawings.map((each) => (each === drawing ? { ...each, anchor } : each)),
      };
};

export const changeChart = (layout: SheetLayout, id: string, chart: SheetChart): SheetLayout => ({
  ...layout,
  drawings: layout.drawings.map((drawing) =>
    drawing.id === id && drawing.content.kind === DrawingKind.Chart
      ? { ...drawing, content: { ...drawing.content, chart, rewrite: true } }
      : drawing,
  ),
});

export const removeDrawing = (layout: SheetLayout, id: string): SheetLayout => {
  const drawing = layout.drawings.find((each) => each.id === id);

  return drawing === undefined
    ? layout
    : {
        ...layout,
        parts: withPart(layout.parts, drawing.source, dropFromRoot),
        drawings: layout.drawings.reduce<SheetDrawing[]>((kept, each) => {
          if (each !== drawing) {
            kept.push(afterRemoval(each, drawing.source));
          }
          return kept;
        }, []),
      };
};

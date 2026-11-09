import { DrawingKind, type SheetDrawing } from '../drawings/drawing.types';
import { lineLayoutsOf } from '../layout/line-layouts';
import type { LineLayout, LineLayouts, SheetLayout, SheetView } from '../layout/layout.types';

const sameJSON = (left: unknown, right: unknown): boolean =>
  left === right || JSON.stringify(left) === JSON.stringify(right);

const chosen = <T>(base: T, mine: T, theirs: T): T => (sameJSON(mine, base) ? theirs : mine);

const entriesOf = (lines: LineLayouts): Map<number, LineLayout> => {
  const entries = new Map<number, LineLayout>();

  lines.forEach((line, layout) => {
    entries.set(line, layout);
  });

  return entries;
};

const mergeLines = (base: LineLayouts, mine: LineLayouts, theirs: LineLayouts): LineLayouts => {
  const old = entriesOf(base);
  const own = entriesOf(mine);
  const other = entriesOf(theirs);

  const entries = [...new Set([...old.keys(), ...own.keys(), ...other.keys()])].reduce<
    [number, LineLayout][]
  >((merged, line) => {
    const layout = chosen(old.get(line), own.get(line), other.get(line));

    if (layout !== undefined) {
      merged.push([line, layout]);
    }
    return merged;
  }, []);

  return lineLayoutsOf(entries);
};

const mergeView = (base: SheetView, mine: SheetView, theirs: SheetView): SheetView => ({
  frozenRows: chosen(base.frozenRows, mine.frozenRows, theirs.frozenRows),
  frozenCols: chosen(base.frozenCols, mine.frozenCols, theirs.frozenCols),
  gridlines: chosen(base.gridlines, mine.gridlines, theirs.gridlines),
  rightToLeft: chosen(base.rightToLeft, mine.rightToLeft, theirs.rightToLeft),
  zoom: chosen(base.zoom, mine.zoom, theirs.zoom),
});

const drawingFace = (drawing: SheetDrawing | undefined): unknown => {
  if (drawing === undefined) {
    return undefined;
  }
  return drawing.content.kind === DrawingKind.Picture
    ? { ...drawing, content: { ...drawing.content, bytes: drawing.content.media } }
    : drawing;
};

const drawingsById = (drawings: readonly SheetDrawing[]): Map<string, SheetDrawing> =>
  new Map(drawings.map((drawing) => [drawing.id, drawing]));

const mergeDrawings = (
  base: readonly SheetDrawing[],
  mine: readonly SheetDrawing[],
  theirs: readonly SheetDrawing[],
): readonly SheetDrawing[] => {
  const old = drawingsById(base);
  const own = drawingsById(mine);
  const other = drawingsById(theirs);

  const pick = (id: string): SheetDrawing | undefined => {
    const before = old.get(id);
    const after = own.get(id);

    return sameJSON(drawingFace(after), drawingFace(before)) ? other.get(id) : after;
  };

  return [...new Set([...other.keys(), ...own.keys()])].reduce<SheetDrawing[]>((merged, id) => {
    const drawing = pick(id);

    if (drawing !== undefined) {
      merged.push(drawing);
    }
    return merged;
  }, []);
};

export const mergeLayouts = (
  base: SheetLayout,
  mine: SheetLayout,
  theirs: SheetLayout,
): SheetLayout => ({
  rows: mergeLines(base.rows, mine.rows, theirs.rows),
  cols: mergeLines(base.cols, mine.cols, theirs.cols),
  merges: chosen(base.merges, mine.merges, theirs.merges),
  view: mergeView(base.view, mine.view, theirs.view),
  defaults: chosen(base.defaults, mine.defaults, theirs.defaults),
  xml: chosen(base.xml, mine.xml, theirs.xml),
  parts: chosen(base.parts, mine.parts, theirs.parts),
  drawings: mergeDrawings(base.drawings, mine.drawings, theirs.drawings),
});

import { DrawingKind, type SheetDrawing } from '../drawings/drawing.types';
import { EMPTY_LAYOUT, lineLayoutsOf } from './line-layouts';
import type { LineLayout, LineLayouts, SheetLayout, SheetView } from './layout.types';

type Choice = <T>(base: T, mine: T, theirs: T, same: (left: T, right: T) => boolean) => T;

type LineEntry = [line: number, layout: LineLayout];

export interface LayoutDelta {
  readonly layout: SheetLayout;
  readonly base: SheetLayout;
}

const sameJSON = (left: unknown, right: unknown): boolean =>
  left === right || JSON.stringify(left) === JSON.stringify(right);

const preferred: Choice = (base, mine, theirs, same) => (same(mine, base) ? theirs : mine);

const yielded: Choice = (base, mine, theirs, same) => (same(theirs, base) ? mine : theirs);

const sameExtra = (left: LineLayout['extra'], right: LineLayout['extra']): boolean =>
  left.length === right.length &&
  left.every(([name, value], index) => name === right[index]?.[0] && value === right[index]?.[1]);

const sameSize = (left: LineLayout, right: LineLayout): boolean =>
  left.size === right.size && left.custom === right.custom && left.hidden === right.hidden;

const sameOutline = (left: LineLayout, right: LineLayout): boolean =>
  left.level === right.level && left.collapsed === right.collapsed;

const sameStyle = (left: LineLayout, right: LineLayout): boolean =>
  left.style?.format === right.style?.format && left.style?.decoration === right.style?.decoration;

const sameLine = (left: LineLayout | undefined, right: LineLayout | undefined): boolean =>
  left === right ||
  (left !== undefined &&
    right !== undefined &&
    sameSize(left, right) &&
    sameOutline(left, right) &&
    sameStyle(left, right) &&
    sameExtra(left.extra, right.extra));

const sameLines = (left: LineLayouts, right: LineLayouts): boolean => {
  if (left === right) {
    return true;
  }
  if (left.size !== right.size) {
    return false;
  }
  let same = true;

  left.forEach((line, layout) => {
    same &&= sameLine(layout, right.get(line));
  });

  return same;
};

const mergeLines = (
  choose: Choice,
  base: LineLayouts,
  mine: LineLayouts,
  theirs: LineLayouts,
): LineLayouts => {
  if (sameLines(mine, base)) {
    return theirs;
  }

  const decided = new Map<number, LineLayout | undefined>();

  const decide = (line: number): void => {
    decided.set(line, choose(base.get(line), mine.get(line), theirs.get(line), sameLine));
  };

  const entries: LineEntry[] = [];

  base.forEach(decide);
  mine.forEach(decide);

  theirs.forEach((line, layout) => {
    if (decided.has(line)) {
      return;
    }

    entries.push([line, layout]);
  });

  decided.forEach((layout, line) => {
    if (layout === undefined) {
      return;
    }

    entries.push([line, layout]);
  });

  return lineLayoutsOf(entries);
};

const linesApart = (lines: LineLayouts, others: LineLayouts): LineLayouts => {
  const entries: LineEntry[] = [];

  lines.forEach((line, layout) => {
    if (sameLine(layout, others.get(line))) {
      return;
    }

    entries.push([line, layout]);
  });

  return lineLayoutsOf(entries);
};

const mergeView = (
  choose: Choice,
  base: SheetView,
  mine: SheetView,
  theirs: SheetView,
): SheetView => ({
  frozenRows: choose(base.frozenRows, mine.frozenRows, theirs.frozenRows, Object.is),
  frozenCols: choose(base.frozenCols, mine.frozenCols, theirs.frozenCols, Object.is),
  gridlines: choose(base.gridlines, mine.gridlines, theirs.gridlines, Object.is),
  rightToLeft: choose(base.rightToLeft, mine.rightToLeft, theirs.rightToLeft, Object.is),
  zoom: choose(base.zoom, mine.zoom, theirs.zoom, Object.is),
});

const drawingFace = (drawing: SheetDrawing | undefined): unknown => {
  if (drawing === undefined) {
    return undefined;
  }
  return drawing.content.kind === DrawingKind.Picture
    ? { ...drawing, content: { ...drawing.content, bytes: drawing.content.media } }
    : drawing;
};

const sameDrawing = (left: SheetDrawing | undefined, right: SheetDrawing | undefined): boolean =>
  left === right || sameJSON(drawingFace(left), drawingFace(right));

const drawingsById = (drawings: readonly SheetDrawing[]): Map<string, SheetDrawing> =>
  new Map(drawings.map((drawing) => [drawing.id, drawing]));

const mergeDrawings = (
  choose: Choice,
  base: readonly SheetDrawing[],
  mine: readonly SheetDrawing[],
  theirs: readonly SheetDrawing[],
): readonly SheetDrawing[] => {
  const old = drawingsById(base);
  const own = drawingsById(mine);
  const other = drawingsById(theirs);

  return [...new Set([...other.keys(), ...own.keys()])].reduce<SheetDrawing[]>((merged, id) => {
    const drawing = choose(old.get(id), own.get(id), other.get(id), sameDrawing);

    if (drawing !== undefined) {
      merged.push(drawing);
    }
    return merged;
  }, []);
};

const sameDrawings = (left: readonly SheetDrawing[], right: readonly SheetDrawing[]): boolean =>
  left === right ||
  (left.length === right.length &&
    left.every((drawing, index) => sameDrawing(drawing, right[index])));

const merging =
  (choose: Choice) =>
  (base: SheetLayout, mine: SheetLayout, theirs: SheetLayout): SheetLayout => ({
    rows: mergeLines(choose, base.rows, mine.rows, theirs.rows),
    cols: mergeLines(choose, base.cols, mine.cols, theirs.cols),
    merges: choose(base.merges, mine.merges, theirs.merges, sameJSON),
    view: mergeView(choose, base.view, mine.view, theirs.view),
    defaults: choose(base.defaults, mine.defaults, theirs.defaults, sameJSON),
    xml: choose(base.xml, mine.xml, theirs.xml, sameJSON),
    parts: choose(base.parts, mine.parts, theirs.parts, sameJSON),
    drawings: sameDrawings(mine.drawings, base.drawings)
      ? theirs.drawings
      : mergeDrawings(choose, base.drawings, mine.drawings, theirs.drawings),
  });

const drawingsApart = (
  drawings: readonly SheetDrawing[],
  others: readonly SheetDrawing[],
): readonly SheetDrawing[] => {
  const known = drawingsById(others);

  return drawings.reduce<SheetDrawing[]>((apart, drawing) => {
    if (!sameDrawing(drawing, known.get(drawing.id))) {
      apart.push(drawing);
    }
    return apart;
  }, []);
};

const apart = <T>(left: T, right: T, empty: T): readonly [T, T] =>
  sameJSON(left, right) ? [empty, empty] : [left, right];

export const layoutDelta = (base: SheetLayout, layout: SheetLayout): LayoutDelta | undefined => {
  if (base === layout) {
    return undefined;
  }

  const [oldMerges, merges] = apart(base.merges, layout.merges, EMPTY_LAYOUT.merges);
  const [oldXml, xml] = apart(base.xml, layout.xml, undefined);
  const [oldParts, parts] = apart(base.parts, layout.parts, EMPTY_LAYOUT.parts);

  const delta: LayoutDelta = {
    base: {
      rows: linesApart(base.rows, layout.rows),
      cols: linesApart(base.cols, layout.cols),
      merges: oldMerges,
      view: base.view,
      defaults: base.defaults,
      xml: oldXml,
      parts: oldParts,
      drawings: drawingsApart(base.drawings, layout.drawings),
    },
    layout: {
      rows: linesApart(layout.rows, base.rows),
      cols: linesApart(layout.cols, base.cols),
      merges,
      view: layout.view,
      defaults: layout.defaults,
      xml,
      parts,
      drawings: drawingsApart(layout.drawings, base.drawings),
    },
  };

  const same =
    delta.base.rows.size +
      delta.layout.rows.size +
      delta.base.cols.size +
      delta.layout.cols.size ===
      0 &&
    delta.base.drawings.length + delta.layout.drawings.length === 0 &&
    merges === oldMerges &&
    xml === oldXml &&
    parts === oldParts &&
    sameJSON(base.view, layout.view) &&
    sameJSON(base.defaults, layout.defaults);

  return same ? undefined : delta;
};

export const layoutBack = (base: SheetLayout, layout: SheetLayout): LayoutDelta =>
  layoutDelta(base, layout) ?? { layout: EMPTY_LAYOUT, base: EMPTY_LAYOUT };

export const mergeLayouts = merging(preferred);

export const patchLayout = merging(yielded);

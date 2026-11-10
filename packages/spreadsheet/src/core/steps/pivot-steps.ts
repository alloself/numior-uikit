import { MAX_COLS, MAX_ROWS, containsCell } from '../address';
import { CellInputKind, LineAxis, type CellRange } from '../cell.types';
import { sameName, type LineChange } from '../formula/rewrite';
import { shiftIndex } from '../lines';
import { shiftRanges } from '../layout/shift-ranges';
import { buildPivotCache, pivotSource, pivotSourceArea } from '../pivot/pivot-cache';
import { VALUES_FIELD, computePivot } from '../pivot/pivot-engine';
import { renderPivot } from '../pivot/pivot-render';
import {
  PivotSourceKind,
  type PivotDefinition,
  type PivotSource,
  type PivotSpec,
  type PivotState,
} from '../pivot/pivot.types';
import { rangesMeet } from '../tables';
import type { SheetLayout } from '../layout/layout.types';
import { layoutBack, patchLayout } from '../layout/merge-layout';
import { fittedLayout } from './pivot-widths';
import type { Sheet, SheetPivot, Workbook } from '../workbook';
import { StepRefusal, type CellEdit, type StepResult, type WorkbookStep } from './step.types';

export interface CellAccess {
  contentsIn(sheet: Sheet, range: CellRange): Map<number, CellEdit>;
  write(sheet: Sheet, cell: CellEdit): void;
  snapshot(sheet: Sheet, cells: readonly CellEdit[]): CellEdit[];
}

export interface PivotSteps {
  set(sheet: Sheet, name: string, spec: PivotSpec | undefined): StepResult;
  refresh(sheet: Sheet, name: string): StepResult;
  put(
    sheet: Sheet,
    name: string,
    state: PivotState | undefined,
    restored: readonly CellEdit[] | undefined,
    layout: SheetLayout | undefined,
    base: SheetLayout | undefined,
  ): StepResult;
  covers(sheet: Sheet, cells: readonly CellEdit[]): boolean;
  crossed(sheet: Sheet, change: LineChange): boolean;
  move(sheet: Sheet, change: LineChange): WorkbookStep[];
  renameSheet(from: string, to: string): void;
  renameTable(from: string, to: string): void;
  dropSheet(sheet: Sheet): void;
  kept(sheet: Sheet): WorkbookStep[];
}

type Rendered =
  | { readonly ok: true; readonly cells: readonly CellEdit[]; readonly footprint: CellRange }
  | {
      readonly ok: false;
      readonly reason:
        | typeof StepRefusal.InvalidPivot
        | typeof StepRefusal.PivotOverlap
        | typeof StepRefusal.SheetFull;
    };

const GENERAL = 'General';

const EMPTY_CONTENT = { kind: 'empty' } as const;

const NO_AREA: CellRange = { top: 0, left: 0, bottom: 0, right: 0 };

const keyOf = (row: number, col: number): number => row * MAX_COLS + col;

const REMOVED: Rendered = { ok: true, cells: [], footprint: NO_AREA };

const reformatOf = (
  previous: SheetPivot | undefined,
  spec: PivotSpec | undefined,
): string | undefined =>
  previous !== undefined && spec !== undefined && previous.definition !== spec.definition
    ? GENERAL
    : undefined;

const stateOf = (pivot: SheetPivot): PivotState => ({
  anchor: pivot.anchor,
  definition: pivot.definition,
  footprint: pivot.footprint,
});

const validFields = (definition: PivotDefinition, count: number): boolean =>
  [
    ...definition.rows,
    ...definition.columns,
    ...definition.filters.map((filter) => filter.field),
    ...definition.values.map((value) => value.field),
  ].every((field) => field === VALUES_FIELD || (field >= 0 && field < count));

const spanOf = (range: CellRange, axis: LineChange['axis']): readonly [number, number] =>
  axis === LineAxis.Rows ? [range.top, range.bottom] : [range.left, range.right];

const crosses = (range: CellRange, change: LineChange): boolean => {
  const [first, last] = spanOf(range, change.axis);

  if (change.count > 0) {
    return change.at > first && change.at <= last;
  }

  const end = change.at - change.count - 1;
  const touched = change.at <= last && end >= first;

  return touched && !(change.at <= first && end >= last);
};

const movedRange = (range: CellRange, change: LineChange): CellRange | undefined => {
  const [first, last] = spanOf(range, change.axis);
  const top = shiftIndex(first, change);
  const bottom = shiftIndex(last, change);

  if (top === undefined || bottom === undefined) {
    return undefined;
  }
  return change.axis === LineAxis.Rows
    ? { ...range, top, bottom }
    : { ...range, left: top, right: bottom };
};

const movedSource = (source: PivotSource, change: LineChange): PivotSource => {
  if (source.kind !== PivotSourceKind.Range || !sameName(source.sheet, change.sheet)) {
    return source;
  }

  const [range] = shiftRanges([source.range], change);

  return range === undefined ? { kind: 'lost' } : { ...source, range };
};

const movedPivot = (
  pivot: SheetPivot,
  sheet: Sheet,
  change: LineChange,
): SheetPivot | undefined => {
  const source = movedSource(pivot.definition.source, change);

  const definition =
    source === pivot.definition.source ? pivot.definition : { ...pivot.definition, source };

  if (pivot.sheet !== sheet) {
    return definition === pivot.definition ? pivot : { ...pivot, definition };
  }

  const footprint = pivot.footprint === undefined ? undefined : movedRange(pivot.footprint, change);

  const anchor = movedRange(
    {
      top: pivot.anchor.row,
      left: pivot.anchor.col,
      bottom: pivot.anchor.row,
      right: pivot.anchor.col,
    },
    change,
  );

  return anchor === undefined || (pivot.footprint !== undefined && footprint === undefined)
    ? undefined
    : { ...pivot, anchor: { row: anchor.top, col: anchor.left }, footprint, definition };
};

const samePivot = (left: SheetPivot | undefined, right: SheetPivot): boolean =>
  left !== undefined &&
  (left === right || JSON.stringify(stateOf(left)) === JSON.stringify(stateOf(right)));

const putBack = (pivot: SheetPivot): WorkbookStep => ({
  kind: 'putPivot',
  sheet: pivot.sheet.name,
  name: pivot.name,
  pivot: stateOf(pivot),
});

export const createPivotSteps = (book: Workbook, cells: CellAccess): PivotSteps => {
  const overlaps = (sheet: Sheet, name: string, area: CellRange): boolean =>
    book.pivots
      .on(sheet)
      .some(
        (pivot) =>
          pivot.name.toLowerCase() !== name.toLowerCase() &&
          pivot.footprint !== undefined &&
          rangesMeet(pivot.footprint, area),
      ) || book.tables.on(sheet).some((table) => rangesMeet(table.range, area));

  const feeds = (sheet: Sheet, source: PivotSource, area: CellRange): boolean => {
    const from = pivotSourceArea(book, source);

    return from !== undefined && from.sheet === sheet && rangesMeet(from.range, area);
  };

  const holdsData = (sheet: Sheet, name: string, area: CellRange): boolean => {
    const own = book.pivots.get(sheet, name)?.footprint;

    return [...cells.contentsIn(sheet, area).values()].some(
      (cell) =>
        cell.content !== undefined &&
        cell.content.kind !== CellInputKind.Empty &&
        !(own !== undefined && containsCell(own, cell.row, cell.col)),
    );
  };

  const rendered = (
    sheet: Sheet,
    name: string,
    spec: PivotSpec,
    fallback: string | undefined,
  ): Rendered => {
    const table = pivotSource(book, spec.definition.source);
    const cache = table === undefined ? undefined : buildPivotCache(table);

    if (cache === undefined || !validFields(spec.definition, cache.fields.length)) {
      return { ok: false, reason: StepRefusal.InvalidPivot };
    }

    const output = renderPivot(spec.definition, cache, computePivot(spec.definition, cache));

    const footprint: CellRange = {
      top: spec.anchor.row,
      left: spec.anchor.col,
      bottom: spec.anchor.row + Math.max(output.size.row, 1) - 1,
      right: spec.anchor.col + Math.max(output.size.col, 1) - 1,
    };

    if (footprint.bottom >= MAX_ROWS || footprint.right >= MAX_COLS) {
      return { ok: false, reason: StepRefusal.SheetFull };
    }

    const taken =
      overlaps(sheet, name, footprint) ||
      feeds(sheet, spec.definition.source, footprint) ||
      holdsData(sheet, name, footprint);

    if (taken) {
      return { ok: false, reason: StepRefusal.PivotOverlap };
    }
    return {
      ok: true,
      footprint,
      cells: output.cells.map((cell) => ({
        row: spec.anchor.row + cell.row,
        col: spec.anchor.col + cell.col,
        content: { kind: 'value', value: cell.value },
        format: cell.format ?? fallback,
      })),
    };
  };

  const previousCells = (
    sheet: Sheet,
    areas: readonly (CellRange | undefined)[],
    written: readonly CellEdit[],
  ): CellEdit[] => {
    const found = new Map<number, CellEdit>();

    areas.forEach((area) => {
      if (area !== undefined) {
        cells.contentsIn(sheet, area).forEach((cell, key) => {
          found.set(key, cell);
        });
      }
    });

    written.forEach((cell) => {
      const key = keyOf(cell.row, cell.col);

      if (!found.has(key)) {
        found.set(key, { row: cell.row, col: cell.col, content: EMPTY_CONTENT, format: GENERAL });
      }
    });

    return [...found.values()];
  };

  const cleared = (sheet: Sheet, area: CellRange | undefined, format: string | undefined): void => {
    if (area === undefined) {
      return;
    }

    cells.contentsIn(sheet, area).forEach((cell) => {
      cells.write(sheet, { row: cell.row, col: cell.col, content: EMPTY_CONTENT, format });
    });
  };

  const refit = (
    sheet: Sheet,
    spec: PivotSpec | undefined,
    written: readonly CellEdit[],
  ): SheetLayout | undefined => {
    const { layout } = sheet;

    if (spec?.definition.autofit === true) {
      sheet.layout = fittedLayout(book, sheet, written);
    }
    return sheet.layout === layout ? undefined : layout;
  };

  const swap = (
    sheet: Sheet,
    name: string,
    previous: SheetPivot | undefined,
    next: SheetPivot | undefined,
  ): void => {
    if (previous !== undefined) {
      book.pivots.delete(previous);
    }
    if (next !== undefined) {
      book.pivots.set({ ...next, name: previous?.name ?? name, sheet });
    }
  };

  const placed = (sheet: Sheet, name: string, spec: PivotSpec | undefined): StepResult => {
    const previous = book.pivots.get(sheet, name);
    const reformat = reformatOf(previous, spec);
    const output = spec === undefined ? REMOVED : rendered(sheet, name, spec, reformat);

    if (!output.ok) {
      return { ok: false, reason: output.reason };
    }

    const area = spec === undefined ? undefined : output.footprint;
    const restore = previousCells(sheet, [previous?.footprint, area], output.cells);

    cleared(sheet, previous?.footprint, reformat);

    output.cells.forEach((cell) => {
      cells.write(sheet, cell);
    });

    swap(
      sheet,
      name,
      previous,
      spec === undefined ? undefined : { name, sheet, ...spec, footprint: area },
    );

    const layout = refit(sheet, spec, output.cells);

    return {
      ok: true,
      changes: [],
      inverse: {
        kind: 'putPivot',
        sheet: sheet.name,
        name,
        pivot: previous === undefined ? undefined : stateOf(previous),
        cells: restore,
        ...(layout === undefined ? undefined : layoutBack(sheet.layout, layout)),
      },
    };
  };

  const resourced = (rename: (source: PivotSource) => PivotSource): void => {
    book.pivots.forEach((pivot) => {
      const source = rename(pivot.definition.source);

      if (source !== pivot.definition.source) {
        book.pivots.set({ ...pivot, definition: { ...pivot.definition, source } });
      }
    });
  };

  return {
    set: placed,
    refresh: (sheet, name) => {
      const pivot = book.pivots.get(sheet, name);

      return pivot === undefined
        ? { ok: false, reason: StepRefusal.MissingPivot }
        : placed(sheet, name, { anchor: pivot.anchor, definition: pivot.definition });
    },
    put: (sheet, name, state, restored = [], layout, base) => {
      const previous = book.pivots.get(sheet, name);
      const current = cells.snapshot(sheet, restored);
      const shown = sheet.layout;

      if (layout !== undefined) {
        sheet.layout = base === undefined ? layout : patchLayout(base, layout, shown);
      }

      restored.forEach((cell) => {
        cells.write(sheet, cell);
      });

      swap(sheet, name, previous, state === undefined ? undefined : { name, sheet, ...state });
      return {
        ok: true,
        changes: [],
        inverse: {
          kind: 'putPivot',
          sheet: sheet.name,
          name,
          pivot: previous === undefined ? undefined : stateOf(previous),
          cells: current,
          ...(layout === undefined ? undefined : layoutBack(sheet.layout, shown)),
        },
      };
    },
    covers: (sheet, edits) =>
      book.pivots.on(sheet).some((pivot) => {
        const { footprint } = pivot;

        return (
          footprint !== undefined &&
          edits.some(
            (edit) => edit.content !== undefined && containsCell(footprint, edit.row, edit.col),
          )
        );
      }),
    crossed: (sheet, change) =>
      book.pivots
        .on(sheet)
        .some((pivot) => pivot.footprint !== undefined && crosses(pivot.footprint, change)),
    move: (sheet, change) => {
      const back: LineChange = { ...change, count: -change.count };
      const pivots: SheetPivot[] = [];

      book.pivots.forEach((pivot) => {
        pivots.push(pivot);
      });

      return pivots.reduce<WorkbookStep[]>((lost, pivot) => {
        const moved = movedPivot(pivot, sheet, change);

        if (moved !== pivot) {
          book.pivots.delete(pivot);
        }
        if (moved !== undefined && moved !== pivot) {
          book.pivots.set(moved);
        }
        if (!samePivot(moved === undefined ? undefined : movedPivot(moved, sheet, back), pivot)) {
          lost.push(putBack(pivot));
        }
        return lost;
      }, []);
    },
    renameSheet: (from, to) => {
      resourced((source) =>
        source.kind === PivotSourceKind.Range && sameName(source.sheet, from)
          ? { ...source, sheet: to }
          : source,
      );
    },
    renameTable: (from, to) => {
      resourced((source) =>
        source.kind === PivotSourceKind.Table && sameName(source.name, from)
          ? { ...source, name: to }
          : source,
      );
    },
    dropSheet: (sheet) => {
      book.pivots.on(sheet).forEach((pivot) => {
        book.pivots.delete(pivot);
      });
    },
    kept: (sheet) => book.pivots.on(sheet).map(putBack),
  };
};

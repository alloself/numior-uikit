import { MAX_COLS, MAX_ROWS } from '../address';
import type { CellRange } from '../cell.types';
import { sameName, type LineChange } from '../formula/rewrite';
import { shiftIndex } from '../lines';
import { shiftRanges } from '../layout/shift-ranges';
import { buildPivotCache, pivotSource } from '../pivot/pivot-cache';
import { VALUES_FIELD, computePivot } from '../pivot/pivot-engine';
import { renderPivot } from '../pivot/pivot-render';
import type { PivotDefinition, PivotSource, PivotSpec, PivotState } from '../pivot/pivot.types';
import { rangesMeet } from '../tables';
import type { Sheet, SheetPivot, Workbook } from '../workbook';
import type { CellEdit, StepResult, WorkbookStep } from './step.types';

export interface CellAccess {
  contentsIn(sheet: Sheet, range: CellRange): Map<number, CellEdit>;
  write(sheet: Sheet, cell: CellEdit): void;
}

export interface PivotSteps {
  set(sheet: Sheet, name: string, spec: PivotSpec | undefined): StepResult;
  refresh(sheet: Sheet, name: string): StepResult;
  put(sheet: Sheet, name: string, state: PivotState | undefined): StepResult;
  crossed(sheet: Sheet, change: LineChange): boolean;
  move(sheet: Sheet, change: LineChange): void;
  rename(from: string, to: string): void;
  dropSheet(sheet: Sheet): void;
  snapshot(): WorkbookStep[];
}

type Rendered =
  | { readonly ok: true; readonly cells: readonly CellEdit[]; readonly footprint: CellRange }
  | { readonly ok: false; readonly reason: 'invalid-pivot' | 'pivot-overlap' | 'sheet-full' };

const GENERAL = 'General';

const EMPTY_CONTENT = { kind: 'empty' } as const;

const NO_AREA: CellRange = { top: 0, left: 0, bottom: 0, right: 0 };

const keyOf = (row: number, col: number): number => row * MAX_COLS + col;

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
  axis === 'rows' ? [range.top, range.bottom] : [range.left, range.right];

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
  return change.axis === 'rows'
    ? { ...range, top, bottom }
    : { ...range, left: top, right: bottom };
};

const movedSource = (source: PivotSource, change: LineChange): PivotSource => {
  if (source.kind !== 'range' || !sameName(source.sheet, change.sheet)) {
    return source;
  }

  const [range] = shiftRanges([source.range], change);

  return range === undefined ? { kind: 'lost' } : { ...source, range };
};

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

  const rendered = (sheet: Sheet, name: string, spec: PivotSpec): Rendered => {
    const table = pivotSource(book, spec.definition.source);
    const cache = table === undefined ? undefined : buildPivotCache(table);

    if (cache === undefined || !validFields(spec.definition, cache.fields.length)) {
      return { ok: false, reason: 'invalid-pivot' };
    }

    const output = renderPivot(spec.definition, cache, computePivot(spec.definition, cache));

    const footprint: CellRange = {
      top: spec.anchor.row,
      left: spec.anchor.col,
      bottom: spec.anchor.row + Math.max(output.size.row, 1) - 1,
      right: spec.anchor.col + Math.max(output.size.col, 1) - 1,
    };

    if (footprint.bottom >= MAX_ROWS || footprint.right >= MAX_COLS) {
      return { ok: false, reason: 'sheet-full' };
    }
    if (overlaps(sheet, name, footprint)) {
      return { ok: false, reason: 'pivot-overlap' };
    }
    return {
      ok: true,
      footprint,
      cells: output.cells.map((cell) => ({
        row: spec.anchor.row + cell.row,
        col: spec.anchor.col + cell.col,
        content: { kind: 'value', value: cell.value },
        format: cell.format ?? GENERAL,
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

  const cleared = (sheet: Sheet, area: CellRange | undefined): void => {
    if (area === undefined) {
      return;
    }

    cells.contentsIn(sheet, area).forEach((cell) => {
      cells.write(sheet, { row: cell.row, col: cell.col, content: EMPTY_CONTENT, format: GENERAL });
    });
  };

  const placed = (sheet: Sheet, name: string, spec: PivotSpec | undefined): StepResult => {
    const previous = book.pivots.get(sheet, name);

    const output: Rendered =
      spec === undefined
        ? { ok: true, cells: [], footprint: NO_AREA }
        : rendered(sheet, name, spec);

    if (!output.ok) {
      return { ok: false, reason: output.reason };
    }

    const area = spec === undefined ? undefined : output.footprint;
    const restore = previousCells(sheet, [previous?.footprint, area], output.cells);

    cleared(sheet, previous?.footprint);

    output.cells.forEach((cell) => {
      cells.write(sheet, cell);
    });

    if (previous !== undefined) {
      book.pivots.delete(previous);
    }
    if (spec !== undefined) {
      book.pivots.set({ name: previous?.name ?? name, sheet, ...spec, footprint: area });
    }

    return {
      ok: true,
      changes: [],
      inverse: {
        kind: 'batch',
        steps: [
          {
            kind: 'putPivot',
            sheet: sheet.name,
            name,
            pivot: previous === undefined ? undefined : stateOf(previous),
          },
          { kind: 'setCells', sheet: sheet.name, cells: restore },
        ],
      },
    };
  };

  return {
    set: placed,
    refresh: (sheet, name) => {
      const pivot = book.pivots.get(sheet, name);

      return pivot === undefined
        ? { ok: false, reason: 'missing-pivot' }
        : placed(sheet, name, { anchor: pivot.anchor, definition: pivot.definition });
    },
    put: (sheet, name, state) => {
      const previous = book.pivots.get(sheet, name);

      if (previous !== undefined) {
        book.pivots.delete(previous);
      }
      if (state !== undefined) {
        book.pivots.set({ name: previous?.name ?? name, sheet, ...state });
      }
      return {
        ok: true,
        changes: [],
        inverse: {
          kind: 'putPivot',
          sheet: sheet.name,
          name,
          pivot: previous === undefined ? undefined : stateOf(previous),
        },
      };
    },
    crossed: (sheet, change) =>
      book.pivots
        .on(sheet)
        .some((pivot) => pivot.footprint !== undefined && crosses(pivot.footprint, change)),
    move: (sheet, change) => {
      const pivots: SheetPivot[] = [];

      book.pivots.forEach((pivot) => {
        pivots.push(pivot);
      });

      pivots.forEach((pivot) => {
        const source = movedSource(pivot.definition.source, change);
        const own = pivot.sheet === sheet;

        const footprint =
          own && pivot.footprint !== undefined
            ? movedRange(pivot.footprint, change)
            : pivot.footprint;

        const anchor = own
          ? movedRange(
              {
                top: pivot.anchor.row,
                left: pivot.anchor.col,
                bottom: pivot.anchor.row,
                right: pivot.anchor.col,
              },
              change,
            )
          : undefined;

        book.pivots.delete(pivot);
        if (own && (footprint === undefined || anchor === undefined)) {
          return;
        }

        book.pivots.set({
          ...pivot,
          anchor: anchor === undefined ? pivot.anchor : { row: anchor.top, col: anchor.left },
          footprint,
          definition:
            source === pivot.definition.source ? pivot.definition : { ...pivot.definition, source },
        });
      });
    },
    rename: (from, to) => {
      book.pivots.forEach((pivot) => {
        const { source } = pivot.definition;

        if (source.kind === 'range' && sameName(source.sheet, from)) {
          book.pivots.set({
            ...pivot,
            definition: { ...pivot.definition, source: { ...source, sheet: to } },
          });
        }
      });
    },
    dropSheet: (sheet) => {
      book.pivots.on(sheet).forEach((pivot) => {
        book.pivots.delete(pivot);
      });
    },
    snapshot: () => {
      const steps: WorkbookStep[] = [];

      book.pivots.forEach((pivot) => {
        steps.push({
          kind: 'putPivot',
          sheet: pivot.sheet.name,
          name: pivot.name,
          pivot: stateOf(pivot),
        });
      });

      return steps;
    },
  };
};

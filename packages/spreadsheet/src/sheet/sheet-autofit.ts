import type { NuiTableSourceCell, NuiTableSpan } from '@numior/table';
import { CellValueKind, type CellRange, type Sheet } from '../core';
import { charsToPixels } from './sheet-cells';
import type { CellMeasure, SheetCells } from './sheet.types';

export interface AutofitOptions {
  readonly sheet: Sheet;
  readonly cells: SheetCells;
  readonly shown: NuiTableSpan | undefined;
  readonly measure: CellMeasure;
}

export interface Autofit {
  readonly widths: ReadonlyMap<number, number | undefined>;
  readonly fitted: number;
  readonly partial: boolean;
}

interface Budget {
  left: number;
}

interface ColumnFit {
  widest: number | undefined;
  taken: number;
  skipped: boolean;
}

interface FitScope {
  readonly options: AutofitOptions;
  readonly used: CellRange;
  readonly near: CellRange | undefined;
  readonly anchors: ReadonlyMap<number, ReadonlySet<number>>;
  readonly quota: number;
  readonly budget: Budget;
}

export const AUTOFIT_CELLS = 10_000;

const WIDEST_CHARS = 255;

const NO_ROWS: ReadonlySet<number> = new Set();

const wideAnchors = (sheet: Sheet): Map<number, Set<number>> =>
  sheet.layout.merges.reduce((anchors, merge) => {
    if (merge.right === merge.left) {
      return anchors;
    }

    const rows = anchors.get(merge.left) ?? new Set<number>();

    rows.add(merge.top);
    anchors.set(merge.left, rows);
    return anchors;
  }, new Map<number, Set<number>>());

const shownRows = ({ cells, shown }: AutofitOptions): CellRange | undefined =>
  shown === undefined
    ? undefined
    : { top: cells.rowAt(shown.start), left: 0, bottom: cells.rowAt(shown.end), right: 0 };

const linesOf = (look: NuiTableSourceCell): readonly string[] =>
  look.style?.wrap === true ? look.text.split('\n') : [look.text];

const widthOf = (measure: CellMeasure, look: NuiTableSourceCell): number | undefined =>
  linesOf(look).reduce<number | undefined>((widest, line) => {
    const width = line === '' ? undefined : measure(line, look.style);

    return width === undefined ? widest : Math.max(widest ?? 0, width);
  }, undefined);

const widestIn = (scope: FitScope, col: number): ColumnFit => {
  const { sheet, cells, measure } = scope.options;
  const merged = scope.anchors.get(col) ?? NO_ROWS;
  const fit: ColumnFit = { widest: undefined, taken: 0, skipped: false };
  const range = { top: scope.used.top, left: col, bottom: scope.used.bottom, right: col };

  sheet.cells.forEachInRange(range, (row, _, value) => {
    const near = scope.near !== undefined && row >= scope.near.top && row <= scope.near.bottom;
    const spent = scope.budget.left <= 0 || (fit.taken >= scope.quota && !near);

    if (value.kind === CellValueKind.Empty || merged.has(row)) {
      return;
    }
    if (spent) {
      fit.skipped = true;
      return;
    }
    if (sheet.layout.rows.get(row)?.hidden === true) {
      return;
    }

    fit.taken += 1;
    scope.budget.left -= 1;

    const look = cells.lookAt(row, col);
    const width = look === undefined ? undefined : widthOf(measure, look);

    if (width === undefined || width <= (fit.widest ?? 0)) {
      return;
    }

    fit.widest = width;
  });

  return fit;
};

const insideOf = (used: CellRange, cols: readonly number[]): number =>
  cols.reduce((count, col) => count + Number(col >= used.left && col <= used.right), 0);

export const autofitColumns = (options: AutofitOptions, cols: readonly number[]): Autofit => {
  const used = options.sheet.cells.usedRange();
  const widths = new Map<number, number | undefined>();
  const widest = charsToPixels(WIDEST_CHARS);
  let partial = false;
  let fitted = 0;

  if (used === undefined) {
    return { widths: new Map(cols.map((col) => [col, undefined])), fitted, partial };
  }

  const scope: FitScope = {
    options,
    used,
    near: shownRows(options),
    anchors: wideAnchors(options.sheet),
    quota: Math.max(1, Math.floor(AUTOFIT_CELLS / Math.max(1, insideOf(used, cols)))),
    budget: { left: 2 * AUTOFIT_CELLS },
  };

  for (const col of cols) {
    if (col < used.left || col > used.right) {
      widths.set(col, undefined);
      continue;
    }
    if (scope.budget.left <= 0) {
      partial = true;
      continue;
    }

    const fit = widestIn(scope, col);

    partial ||= fit.skipped;
    fitted += Number(fit.widest !== undefined);
    widths.set(col, fit.widest === undefined ? undefined : Math.min(fit.widest, widest));
  }

  return { widths, fitted, partial };
};

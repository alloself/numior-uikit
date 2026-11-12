import { CellInputKind, LineAxis, TableShiftKind, type CellRange } from '../cell.types';
import {
  mapConditionalFormulas,
  shiftConditional,
  shiftConditionalReferences,
} from '../conditional/shift';
import type { ConditionalFormat } from '../conditional/conditional.types';
import type { FormulaNode } from '../formula/formula.types';
import {
  dropSheetFromFormula,
  renameInFormula,
  renameTableInFormula,
  sameName,
  shiftFormula,
  shiftSpan,
} from '../formula/rewrite';
import { shiftIndex } from '../lines';
import { mapLayoutFormulas, shiftLayout } from '../layout/line-layouts';
import type { SheetLayout } from '../layout/layout.types';
import { shiftRanges } from '../layout/shift-ranges';
import { PivotSourceKind, type PivotSource, type PivotSpec } from '../pivot/pivot.types';
import {
  StepKind,
  type CellEdit,
  type SheetStep,
  type TableSpec,
  type WorkbookStep,
} from '../steps/step.types';
import { shiftTable } from '../tables';
import { RemoteChangeKind, type RemoteChange } from './collab.types';

type StepOf<K extends WorkbookStep['kind']> = Extract<WorkbookStep, { readonly kind: K }>;

const TABLE_COLUMN_PREFIX = 'Column';

const LOST_SOURCE: PivotSource = { kind: PivotSourceKind.Lost };

const homeOver = (home: string, change: RemoteChange): string | undefined => {
  if (change.kind === RemoteChangeKind.RenameSheet && sameName(home, change.from)) {
    return change.to;
  }
  return change.kind === RemoteChangeKind.RemoveSheet && sameName(home, change.name)
    ? undefined
    : home;
};

const formulaOver = (
  ast: FormulaNode,
  change: RemoteChange,
  home: string,
  origin: { readonly row: number; readonly col: number },
): FormulaNode => {
  switch (change.kind) {
    case RemoteChangeKind.Lines:
      return shiftFormula(ast, change.change, sameName(home, change.change.sheet), origin);
    case RemoteChangeKind.RenameSheet:
      return renameInFormula(ast, change.from, change.to);
    case RemoteChangeKind.RemoveSheet:
      return dropSheetFromFormula(ast, change.name);
    case RemoteChangeKind.RenameTable:
      return renameTableInFormula(ast, change.from, change.to);
  }
};

const positionOver = (
  cell: { readonly row: number; readonly col: number },
  change: RemoteChange,
  home: string,
): { readonly row: number; readonly col: number } | undefined => {
  if (change.kind !== RemoteChangeKind.Lines || !sameName(home, change.change.sheet)) {
    return cell;
  }

  const rows = change.change.axis === LineAxis.Rows;
  const line = shiftIndex(rows ? cell.row : cell.col, change.change);

  if (line === undefined) {
    return undefined;
  }
  return rows ? { row: line, col: cell.col } : { row: cell.row, col: line };
};

const cellOver = (edit: CellEdit, change: RemoteChange, home: string): CellEdit | undefined => {
  const position = positionOver(edit, change, home);

  if (position === undefined) {
    return undefined;
  }
  return edit.content?.kind === CellInputKind.Formula
    ? {
        ...edit,
        ...position,
        content: { ...edit.content, ast: formulaOver(edit.content.ast, change, home, edit) },
      }
    : { ...edit, ...position };
};

const cellsOver = (
  cells: readonly CellEdit[],
  change: RemoteChange,
  home: string,
): readonly CellEdit[] =>
  cells.reduce<CellEdit[]>((kept, edit) => {
    const moved = cellOver(edit, change, home);

    if (moved !== undefined) {
      kept.push(moved);
    }
    return kept;
  }, []);

const rangeOver = (range: CellRange, change: RemoteChange, home: string): CellRange | undefined =>
  change.kind === RemoteChangeKind.Lines && sameName(home, change.change.sheet)
    ? shiftRanges([range], change.change)[0]
    : range;

const layoutOver = (layout: SheetLayout, change: RemoteChange, home: string): SheetLayout => {
  switch (change.kind) {
    case RemoteChangeKind.Lines:
      return shiftLayout(layout, change.change, sameName(home, change.change.sheet));
    case RemoteChangeKind.RenameSheet:
      return mapLayoutFormulas(layout, (ast) => renameInFormula(ast, change.from, change.to));
    case RemoteChangeKind.RemoveSheet:
      return mapLayoutFormulas(layout, (ast) => dropSheetFromFormula(ast, change.name));
    case RemoteChangeKind.RenameTable:
      return mapLayoutFormulas(layout, (ast) => renameTableInFormula(ast, change.from, change.to));
  }
};

const formatsOver = (
  formats: readonly ConditionalFormat[],
  change: RemoteChange,
  home: string,
): readonly ConditionalFormat[] => {
  switch (change.kind) {
    case RemoteChangeKind.Lines:
      return sameName(home, change.change.sheet)
        ? shiftConditional(formats, change.change)
        : shiftConditionalReferences(formats, change.change);
    case RemoteChangeKind.RenameSheet:
      return mapConditionalFormulas(formats, (ast) => renameInFormula(ast, change.from, change.to));
    case RemoteChangeKind.RemoveSheet:
      return mapConditionalFormulas(formats, (ast) => dropSheetFromFormula(ast, change.name));
    case RemoteChangeKind.RenameTable:
      return mapConditionalFormulas(formats, (ast) =>
        renameTableInFormula(ast, change.from, change.to),
      );
  }
};

const tableOver = (table: TableSpec, change: RemoteChange): TableSpec | undefined => {
  const sheet = homeOver(table.sheet, change);

  if (sheet === undefined) {
    return undefined;
  }
  if (change.kind !== RemoteChangeKind.Lines || !sameName(table.sheet, change.change.sheet)) {
    return { ...table, sheet };
  }

  const shift = shiftTable(table, change.change, TABLE_COLUMN_PREFIX);

  switch (shift.kind) {
    case TableShiftKind.Removed:
      return undefined;
    case TableShiftKind.Moved:
      return { ...shift.shape, sheet };
    case TableShiftKind.Same:
      return table;
  }
};

const sourceOver = (source: PivotSource, change: RemoteChange): PivotSource => {
  if (source.kind === PivotSourceKind.Table) {
    return change.kind === RemoteChangeKind.RenameTable && source.name === change.from
      ? { ...source, name: change.to }
      : source;
  }
  if (source.kind !== PivotSourceKind.Range) {
    return source;
  }

  const sheet = homeOver(source.sheet, change);

  if (sheet === undefined) {
    return LOST_SOURCE;
  }

  const range = rangeOver(source.range, change, source.sheet);

  return range === undefined ? LOST_SOURCE : { ...source, sheet, range };
};

const pivotOver = <P extends PivotSpec>(
  pivot: P,
  change: RemoteChange,
  home: string,
): P | undefined => {
  const anchor = positionOver(pivot.anchor, change, home);

  return anchor === undefined
    ? undefined
    : {
        ...pivot,
        anchor,
        definition: { ...pivot.definition, source: sourceOver(pivot.definition.source, change) },
      };
};

const linesStepOver = (
  step: StepOf<typeof StepKind.InsertLines | typeof StepKind.DeleteLines>,
  change: RemoteChange,
  sheet: string,
): WorkbookStep | undefined => {
  if (
    change.kind !== RemoteChangeKind.Lines ||
    !sameName(step.sheet, change.change.sheet) ||
    step.axis !== change.change.axis
  ) {
    return { ...step, sheet };
  }
  if (step.kind === StepKind.InsertLines) {
    return { ...step, sheet, at: shiftIndex(step.at, change.change) ?? change.change.at };
  }

  const span = shiftSpan([step.at, step.at + step.count - 1], change.change);

  return span === undefined
    ? undefined
    : { ...step, sheet, at: span[0], count: span[1] - span[0] + 1 };
};

const putPivotOver = (
  step: StepOf<typeof StepKind.PutPivot>,
  change: RemoteChange,
  sheet: string,
): WorkbookStep => {
  const pivot = step.pivot === undefined ? undefined : pivotOver(step.pivot, change, step.sheet);

  return {
    ...step,
    sheet,
    pivot:
      pivot === undefined
        ? undefined
        : {
            ...pivot,
            footprint:
              pivot.footprint === undefined
                ? undefined
                : rangeOver(pivot.footprint, change, step.sheet),
          },
    cells: step.cells === undefined ? undefined : cellsOver(step.cells, change, step.sheet),
    layout: step.layout === undefined ? undefined : layoutOver(step.layout, change, step.sheet),
    base: step.base === undefined ? undefined : layoutOver(step.base, change, step.sheet),
  };
};

const sheetStepOver = (step: SheetStep, change: RemoteChange): WorkbookStep | undefined => {
  const sheet = homeOver(step.sheet, change);

  if (sheet === undefined) {
    return undefined;
  }
  switch (step.kind) {
    case StepKind.SetCells: {
      const cells = cellsOver(step.cells, change, step.sheet);

      return cells.length === 0 ? undefined : { ...step, sheet, cells };
    }
    case StepKind.SetFormat: {
      const range = rangeOver(step.range, change, step.sheet);

      return range === undefined ? undefined : { ...step, sheet, range };
    }
    case StepKind.InsertLines:
    case StepKind.DeleteLines:
      return linesStepOver(step, change, sheet);
    case StepKind.SetConditional:
      return {
        ...step,
        sheet,
        formats: formatsOver(step.formats, change, step.sheet),
        base: step.base === undefined ? undefined : formatsOver(step.base, change, step.sheet),
      };
    case StepKind.SetLayout:
      return {
        ...step,
        sheet,
        layout: layoutOver(step.layout, change, step.sheet),
        base: step.base === undefined ? undefined : layoutOver(step.base, change, step.sheet),
      };
    case StepKind.SetPivot: {
      if (step.pivot === undefined) {
        return { ...step, sheet };
      }

      const pivot = pivotOver(step.pivot, change, step.sheet);

      return pivot === undefined ? undefined : { ...step, sheet, pivot };
    }
    case StepKind.RefreshPivot:
      return { ...step, sheet };
    case StepKind.PutPivot:
      return putPivotOver(step, change, sheet);
  }
};

const nameOver = (name: string, change: RemoteChange): string =>
  change.kind === RemoteChangeKind.RenameSheet && sameName(name, change.from) ? change.to : name;

const tableNameOver = (name: string, change: RemoteChange): string =>
  change.kind === RemoteChangeKind.RenameTable && sameName(name, change.from) ? change.to : name;

const setNameOver = (
  step: StepOf<typeof StepKind.SetName>,
  change: RemoteChange,
): WorkbookStep | undefined => {
  const scope = step.scope === undefined ? undefined : homeOver(step.scope, change);

  if (step.scope !== undefined && scope === undefined) {
    return undefined;
  }
  return {
    ...step,
    scope,
    ast:
      step.ast === undefined
        ? undefined
        : formulaOver(step.ast, change, step.scope ?? '', { row: 0, col: 0 }),
  };
};

const batchOver = (
  step: StepOf<typeof StepKind.Batch>,
  change: RemoteChange,
): WorkbookStep | undefined => {
  const steps = step.steps.reduce<WorkbookStep[]>((kept, part) => {
    const moved = rebaseStep(part, change);

    if (moved !== undefined) {
      kept.push(moved);
    }
    return kept;
  }, []);

  return steps.length === 0 ? undefined : { ...step, steps };
};

export const rebaseStep = (step: WorkbookStep, change: RemoteChange): WorkbookStep | undefined => {
  switch (step.kind) {
    case StepKind.AddSheet:
      return step;
    case StepKind.RemoveSheet:
      return homeOver(step.name, change) === undefined
        ? undefined
        : { ...step, name: nameOver(step.name, change) };
    case StepKind.RenameSheet:
      return homeOver(step.from, change) === undefined
        ? undefined
        : { ...step, from: nameOver(step.from, change) };
    case StepKind.SetName:
      return setNameOver(step, change);
    case StepKind.AddTable: {
      const table = tableOver(step.table, change);

      return table === undefined ? undefined : { ...step, table };
    }
    case StepKind.SetTable: {
      const table = step.table === undefined ? undefined : tableOver(step.table, change);

      return step.table !== undefined && table === undefined
        ? undefined
        : { ...step, name: tableNameOver(step.name, change), table };
    }
    case StepKind.RenameTable:
      return { ...step, from: tableNameOver(step.from, change) };
    case StepKind.Batch:
      return batchOver(step, change);
    default:
      return sheetStepOver(step, change);
  }
};

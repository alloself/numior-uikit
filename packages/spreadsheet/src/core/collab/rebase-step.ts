import { CellInputKind, LineAxis, TableShiftKind, type CellRange } from '../cell.types';
import {
  mapConditionalFormulas,
  shiftConditional,
  shiftConditionalReferences,
} from '../conditional/shift';
import type { ConditionalFormat } from '../conditional/conditional.types';
import type { FormulaNode } from '../formula/formula.types';
import { renameTableInFormula, sameName, shiftFormula, shiftSpan } from '../formula/rewrite';
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

const formulaOver = (
  ast: FormulaNode,
  change: RemoteChange,
  home: string,
  origin: { readonly row: number; readonly col: number },
): FormulaNode => {
  switch (change.kind) {
    case RemoteChangeKind.Lines:
      return shiftFormula(ast, change.change, sameName(home, change.change.sheet), origin);
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
    case RemoteChangeKind.RenameTable:
      return mapConditionalFormulas(formats, (ast) =>
        renameTableInFormula(ast, change.from, change.to),
      );
  }
};

const tableOver = (table: TableSpec, change: RemoteChange): TableSpec | undefined => {
  if (change.kind !== RemoteChangeKind.Lines || !sameName(table.sheet, change.change.sheet)) {
    return table;
  }

  const shift = shiftTable(table, change.change, TABLE_COLUMN_PREFIX);

  switch (shift.kind) {
    case TableShiftKind.Removed:
      return undefined;
    case TableShiftKind.Moved:
      return { ...shift.shape, sheet: table.sheet };
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

  const range = rangeOver(source.range, change, source.sheet);

  return range === undefined ? LOST_SOURCE : { ...source, range };
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
): WorkbookStep | undefined => {
  if (
    change.kind !== RemoteChangeKind.Lines ||
    !sameName(step.sheet, change.change.sheet) ||
    step.axis !== change.change.axis
  ) {
    return step;
  }
  if (step.kind === StepKind.InsertLines) {
    return { ...step, at: shiftIndex(step.at, change.change) ?? change.change.at };
  }

  const span = shiftSpan([step.at, step.at + step.count - 1], change.change);

  return span === undefined ? undefined : { ...step, at: span[0], count: span[1] - span[0] + 1 };
};

const putPivotOver = (
  step: StepOf<typeof StepKind.PutPivot>,
  change: RemoteChange,
): WorkbookStep => {
  const pivot = step.pivot === undefined ? undefined : pivotOver(step.pivot, change, step.sheet);

  return {
    ...step,
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

const conditionalStepOver = (
  step: StepOf<typeof StepKind.SetConditional>,
  change: RemoteChange,
): WorkbookStep => ({
  ...step,
  formats: formatsOver(step.formats, change, step.sheet),
  base: step.base === undefined ? undefined : formatsOver(step.base, change, step.sheet),
});

const layoutStepOver = (
  step: StepOf<typeof StepKind.SetLayout>,
  change: RemoteChange,
): WorkbookStep => ({
  ...step,
  layout: layoutOver(step.layout, change, step.sheet),
  base: step.base === undefined ? undefined : layoutOver(step.base, change, step.sheet),
});

const setPivotOver = (
  step: StepOf<typeof StepKind.SetPivot>,
  change: RemoteChange,
): WorkbookStep | undefined => {
  if (step.pivot === undefined) {
    return step;
  }

  const pivot = pivotOver(step.pivot, change, step.sheet);

  return pivot === undefined ? undefined : { ...step, pivot };
};

const sheetStepOver = (step: SheetStep, change: RemoteChange): WorkbookStep | undefined => {
  switch (step.kind) {
    case StepKind.SetCells: {
      const cells = cellsOver(step.cells, change, step.sheet);

      return cells.length === 0 ? undefined : { ...step, cells };
    }
    case StepKind.SetFormat: {
      const range = rangeOver(step.range, change, step.sheet);

      return range === undefined ? undefined : { ...step, range };
    }
    case StepKind.InsertLines:
    case StepKind.DeleteLines:
      return linesStepOver(step, change);
    case StepKind.SetConditional:
      return conditionalStepOver(step, change);
    case StepKind.SetLayout:
      return layoutStepOver(step, change);
    case StepKind.SetPivot:
      return setPivotOver(step, change);
    case StepKind.RefreshPivot:
      return step;
    case StepKind.PutPivot:
      return putPivotOver(step, change);
  }
};

const tableNameOver = (name: string, change: RemoteChange): string =>
  change.kind === RemoteChangeKind.RenameTable && sameName(name, change.from) ? change.to : name;

const setNameOver = (step: StepOf<typeof StepKind.SetName>, change: RemoteChange): WorkbookStep =>
  step.ast === undefined
    ? step
    : { ...step, ast: formulaOver(step.ast, change, step.scope ?? '', { row: 0, col: 0 }) };

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
    case StepKind.RemoveSheet:
    case StepKind.RenameSheet:
      return step;
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

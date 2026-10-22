import { MAX_COLS, MAX_ROWS } from '../address';
import type { Calculator } from '../calc/calculator';
import type { CellContent, ShiftedName } from '../calc/calc.types';
import type { FormulaNode } from '../formula/formula.types';
import { dropNameFromFormula, renameNameInFormula, type LineChange } from '../formula/rewrite';
import {
  columnNameAt,
  dataRows,
  rangesMeet,
  shiftTable,
  validColumns,
  type TableShape,
} from '../tables';
import { textValue } from '../values';
import { validDefinedName, type Sheet, type SheetTable, type Workbook } from '../workbook';
import type { Rewrite, Rewriter } from './rewrites';
import type { CellEdit, StepRefusal, StepResult, TableSpec, WorkbookStep } from './step.types';

export interface TableMoves {
  readonly removed: readonly SheetTable[];
  readonly moved: readonly { readonly table: SheetTable; readonly shape: TableShape }[];
}

export interface TableDrops {
  readonly rewrites: readonly Rewrite[];
  readonly names: readonly ShiftedName[];
}

export interface TableSteps {
  add(name: string, spec: TableSpec): StepResult;
  set(name: string, spec: TableSpec | undefined): StepResult;
  rename(from: string, to: string): StepResult;
  syncHeaders(sheet: Sheet, cells: readonly CellEdit[]): void;
  plan(sheet: Sheet, change: LineChange): TableMoves;
  drop(tables: readonly SheetTable[]): TableDrops;
  move(sheet: Sheet, moves: TableMoves, change: LineChange): void;
  restores(moves: TableMoves): WorkbookStep[];
  strip(tables: readonly SheetTable[], ast: FormulaNode): FormulaNode;
}

const NO_DROPS: TableDrops = { rewrites: [], names: [] };

export const specOf = (table: SheetTable): TableSpec => ({
  sheet: table.sheet.name,
  range: table.range,
  columns: table.columns,
  headers: table.headers,
  totals: table.totals,
});

const restoreOf = (table: SheetTable): WorkbookStep => ({
  kind: 'setTable',
  name: table.name,
  table: specOf(table),
});

const headerText = (content: CellContent): string => {
  if (content.kind !== 'value') {
    return '';
  }

  const { value } = content;

  switch (value.kind) {
    case 'string':
      return value.value;
    case 'number':
      return String(value.value);
    case 'boolean':
      return value.value ? 'TRUE' : 'FALSE';
    case 'error':
      return value.code;
    default:
      return '';
  }
};

const insideSheet = (spec: TableShape): boolean =>
  spec.range.top >= 0 &&
  spec.range.left >= 0 &&
  spec.range.bottom < MAX_ROWS &&
  spec.range.right < MAX_COLS &&
  spec.range.top <= spec.range.bottom &&
  spec.range.left <= spec.range.right;

const renamedColumns = (
  table: SheetTable,
  cells: readonly CellEdit[],
  prefix: string,
): string[] | undefined =>
  cells.reduce<string[] | undefined>((columns, cell) => {
    const index = cell.col - table.range.left;

    if (
      cell.content === undefined ||
      cell.row !== table.range.top ||
      index < 0 ||
      index >= table.columns.length
    ) {
      return columns;
    }

    const next = (columns ?? table.columns).slice();

    next[index] = columnNameAt(next, index, headerText(cell.content), prefix);
    return next;
  }, undefined);

const strip = (tables: readonly SheetTable[], ast: FormulaNode): FormulaNode =>
  tables.reduce((current, table) => dropNameFromFormula(current, table.name), ast);

const restores = (moves: TableMoves): WorkbookStep[] => [
  ...moves.removed.map(restoreOf),
  ...moves.moved.map(({ table }) => restoreOf(table)),
];

export const createTableSteps = (
  book: Workbook,
  calculator: Calculator,
  rewriter: Rewriter,
): TableSteps => {
  const prefix = (): string => calculator.locale.formulas.defaultColumn;

  const writeHeader = (sheet: Sheet, row: number, col: number, name: string): void => {
    calculator.setContent(sheet, row, col, { kind: 'value', value: textValue(name) });
  };

  const refusal = (name: string, sheet: Sheet, spec: TableShape): StepRefusal | undefined => {
    if (!validDefinedName(name)) {
      return 'invalid-name';
    }
    if (book.names.taken(name)) {
      return 'name-taken';
    }
    if (!insideSheet(spec) || !validColumns(spec) || dataRows(spec) < 1) {
      return 'invalid-table';
    }

    const wanted = name.toLowerCase();

    return book.tables
      .on(sheet)
      .some((other) => other.name.toLowerCase() !== wanted && rangesMeet(other.range, spec.range))
      ? 'table-overlap'
      : undefined;
  };

  const set = (name: string, spec: TableSpec | undefined): StepResult => {
    const previous = book.tables.get(name);

    const inverse: WorkbookStep = {
      kind: 'setTable',
      name: previous?.name ?? name,
      table: previous === undefined ? undefined : specOf(previous),
    };

    if (spec === undefined) {
      calculator.setTable(name, undefined);
      return { ok: true, inverse, changes: [] };
    }

    const sheet = book.sheet(spec.sheet);

    if (sheet === undefined) {
      return { ok: false, reason: 'missing-sheet' };
    }

    const reason = refusal(name, sheet, spec);

    if (reason !== undefined) {
      return { ok: false, reason };
    }

    calculator.setTable(name, {
      name,
      sheet,
      range: spec.range,
      columns: spec.columns,
      headers: spec.headers,
      totals: spec.totals,
    });

    return { ok: true, inverse, changes: [] };
  };

  const add = (name: string, spec: TableSpec): StepResult =>
    book.tables.get(name) === undefined ? set(name, spec) : { ok: false, reason: 'name-taken' };

  const rename = (from: string, to: string): StepResult => {
    const table = book.tables.get(from);

    if (table === undefined) {
      return { ok: false, reason: 'missing-table' };
    }
    if (!validDefinedName(to)) {
      return { ok: false, reason: 'invalid-name' };
    }

    const other = book.tables.get(to);

    if (book.names.taken(to) || (other !== undefined && other !== table)) {
      return { ok: false, reason: 'name-taken' };
    }
    calculator.setTable(table.name, undefined);
    calculator.setTable(to, { ...table, name: to });
    rewriter.formulas((_sheet, ast) => renameNameInFormula(ast, table.name, to));
    rewriter.names((defined) => renameNameInFormula(defined.ast, table.name, to));
    return { ok: true, inverse: { kind: 'renameTable', from: to, to: table.name }, changes: [] };
  };

  const syncHeaders = (sheet: Sheet, cells: readonly CellEdit[]): void => {
    book.tables.on(sheet).forEach((table) => {
      const columns = table.headers ? renamedColumns(table, cells, prefix()) : undefined;

      if (columns === undefined) {
        return;
      }

      columns.forEach((name, index) => {
        const col = table.range.left + index;
        const content = calculator.contentAt(sheet, table.range.top, col);

        if (
          content.kind !== 'value' ||
          content.value.kind !== 'string' ||
          content.value.value !== name
        ) {
          writeHeader(sheet, table.range.top, col, name);
        }
      });

      calculator.setTable(table.name, { ...table, columns });
    });
  };

  const plan = (sheet: Sheet, change: LineChange): TableMoves =>
    book.tables.on(sheet).reduce<{
      removed: SheetTable[];
      moved: { table: SheetTable; shape: TableShape }[];
    }>(
      (moves, table) => {
        const shift = shiftTable(table, change, prefix());

        if (shift.kind === 'removed') {
          moves.removed.push(table);
        } else if (shift.kind === 'moved') {
          moves.moved.push({ table, shape: shift.shape });
        }
        return moves;
      },
      { removed: [], moved: [] },
    );

  const drop = (tables: readonly SheetTable[]): TableDrops => {
    if (tables.length === 0) {
      return NO_DROPS;
    }

    tables.forEach((table) => {
      calculator.setTable(table.name, undefined);
    });

    return {
      rewrites: rewriter.formulas((_sheet, ast) => strip(tables, ast)),
      names: rewriter.names((defined) => strip(tables, defined.ast)),
    };
  };

  const move = (sheet: Sheet, moves: TableMoves, change: LineChange): void => {
    moves.moved.forEach(({ table, shape }) => {
      calculator.setTable(table.name, { ...table, ...shape });
      if (!shape.headers || change.axis !== 'cols' || change.count < 0) {
        return;
      }

      shape.columns.forEach((name, index) => {
        const col = shape.range.left + index;

        if (col >= change.at && col < change.at + change.count) {
          writeHeader(sheet, shape.range.top, col, name);
        }
      });
    });
  };

  return { add, set, rename, syncHeaders, plan, drop, move, restores, strip };
};

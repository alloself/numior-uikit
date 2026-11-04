import { MAX_COLS, MAX_ROWS, containsCell } from '../address';
import type { Calculator, UserRewrite } from '../calc/calculator';
import type { CellContent, ShiftedName } from '../calc/calc.types';
import type { FormulaNode } from '../formula/formula.types';
import {
  BROKEN,
  dropTableFromFormula,
  mapStructured,
  renameTableInFormula,
  sameName,
  type LineChange,
  type StructuredReference,
} from '../formula/rewrite';
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
import {
  StepRefusal,
  type CellEdit,
  type StepResult,
  type TableSpec,
  type WorkbookStep,
} from './step.types';
import { CellInputKind, CellValueKind, LineAxis, TableShiftKind } from '../cell.types';

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
  drop(moves: TableMoves): TableDrops;
  move(sheet: Sheet, moves: TableMoves, change: LineChange): void;
  restores(moves: TableMoves): WorkbookStep[];
  strip(tables: readonly SheetTable[], ast: FormulaNode): FormulaNode;
}

interface Loss {
  readonly table: SheetTable;
  readonly lost: ReadonlySet<string> | undefined;
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
  if (content.kind !== CellInputKind.Value) {
    return '';
  }

  const { value } = content;

  switch (value.kind) {
    case CellValueKind.String:
      return value.value;
    case CellValueKind.Number:
      return String(value.value);
    case CellValueKind.Boolean:
      return value.value ? 'TRUE' : 'FALSE';
    case CellValueKind.Error:
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
  tables.reduce((current, table) => dropTableFromFormula(current, table.name), ast);

const aimsAt = (
  table: SheetTable,
  reference: StructuredReference,
  sheet: Sheet | undefined,
  row: number,
  col: number,
): boolean =>
  reference.table === undefined
    ? sheet === table.sheet && containsCell(table.range, row, col)
    : sameName(reference.table, table.name);

const renamedReference = (
  reference: StructuredReference,
  renames: ReadonlyMap<string, string>,
): StructuredReference => {
  const { columns } = reference;

  if (columns === undefined) {
    return reference;
  }

  const from = renames.get(columns.from.toLowerCase()) ?? columns.from;
  const to = renames.get(columns.to.toLowerCase()) ?? columns.to;

  return from === columns.from && to === columns.to
    ? reference
    : { ...reference, columns: { from, to } };
};

const columnRenames = (before: readonly string[], after: readonly string[]): Map<string, string> =>
  before.reduce((renames, name, index) => {
    const next = after[index];

    if (next !== undefined && next !== name) {
      renames.set(name.toLowerCase(), next);
    }
    return renames;
  }, new Map<string, string>());

const renamingIn = (
  table: SheetTable,
  renames: ReadonlyMap<string, string>,
): UserRewrite | undefined =>
  renames.size === 0
    ? undefined
    : (owner, row, col, ast) =>
        mapStructured(ast, (reference) =>
          aimsAt(table, reference, owner, row, col)
            ? renamedReference(reference, renames)
            : reference,
        );

const lostColumns = (table: SheetTable, shape: TableShape): Set<string> =>
  table.columns.reduce((lost, name) => {
    if (!shape.columns.includes(name)) {
      lost.add(name.toLowerCase());
    }
    return lost;
  }, new Set<string>());

const loses = (reference: StructuredReference, lost: ReadonlySet<string> | undefined): boolean =>
  lost === undefined ||
  (reference.columns !== undefined &&
    (lost.has(reference.columns.from.toLowerCase()) ||
      lost.has(reference.columns.to.toLowerCase())));

const broken = (
  loss: Loss,
  ast: FormulaNode,
  sheet: Sheet | undefined,
  row: number,
  col: number,
): FormulaNode =>
  mapStructured(
    loss.lost === undefined ? dropTableFromFormula(ast, loss.table.name) : ast,
    (reference) =>
      aimsAt(loss.table, reference, sheet, row, col) && loses(reference, loss.lost)
        ? BROKEN
        : reference,
  );

const lossesOf = (moves: TableMoves): Loss[] =>
  moves.moved.reduce<Loss[]>(
    (losses, { table, shape }) => {
      const lost = lostColumns(table, shape);

      if (lost.size > 0) {
        losses.push({ table, lost });
      }
      return losses;
    },
    moves.removed.map((table) => ({ table, lost: undefined })),
  );

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
      return StepRefusal.InvalidName;
    }
    if (book.names.taken(name)) {
      return StepRefusal.NameTaken;
    }
    if (!insideSheet(spec) || !validColumns(spec) || dataRows(spec) < 1) {
      return StepRefusal.InvalidTable;
    }

    const wanted = name.toLowerCase();

    return book.tables
      .on(sheet)
      .some((other) => other.name.toLowerCase() !== wanted && rangesMeet(other.range, spec.range))
      ? StepRefusal.TableOverlap
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
      return { ok: false, reason: StepRefusal.MissingSheet };
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
    book.tables.get(name) === undefined
      ? set(name, spec)
      : { ok: false, reason: StepRefusal.NameTaken };

  const rename = (from: string, to: string): StepResult => {
    const table = book.tables.get(from);

    if (table === undefined) {
      return { ok: false, reason: StepRefusal.MissingTable };
    }
    if (!validDefinedName(to)) {
      return { ok: false, reason: StepRefusal.InvalidName };
    }

    const other = book.tables.get(to);

    if (book.names.taken(to) || (other !== undefined && other !== table)) {
      return { ok: false, reason: StepRefusal.NameTaken };
    }
    calculator.setTable(table.name, undefined);
    calculator.setTable(to, { ...table, name: to });
    rewriter.users(table.name, (_sheet, ast) => renameTableInFormula(ast, table.name, to));
    rewriter.names((defined) => renameTableInFormula(defined.ast, table.name, to));
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
          content.kind !== CellInputKind.Value ||
          content.value.kind !== CellValueKind.String ||
          content.value.value !== name
        ) {
          writeHeader(sheet, table.range.top, col, name);
        }
      });

      const renames = columnRenames(table.columns, columns);

      calculator.setTable(table.name, { ...table, columns }, renamingIn(table, renames));
      if (renames.size === 0) {
        return;
      }

      rewriter.names((defined) =>
        mapStructured(defined.ast, (reference) =>
          aimsAt(table, reference, undefined, 0, 0)
            ? renamedReference(reference, renames)
            : reference,
        ),
      );
    });
  };

  const plan = (sheet: Sheet, change: LineChange): TableMoves =>
    book.tables.on(sheet).reduce<{
      removed: SheetTable[];
      moved: { table: SheetTable; shape: TableShape }[];
    }>(
      (moves, table) => {
        const shift = shiftTable(table, change, prefix());

        if (shift.kind === TableShiftKind.Removed) {
          moves.removed.push(table);
        } else if (shift.kind === TableShiftKind.Moved) {
          moves.moved.push({ table, shape: shift.shape });
        }
        return moves;
      },
      { removed: [], moved: [] },
    );

  const drop = (moves: TableMoves): TableDrops => {
    const losses = lossesOf(moves);

    if (losses.length === 0) {
      return NO_DROPS;
    }

    const rewrites = losses.flatMap((loss) =>
      rewriter.users(loss.table.name, (owner, ast, row, col) => broken(loss, ast, owner, row, col)),
    );

    const names = rewriter.names((defined) =>
      losses.reduce((ast, loss) => broken(loss, ast, undefined, 0, 0), defined.ast),
    );

    moves.removed.forEach((table) => {
      calculator.setTable(table.name, undefined);
    });

    return { rewrites: rewrites.toReversed(), names };
  };

  const move = (sheet: Sheet, moves: TableMoves, change: LineChange): void => {
    moves.moved.forEach(({ table, shape }) => {
      calculator.setTable(table.name, { ...table, ...shape });
      if (!shape.headers || change.axis !== LineAxis.Cols || change.count < 0) {
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

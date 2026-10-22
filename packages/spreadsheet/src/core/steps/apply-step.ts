import { MAX_COLS, MAX_ROWS, containsCell } from '../address';
import type { Calculator } from '../calc/calculator';
import type { CellContent, ShiftedFormulaCell, ShiftedName } from '../calc/calc.types';
import type { CellRange } from '../cell.types';
import type { ConditionalFormat } from '../conditional/conditional.types';
import type { FormulaNode } from '../formula/formula.types';
import { formulaReferences, onSheetNamed } from '../formula/references';
import type { SheetLayout } from '../layout/layout.types';
import { mapLayoutFormulas, shiftLayout } from '../layout/line-layouts';
import { dropSheetFromFormula, renameInFormula, type LineChange } from '../formula/rewrite';
import { validDefinedName, validSheetName, type Sheet, type Workbook } from '../workbook';
import { createRewriter, formulaEdits, nameEdits } from './rewrites';
import type {
  CellEdit,
  LineAxis,
  SheetStep,
  StepRefusal,
  StepResult,
  WorkbookStep,
} from './step.types';
import { createPivotSteps } from './pivot-steps';
import { createTableSteps, specOf, type TableDrops } from './table-steps';
import {
  mapConditionalFormulas,
  shiftConditional,
  shiftConditionalReferences,
} from '../conditional/shift';

export interface Stepper {
  apply(step: WorkbookStep): StepResult;
}

const EMPTY_CONTENT: CellContent = { kind: 'empty' };

const GENERAL = 'General';

const NO_CHANGES: readonly LineChange[] = [];

const keyOf = (row: number, col: number): number => row * MAX_COLS + col;

const limitOf = (axis: LineAxis): number => (axis === 'rows' ? MAX_ROWS : MAX_COLS);

const linesRange = (axis: LineAxis, from: number, to: number): CellRange =>
  axis === 'rows'
    ? { top: from, bottom: to, left: 0, right: MAX_COLS - 1 }
    : { top: 0, bottom: MAX_ROWS - 1, left: from, right: to };

const WHOLE_SHEET: CellRange = { top: 0, left: 0, bottom: MAX_ROWS - 1, right: MAX_COLS - 1 };

const refused = (reason: StepRefusal): StepResult => ({ ok: false, reason });

const done = (inverse: WorkbookStep, changes: readonly LineChange[] = NO_CHANGES): StepResult => ({
  ok: true,
  inverse,
  changes,
});

const mentions = (ast: FormulaNode, name: string): boolean =>
  formulaReferences(ast).some((reference) => onSheetNamed(reference, name));

const setConditional = (sheet: Sheet, formats: readonly ConditionalFormat[]): StepResult => {
  const previous = sheet.conditional;

  sheet.conditional = formats;
  return done({ kind: 'setConditional', sheet: sheet.name, formats: previous });
};

const setLayout = (sheet: Sheet, layout: SheetLayout): StepResult => {
  const previous = sheet.layout;

  sheet.layout = layout;
  return done({ kind: 'setLayout', sheet: sheet.name, layout: previous });
};

export const createStepper = (book: Workbook, calculator: Calculator): Stepper => {
  const rewriter = createRewriter(book, calculator);
  const tables = createTableSteps(book, calculator, rewriter);

  const formatCode = (sheet: Sheet, row: number, col: number): string =>
    book.formats.code(sheet.formats.get(row, col));

  const contentsIn = (sheet: Sheet, range: CellRange): Map<number, CellEdit> => {
    const found = new Map<number, CellEdit>();

    const add = (row: number, col: number): void => {
      const content = calculator.contentAt(sheet, row, col);
      const format = sheet.formats.get(row, col);
      const decoration = sheet.decorations.get(row, col);

      if (content.kind !== 'empty' || format !== 0 || decoration !== 0) {
        found.set(keyOf(row, col), {
          row,
          col,
          content,
          format: book.formats.code(format),
          decoration: decoration === 0 ? undefined : book.decorations.get(decoration),
        });
      }
    };

    sheet.cells.forEachInRange(range, add);
    sheet.formats.forEachInRange(range, add);
    sheet.decorations.forEachInRange(range, add);

    calculator.forEachFormula((owner, row, col) => {
      if (owner === sheet && containsCell(range, row, col)) {
        add(row, col);
      }
    });

    return found;
  };

  const clear = (sheet: Sheet, cells: Iterable<CellEdit>): void => {
    for (const cell of cells) {
      calculator.setContent(sheet, cell.row, cell.col, EMPTY_CONTENT);
      sheet.formats.set(cell.row, cell.col, 0);
      sheet.decorations.set(cell.row, cell.col, 0);
    }
  };

  const write = (sheet: Sheet, cell: CellEdit): void => {
    if (cell.content !== undefined) {
      calculator.setContent(sheet, cell.row, cell.col, cell.content);
    }
    if (cell.format !== undefined) {
      sheet.formats.set(cell.row, cell.col, book.formats.id(cell.format));
    }
    if (cell.decoration !== undefined) {
      sheet.decorations.set(cell.row, cell.col, book.decorations.id(cell.decoration));
    }
  };

  const setName = (
    name: string,
    scope: Sheet | undefined,
    ast: FormulaNode | undefined,
  ): StepResult => {
    if (!validDefinedName(name)) {
      return refused('invalid-name');
    }
    if (ast !== undefined && book.tables.get(name) !== undefined) {
      return refused('name-taken');
    }

    const previous = book.names.get(name, scope);

    calculator.setName(previous?.name ?? name, scope, ast);
    return done({ kind: 'setName', name, scope: scope?.name, ast: previous?.ast });
  };

  const setCells = (sheet: Sheet, cells: readonly CellEdit[]): StepResult => {
    const previous = cells
      .map((cell): CellEdit => ({
        row: cell.row,
        col: cell.col,
        content:
          cell.content === undefined ? undefined : calculator.contentAt(sheet, cell.row, cell.col),
        format: cell.format === undefined ? undefined : formatCode(sheet, cell.row, cell.col),
        decoration:
          cell.decoration === undefined
            ? undefined
            : book.decorations.get(sheet.decorations.get(cell.row, cell.col)),
      }))
      .toReversed();

    cells.forEach((cell) => {
      write(sheet, cell);
    });

    tables.syncHeaders(sheet, cells);
    return done({ kind: 'setCells', sheet: sheet.name, cells: previous });
  };

  const setFormat = (sheet: Sheet, range: CellRange, format: string): StepResult => {
    const previous: CellEdit[] = [];

    sheet.formats.forEachInRange(range, (row, col, id) => {
      previous.push({ row, col, format: book.formats.code(id) });
    });

    sheet.formats.setRange(range, book.formats.id(format));
    return done({
      kind: 'batch',
      steps: [
        { kind: 'setFormat', sheet: sheet.name, range, format: GENERAL },
        { kind: 'setCells', sheet: sheet.name, cells: previous },
      ],
    });
  };

  const snapshotOf = (sheet: Sheet, cells: readonly CellEdit[]): CellEdit[] =>
    cells.map((cell) => ({
      row: cell.row,
      col: cell.col,
      content: calculator.contentAt(sheet, cell.row, cell.col),
      format: formatCode(sheet, cell.row, cell.col),
      decoration: book.decorations.get(sheet.decorations.get(cell.row, cell.col)),
    }));

  const pivots = createPivotSteps(book, { contentsIn, write, snapshot: snapshotOf });

  const snapshot = (): WorkbookStep[] => [
    ...book.sheets.flatMap((each): WorkbookStep[] => [
      { kind: 'setConditional', sheet: each.name, formats: each.conditional },
      { kind: 'setLayout', sheet: each.name, layout: each.layout },
    ]),
    ...pivots.snapshot(),
  ];

  const moveConditional = (sheet: Sheet, change: LineChange): void => {
    book.sheets.forEach((each) => {
      each.conditional =
        each === sheet
          ? shiftConditional(each.conditional, change)
          : shiftConditionalReferences(each.conditional, change);
    });
  };

  const occupied = (sheet: Sheet, range: CellRange): boolean => {
    let found = calculator.hasFormulaIn(sheet, range);

    sheet.cells.forEachInRange(range, () => {
      found = true;
    });

    sheet.formats.forEachInRange(range, () => {
      found = true;
    });

    sheet.decorations.forEachInRange(range, () => {
      found = true;
    });

    return found;
  };

  const moveLines = (
    sheet: Sheet,
    change: LineChange,
  ): {
    deleted: CellEdit[];
    rewrites: readonly ShiftedFormulaCell[];
    names: readonly ShiftedName[];
    drops: TableDrops;
    restores: WorkbookStep[];
  } => {
    const removed = Math.max(-change.count, 0);

    const deleted =
      removed > 0
        ? [
            ...contentsIn(
              sheet,
              linesRange(change.axis, change.at, change.at + removed - 1),
            ).values(),
          ]
        : [];

    const moves = tables.plan(sheet, change);
    const drops = tables.drop(moves);
    const rewrites = calculator.shiftLines(sheet, change);
    const names = calculator.shiftNames(change);

    moveConditional(sheet, change);

    book.sheets.forEach((each) => {
      each.layout = shiftLayout(each.layout, change, each === sheet);
    });

    sheet.formats.shiftLines(change.axis, change.at, change.count);
    sheet.decorations.shiftLines(change.axis, change.at, change.count);
    sheet.shifts += 1;
    tables.move(sheet, moves, change);
    pivots.move(sheet, change);
    return { deleted, rewrites, names, drops, restores: tables.restores(moves) };
  };

  const insertLines = (sheet: Sheet, axis: LineAxis, at: number, count: number): StepResult => {
    const limit = limitOf(axis);

    if (occupied(sheet, linesRange(axis, limit - count, limit - 1))) {
      return refused('sheet-full');
    }

    const change: LineChange = { sheet: sheet.name, axis, at, count };

    if (pivots.crossed(sheet, change)) {
      return refused('pivot-overlap');
    }

    const saved = snapshot();

    moveLines(sheet, change);
    return done(
      {
        kind: 'batch',
        steps: [{ kind: 'deleteLines', sheet: sheet.name, axis, at, count }, ...saved],
      },
      [change],
    );
  };

  const deleteLines = (sheet: Sheet, axis: LineAxis, at: number, count: number): StepResult => {
    const change: LineChange = { sheet: sheet.name, axis, at, count: -count };

    if (pivots.crossed(sheet, change)) {
      return refused('pivot-overlap');
    }

    const saved = snapshot();
    const { deleted, rewrites, names, drops, restores } = moveLines(sheet, change);

    return done(
      {
        kind: 'batch',
        steps: [
          { kind: 'insertLines', sheet: sheet.name, axis, at, count },
          { kind: 'setCells', sheet: sheet.name, cells: deleted },
          ...formulaEdits(rewrites),
          ...nameEdits(names),
          ...formulaEdits(drops.rewrites),
          ...nameEdits(drops.names),
          ...restores,
          ...saved,
        ],
      },
      [change],
    );
  };

  const addSheet = (name: string, index: number): StepResult => {
    if (!validSheetName(name) || book.sheet(name) !== undefined) {
      return refused('name-taken');
    }
    book.addSheet(name, index);

    calculator.forEachFormula((sheet, row, col, ast) => {
      if (mentions(ast, name)) {
        calculator.setContent(sheet, row, col, { kind: 'formula', ast });
      }
    });

    book.names.forEach((defined) => {
      if (mentions(defined.ast, name)) {
        calculator.setName(defined.name, defined.scope, defined.ast);
      }
    });

    return done({ kind: 'removeSheet', name });
  };

  const removeSheet = (sheet: Sheet): StepResult => {
    if (book.sheets.length === 1) {
      return refused('last-sheet');
    }

    const index = book.sheets.indexOf(sheet);
    const contents = [...contentsIn(sheet, WHOLE_SHEET).values()];
    const saved = snapshot();
    const removed = book.tables.on(sheet);

    removed.forEach((table) => {
      calculator.setTable(table.name, undefined);
    });

    const rewrites = rewriter.formulas((owner, ast) =>
      owner === sheet ? ast : tables.strip(removed, dropSheetFromFormula(ast, sheet.name)),
    );

    const names = rewriter.names((defined) =>
      defined.scope === sheet
        ? undefined
        : tables.strip(removed, dropSheetFromFormula(defined.ast, sheet.name)),
    );

    clear(sheet, contents);
    pivots.dropSheet(sheet);
    book.removeSheet(sheet);

    book.sheets.forEach((each) => {
      each.conditional = mapConditionalFormulas(each.conditional, (ast) =>
        dropSheetFromFormula(ast, sheet.name),
      );

      each.layout = mapLayoutFormulas(each.layout, (ast) => dropSheetFromFormula(ast, sheet.name));
    });

    return done({
      kind: 'batch',
      steps: [
        { kind: 'addSheet', name: sheet.name, index },
        { kind: 'setCells', sheet: sheet.name, cells: contents },
        ...removed.map((table): WorkbookStep => ({
          kind: 'setTable',
          name: table.name,
          table: specOf(table),
        })),
        ...formulaEdits(rewrites),
        ...nameEdits(names),
        ...saved,
      ],
    });
  };

  const renameSheet = (sheet: Sheet, to: string): StepResult => {
    const from = sheet.name;

    if (!book.renameSheet(sheet, to)) {
      return refused('name-taken');
    }
    rewriter.formulas((_owner, ast) => renameInFormula(ast, from, to));
    rewriter.names((defined) => renameInFormula(defined.ast, from, to));
    pivots.rename(from, to);

    book.sheets.forEach((each) => {
      each.conditional = mapConditionalFormulas(each.conditional, (ast) =>
        renameInFormula(ast, from, to),
      );

      each.layout = mapLayoutFormulas(each.layout, (ast) => renameInFormula(ast, from, to));
    });

    return done({ kind: 'renameSheet', from: to, to: from });
  };

  const applyBatch = (steps: readonly WorkbookStep[]): StepResult => {
    const inverses: WorkbookStep[] = [];
    const changes: LineChange[] = [];

    for (const step of steps) {
      const result = apply(step);

      if (!result.ok) {
        inverses.toReversed().forEach((inverse) => apply(inverse));
        return result;
      }
      inverses.push(result.inverse);
      changes.push(...result.changes);
    }
    return done({ kind: 'batch', steps: inverses.toReversed() }, changes);
  };

  const onSheet = (name: string, run: (sheet: Sheet) => StepResult): StepResult => {
    const sheet = book.sheet(name);

    return sheet === undefined ? refused('missing-sheet') : run(sheet);
  };

  const applyToSheet = (sheet: Sheet, step: SheetStep): StepResult => {
    switch (step.kind) {
      case 'setCells':
        return pivots.covers(sheet, step.cells)
          ? refused('pivot-output')
          : setCells(sheet, step.cells);
      case 'setFormat':
        return setFormat(sheet, step.range, step.format);
      case 'insertLines':
        return insertLines(sheet, step.axis, step.at, step.count);
      case 'deleteLines':
        return deleteLines(sheet, step.axis, step.at, step.count);
      case 'setConditional':
        return setConditional(sheet, step.formats);
      case 'setLayout':
        return setLayout(sheet, step.layout);
      case 'setPivot':
        return pivots.set(sheet, step.name, step.pivot);
      case 'refreshPivot':
        return pivots.refresh(sheet, step.name);
      case 'putPivot':
        return pivots.put(sheet, step.name, step.pivot, step.cells);
    }
  };

  const apply = (step: WorkbookStep): StepResult => {
    switch (step.kind) {
      case 'addSheet':
        return addSheet(step.name, step.index);
      case 'removeSheet':
        return onSheet(step.name, removeSheet);
      case 'renameSheet':
        return onSheet(step.from, (sheet) => renameSheet(sheet, step.to));
      case 'setName':
        return step.scope === undefined
          ? setName(step.name, undefined, step.ast)
          : onSheet(step.scope, (sheet) => setName(step.name, sheet, step.ast));
      case 'addTable':
        return tables.add(step.name, step.table);
      case 'setTable':
        return tables.set(step.name, step.table);
      case 'renameTable':
        return tables.rename(step.from, step.to);
      case 'batch':
        return applyBatch(step.steps);
      default:
        return onSheet(step.sheet, (sheet) => applyToSheet(sheet, step));
    }
  };

  return { apply };
};

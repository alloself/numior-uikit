import { MAX_COLS, MAX_ROWS } from '../address';
import type { Calculator } from '../calc/calculator';
import type { CellContent, ShiftedFormulaCell, ShiftedName } from '../calc/calc.types';
import { LineAxis, type CellRange } from '../cell.types';
import type { ConditionalFormat } from '../conditional/conditional.types';
import type { FormulaNode } from '../formula/formula.types';
import { formulaReferences, onSheetNamed } from '../formula/references';
import type { SheetLayout } from '../layout/layout.types';
import { mapLayoutFormulas, shiftLayout } from '../layout/line-layouts';
import { layoutBack, layoutDelta, patchLayout } from '../layout/merge-layout';
import { dropSheetFromFormula, renameInFormula, type LineChange } from '../formula/rewrite';
import { validDefinedName, validSheetName, type Sheet, type Workbook } from '../workbook';
import { cellContentsIn } from './contents';
import { createRewriter, formulaEdits, nameEdits } from './rewrites';
import {
  StepKind,
  StepRefusal,
  type CellEdit,
  type SheetStep,
  type StepResult,
  type WorkbookStep,
} from './step.types';
import { createPivotSteps } from './pivot-steps';
import { createTableSteps, specOf, type TableDrops } from './table-steps';
import {
  mapConditionalFormulas,
  shiftConditional,
  shiftConditionalReferences,
} from '../conditional/shift';
import { patchFormats, sameFormats } from '../conditional/patch';

export interface Stepper {
  apply(step: WorkbookStep): StepResult;
}

interface SheetLook {
  readonly sheet: Sheet;
  readonly conditional: readonly ConditionalFormat[];
  readonly layout: SheetLayout;
}

const EMPTY_CONTENT: CellContent = { kind: 'empty' };

const GENERAL = 'General';

const NO_CHANGES: readonly LineChange[] = [];

const limitOf = (axis: LineAxis): number => (axis === LineAxis.Rows ? MAX_ROWS : MAX_COLS);

const linesRange = (axis: LineAxis, from: number, to: number): CellRange =>
  axis === LineAxis.Rows
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

const setConditional = (
  sheet: Sheet,
  formats: readonly ConditionalFormat[],
  base: readonly ConditionalFormat[] | undefined,
): StepResult => {
  const previous = sheet.conditional;

  sheet.conditional = base === undefined ? formats : patchFormats(base, formats, previous);

  return done({
    kind: 'setConditional',
    sheet: sheet.name,
    formats: previous,
    base: sheet.conditional,
  });
};

const setLayout = (
  sheet: Sheet,
  layout: SheetLayout,
  base: SheetLayout | undefined,
): StepResult => {
  const previous = sheet.layout;

  sheet.layout = base === undefined ? layout : patchLayout(base, layout, previous);
  return done({ kind: 'setLayout', sheet: sheet.name, ...layoutBack(sheet.layout, previous) });
};

const looksOf = (book: Workbook): SheetLook[] =>
  book.sheets.map((sheet) => ({ sheet, conditional: sheet.conditional, layout: sheet.layout }));

const lookSteps = (
  { sheet, conditional, layout }: SheetLook,
  formats: readonly ConditionalFormat[],
  expected: SheetLayout,
): WorkbookStep[] => {
  const steps: WorkbookStep[] = [];

  if (!sameFormats(formats, conditional)) {
    steps.push({ kind: 'setConditional', sheet: sheet.name, formats: conditional, base: formats });
  }
  const delta = layoutDelta(expected, layout);

  if (delta !== undefined) {
    steps.push({ kind: 'setLayout', sheet: sheet.name, ...delta });
  }
  return steps;
};

const looksAfterLines = (
  looks: readonly SheetLook[],
  moved: Sheet,
  change: LineChange,
): WorkbookStep[] => {
  const back: LineChange = { ...change, count: -change.count };

  return looks.flatMap((look) => {
    const own = look.sheet === moved;

    return lookSteps(
      look,
      own
        ? shiftConditional(look.sheet.conditional, back)
        : shiftConditionalReferences(look.sheet.conditional, back),
      look.sheet.layout === look.layout ? look.layout : shiftLayout(look.sheet.layout, back, own),
    );
  });
};

export const createStepper = (book: Workbook, calculator: Calculator): Stepper => {
  const rewriter = createRewriter(book, calculator);
  const tables = createTableSteps(book, calculator, rewriter);

  const formatCode = (sheet: Sheet, row: number, col: number): string =>
    book.formats.code(sheet.formats.get(row, col));

  const contentsIn = (sheet: Sheet, range: CellRange): Map<number, CellEdit> =>
    cellContentsIn(book, calculator, sheet, range);

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
      return refused(StepRefusal.InvalidName);
    }
    if (ast !== undefined && book.tables.get(name) !== undefined) {
      return refused(StepRefusal.NameTaken);
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
    const looks = looksOf(book);
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

    return {
      deleted,
      rewrites,
      names,
      drops,
      restores: [
        ...tables.restores(moves),
        ...looksAfterLines(looks, sheet, change),
        ...pivots.move(sheet, change),
      ],
    };
  };

  const insertLines = (sheet: Sheet, axis: LineAxis, at: number, count: number): StepResult => {
    const limit = limitOf(axis);

    if (occupied(sheet, linesRange(axis, limit - count, limit - 1))) {
      return refused(StepRefusal.SheetFull);
    }

    const change: LineChange = { sheet: sheet.name, axis, at, count };

    if (pivots.crossed(sheet, change)) {
      return refused(StepRefusal.PivotOverlap);
    }

    const { rewrites, names, drops, restores } = moveLines(sheet, change);

    return done(
      {
        kind: 'batch',
        steps: [
          { kind: 'deleteLines', sheet: sheet.name, axis, at, count },
          ...formulaEdits(rewrites),
          ...nameEdits(names),
          ...formulaEdits(drops.rewrites),
          ...nameEdits(drops.names),
          ...restores,
        ],
      },
      [change],
    );
  };

  const deleteLines = (sheet: Sheet, axis: LineAxis, at: number, count: number): StepResult => {
    const change: LineChange = { sheet: sheet.name, axis, at, count: -count };

    if (pivots.crossed(sheet, change)) {
      return refused(StepRefusal.PivotOverlap);
    }

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
        ],
      },
      [change],
    );
  };

  const addSheet = (name: string, index: number): StepResult => {
    if (!validSheetName(name) || book.sheet(name) !== undefined) {
      return refused(StepRefusal.NameTaken);
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
      return refused(StepRefusal.LastSheet);
    }

    const index = book.sheets.indexOf(sheet);
    const contents = [...contentsIn(sheet, WHOLE_SHEET).values()];
    const looks = looksOf(book);
    const kept = pivots.kept(sheet);
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
        ...looks.flatMap((look): WorkbookStep[] =>
          look.sheet === sheet
            ? [
                {
                  kind: 'setConditional',
                  sheet: sheet.name,
                  formats: look.conditional,
                  base: undefined,
                },
                { kind: 'setLayout', sheet: sheet.name, layout: look.layout, base: undefined },
              ]
            : lookSteps(look, look.sheet.conditional, look.sheet.layout),
        ),
        ...kept,
      ],
    });
  };

  const renameSheet = (sheet: Sheet, to: string): StepResult => {
    const from = sheet.name;

    if (!book.renameSheet(sheet, to)) {
      return refused(StepRefusal.NameTaken);
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

    return sheet === undefined ? refused(StepRefusal.MissingSheet) : run(sheet);
  };

  const applyToSheet = (sheet: Sheet, step: SheetStep): StepResult => {
    switch (step.kind) {
      case StepKind.SetCells:
        return pivots.covers(sheet, step.cells)
          ? refused(StepRefusal.PivotOutput)
          : setCells(sheet, step.cells);
      case StepKind.SetFormat:
        return setFormat(sheet, step.range, step.format);
      case StepKind.InsertLines:
        return insertLines(sheet, step.axis, step.at, step.count);
      case StepKind.DeleteLines:
        return deleteLines(sheet, step.axis, step.at, step.count);
      case StepKind.SetConditional:
        return setConditional(sheet, step.formats, step.base);
      case StepKind.SetLayout:
        return setLayout(sheet, step.layout, step.base);
      case StepKind.SetPivot:
        return pivots.set(sheet, step.name, step.pivot);
      case StepKind.RefreshPivot:
        return pivots.refresh(sheet, step.name);
      case StepKind.PutPivot:
        return pivots.put(sheet, step.name, step.pivot, step.cells, step.layout, step.base);
    }
  };

  const apply = (step: WorkbookStep): StepResult => {
    switch (step.kind) {
      case StepKind.AddSheet:
        return addSheet(step.name, step.index);
      case StepKind.RemoveSheet:
        return onSheet(step.name, removeSheet);
      case StepKind.RenameSheet:
        return onSheet(step.from, (sheet) => renameSheet(sheet, step.to));
      case StepKind.SetName:
        return step.scope === undefined
          ? setName(step.name, undefined, step.ast)
          : onSheet(step.scope, (sheet) => setName(step.name, sheet, step.ast));
      case StepKind.AddTable:
        return tables.add(step.name, step.table);
      case StepKind.SetTable:
        return tables.set(step.name, step.table);
      case StepKind.RenameTable:
        return tables.rename(step.from, step.to);
      case StepKind.Batch:
        return applyBatch(step.steps);
      default:
        return onSheet(step.sheet, (sheet) => applyToSheet(sheet, step));
    }
  };

  return { apply };
};

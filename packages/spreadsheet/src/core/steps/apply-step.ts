import { MAX_COLS, MAX_ROWS, containsCell } from '../address';
import type { Calculator } from '../calc/calculator';
import type { CellContent, ShiftedFormulaCell, ShiftedName } from '../calc/calc.types';
import type { CellRange } from '../cell.types';
import type { FormulaNode } from '../formula/formula.types';
import { formulaReferences } from '../formula/references';
import {
  dropSheetFromFormula,
  renameInFormula,
  sameName,
  type LineChange,
} from '../formula/rewrite';
import {
  validDefinedName,
  validSheetName,
  type DefinedName,
  type Sheet,
  type Workbook,
} from '../workbook';
import type { CellEdit, LineAxis, StepRefusal, StepResult, WorkbookStep } from './step.types';

export interface Stepper {
  apply(step: WorkbookStep): StepResult;
}

interface Located {
  readonly row: number;
  readonly col: number;
}

interface Rewrite extends Located {
  readonly sheet: Sheet;
  readonly before: FormulaNode;
  readonly after: FormulaNode;
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

const nameEdits = (names: readonly ShiftedName[]): WorkbookStep[] =>
  names.map((shifted) => ({
    kind: 'setName',
    name: shifted.name,
    scope: shifted.scope?.name,
    ast: shifted.before,
  }));

const formulaEdits = (rewrites: readonly ShiftedFormulaCell[]): WorkbookStep[] => {
  const bySheet = new Map<Sheet, CellEdit[]>();

  rewrites.forEach((rewrite) => {
    const edits = bySheet.get(rewrite.sheet) ?? [];

    edits.push({
      row: rewrite.row,
      col: rewrite.col,
      content: { kind: 'formula', ast: rewrite.before },
    });

    bySheet.set(rewrite.sheet, edits);
  });

  return [...bySheet].map(([sheet, cells]) => ({ kind: 'setCells', sheet: sheet.name, cells }));
};

const mentions = (ast: FormulaNode, name: string): boolean =>
  formulaReferences(ast).some(
    (reference) => reference.sheet !== undefined && sameName(reference.sheet, name),
  );

export const createStepper = (book: Workbook, calculator: Calculator): Stepper => {
  const formatCode = (sheet: Sheet, row: number, col: number): string =>
    book.formats.code(sheet.formats.get(row, col));

  const contentsIn = (sheet: Sheet, range: CellRange): Map<number, CellEdit> => {
    const found = new Map<number, CellEdit>();

    const add = (row: number, col: number): void => {
      const content = calculator.contentAt(sheet, row, col);
      const format = sheet.formats.get(row, col);

      if (content.kind !== 'empty' || format !== 0) {
        found.set(keyOf(row, col), { row, col, content, format: book.formats.code(format) });
      }
    };

    sheet.cells.forEachInRange(range, add);
    sheet.formats.forEachInRange(range, add);

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
    }
  };

  const write = (sheet: Sheet, cell: CellEdit): void => {
    if (cell.content !== undefined) {
      calculator.setContent(sheet, cell.row, cell.col, cell.content);
    }
    if (cell.format !== undefined) {
      sheet.formats.set(cell.row, cell.col, book.formats.id(cell.format));
    }
  };

  const rewriteInPlace = (rewrite: Rewrite): void => {
    calculator.setContent(rewrite.sheet, rewrite.row, rewrite.col, {
      kind: 'formula',
      ast: rewrite.after,
    });
  };

  const rewriteAll = (rewrite: (sheet: Sheet, ast: FormulaNode) => FormulaNode): Rewrite[] => {
    const found: Rewrite[] = [];

    calculator.forEachFormula((sheet, row, col, before) => {
      const after = rewrite(sheet, before);

      if (after !== before) {
        found.push({ sheet, row, col, before, after });
      }
    });

    return found;
  };

  const rewriteNames = (
    rewrite: (defined: DefinedName) => FormulaNode | undefined,
  ): ShiftedName[] => {
    const changed: ShiftedName[] = [];

    book.names.forEach((defined) => {
      const after = rewrite(defined);

      if (after !== defined.ast) {
        changed.push({ name: defined.name, scope: defined.scope, before: defined.ast });
        calculator.setName(defined.name, defined.scope, after);
      }
    });

    return changed;
  };

  const setName = (
    name: string,
    scope: Sheet | undefined,
    ast: FormulaNode | undefined,
  ): StepResult => {
    if (!validDefinedName(name)) {
      return refused('invalid-name');
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
      }))
      .toReversed();

    cells.forEach((cell) => {
      write(sheet, cell);
    });

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

  const occupied = (sheet: Sheet, range: CellRange): boolean => {
    let found = calculator.hasFormulaIn(sheet, range);

    sheet.cells.forEachInRange(range, () => {
      found = true;
    });

    sheet.formats.forEachInRange(range, () => {
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

    const rewrites = calculator.shiftLines(sheet, change);
    const names = calculator.shiftNames(change);

    sheet.formats.shiftLines(change.axis, change.at, change.count);
    return { deleted, rewrites, names };
  };

  const insertLines = (sheet: Sheet, axis: LineAxis, at: number, count: number): StepResult => {
    const limit = limitOf(axis);

    if (occupied(sheet, linesRange(axis, limit - count, limit - 1))) {
      return refused('sheet-full');
    }

    const change: LineChange = { sheet: sheet.name, axis, at, count };

    moveLines(sheet, change);
    return done({ kind: 'deleteLines', sheet: sheet.name, axis, at, count }, [change]);
  };

  const deleteLines = (sheet: Sheet, axis: LineAxis, at: number, count: number): StepResult => {
    const change: LineChange = { sheet: sheet.name, axis, at, count: -count };
    const { deleted, rewrites, names } = moveLines(sheet, change);

    return done(
      {
        kind: 'batch',
        steps: [
          { kind: 'insertLines', sheet: sheet.name, axis, at, count },
          { kind: 'setCells', sheet: sheet.name, cells: deleted },
          ...formulaEdits(rewrites),
          ...nameEdits(names),
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

    const rewrites = rewriteAll((owner, ast) =>
      owner === sheet ? ast : dropSheetFromFormula(ast, sheet.name),
    );

    const names = rewriteNames((defined) =>
      defined.scope === sheet ? undefined : dropSheetFromFormula(defined.ast, sheet.name),
    );

    clear(sheet, contents);
    rewrites.forEach(rewriteInPlace);
    book.removeSheet(sheet);
    return done({
      kind: 'batch',
      steps: [
        { kind: 'addSheet', name: sheet.name, index },
        { kind: 'setCells', sheet: sheet.name, cells: contents },
        ...formulaEdits(rewrites),
        ...nameEdits(names),
      ],
    });
  };

  const renameSheet = (sheet: Sheet, to: string): StepResult => {
    const from = sheet.name;

    if (!book.renameSheet(sheet, to)) {
      return refused('name-taken');
    }
    rewriteAll((_owner, ast) => renameInFormula(ast, from, to)).forEach(rewriteInPlace);
    rewriteNames((defined) => renameInFormula(defined.ast, from, to));
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

  const apply = (step: WorkbookStep): StepResult => {
    switch (step.kind) {
      case 'setCells':
        return onSheet(step.sheet, (sheet) => setCells(sheet, step.cells));
      case 'setFormat':
        return onSheet(step.sheet, (sheet) => setFormat(sheet, step.range, step.format));
      case 'insertLines':
        return onSheet(step.sheet, (sheet) => insertLines(sheet, step.axis, step.at, step.count));
      case 'deleteLines':
        return onSheet(step.sheet, (sheet) => deleteLines(sheet, step.axis, step.at, step.count));
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
      case 'batch':
        return applyBatch(step.steps);
    }
  };

  return { apply };
};

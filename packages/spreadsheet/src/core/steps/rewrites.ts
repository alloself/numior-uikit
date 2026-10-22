import type { Calculator } from '../calc/calculator';
import type { ShiftedFormulaCell, ShiftedName } from '../calc/calc.types';
import type { FormulaNode } from '../formula/formula.types';
import type { DefinedName, Sheet, Workbook } from '../workbook';
import type { CellEdit, WorkbookStep } from './step.types';

export interface Rewrite extends ShiftedFormulaCell {
  readonly after: FormulaNode;
}

type FormulaRewrite = (sheet: Sheet, ast: FormulaNode, row: number, col: number) => FormulaNode;

export interface Rewriter {
  formulas(rewrite: FormulaRewrite): Rewrite[];
  users(name: string, rewrite: FormulaRewrite): Rewrite[];
  names(rewrite: (defined: DefinedName) => FormulaNode | undefined): ShiftedName[];
}

export const nameEdits = (names: readonly ShiftedName[]): WorkbookStep[] =>
  names.map((shifted) => ({
    kind: 'setName',
    name: shifted.name,
    scope: shifted.scope?.name,
    ast: shifted.before,
  }));

export const formulaEdits = (rewrites: readonly ShiftedFormulaCell[]): WorkbookStep[] => {
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

const rewriteEach = (
  calculator: Calculator,
  each: (visit: (sheet: Sheet, row: number, col: number, ast: FormulaNode) => void) => void,
  rewrite: FormulaRewrite,
): Rewrite[] => {
  const found: Rewrite[] = [];

  each((sheet, row, col, before) => {
    const after = rewrite(sheet, before, row, col);

    if (after !== before) {
      found.push({ sheet, row, col, before, after });
    }
  });

  found.forEach((change) => {
    calculator.setContent(change.sheet, change.row, change.col, {
      kind: 'formula',
      ast: change.after,
    });
  });

  return found;
};

export const createRewriter = (book: Workbook, calculator: Calculator): Rewriter => ({
  formulas: (rewrite) =>
    rewriteEach(calculator, (visit) => calculator.forEachFormula(visit), rewrite),
  users: (name, rewrite) =>
    rewriteEach(calculator, (visit) => calculator.forEachUser(name, visit), rewrite),
  names: (rewrite) => {
    const changed: ShiftedName[] = [];

    book.names.forEach((defined) => {
      const after = rewrite(defined);

      if (after !== defined.ast) {
        changed.push({ name: defined.name, scope: defined.scope, before: defined.ast });
        calculator.setName(defined.name, defined.scope, after);
      }
    });

    return changed;
  },
});

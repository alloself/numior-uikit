import type { Calculator } from '../calc/calculator';
import type { ShiftedFormulaCell, ShiftedName } from '../calc/calc.types';
import type { FormulaNode } from '../formula/formula.types';
import type { DefinedName, Sheet, Workbook } from '../workbook';
import type { CellEdit, WorkbookStep } from './step.types';

export interface Rewrite extends ShiftedFormulaCell {
  readonly after: FormulaNode;
}

export interface Rewriter {
  formulas(rewrite: (sheet: Sheet, ast: FormulaNode) => FormulaNode): Rewrite[];
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

export const createRewriter = (book: Workbook, calculator: Calculator): Rewriter => ({
  formulas: (rewrite) => {
    const found: Rewrite[] = [];

    calculator.forEachFormula((sheet, row, col, before) => {
      const after = rewrite(sheet, before);

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
  },
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

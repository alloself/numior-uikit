import type { Calculator } from '../../core/calc/calculator';
import type { CellAddress } from '../../core/cell.types';
import {
  formulaRefusal,
  MAX_FORMULA_CALLS,
  MAX_FORMULA_TEXT,
} from '../../core/formula/excel-limits';
import { FormulaFailureReason, type FormulaNode } from '../../core/formula/formula.types';
import { EN_FORMULAS } from '../../core/formula/locale';
import { parseFormula } from '../../core/formula/parser';
import { printFormula } from '../../core/formula/printer';
import { findNode } from '../../core/formula/walk';
import type { Sheet, Workbook } from '../../core/workbook';
import type { XlsxLoss } from './write.types';

const NESTING: ReadonlySet<FormulaFailureReason> = new Set([
  FormulaFailureReason.Nesting,
  FormulaFailureReason.Depth,
]);

const canNest = (ast: FormulaNode): boolean => {
  let seen = 0;

  return (
    findNode(ast, () => {
      seen += 1;
      return seen > MAX_FORMULA_CALLS;
    }) !== undefined
  );
};

const tooDeep = (ast: FormulaNode, place: CellAddress): boolean => {
  if (!canNest(ast)) {
    return false;
  }

  const parsed = parseFormula(printFormula(ast, EN_FORMULAS, place), EN_FORMULAS, place);

  return !parsed.ok && NESTING.has(parsed.error.reason);
};

const tooLong = (ast: FormulaNode, place: CellAddress, written: string | undefined): boolean =>
  (written === undefined || written.length > MAX_FORMULA_TEXT) &&
  printFormula(ast, EN_FORMULAS, place).length > MAX_FORMULA_TEXT;

export const refusedByExcel = (
  calculator: Calculator,
  ast: FormulaNode,
  place: CellAddress,
  written?: string,
): boolean =>
  formulaRefusal(ast, calculator.signatures) !== undefined ||
  tooLong(ast, place, written) ||
  tooDeep(ast, place);

export const formulaLosses = (book: Workbook, calculator: Calculator): XlsxLoss[] => {
  const refused = new Set<Sheet>();

  calculator.forEachFormula((sheet, row, col, ast) => {
    if (refused.has(sheet) || !refusedByExcel(calculator, ast, { row, col })) {
      return;
    }

    refused.add(sheet);
  });

  return book.sheets.reduce<XlsxLoss[]>((losses, sheet) => {
    if (refused.has(sheet)) {
      losses.push({ sheet: sheet.name, reason: 'refused-formula' });
    }
    return losses;
  }, []);
};

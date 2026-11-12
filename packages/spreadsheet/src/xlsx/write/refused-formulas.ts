import type { Calculator } from '../../core/calc/calculator';
import type { CellAddress } from '../../core/cell.types';
import { formulaRefusal, MAX_FORMULA_TEXT } from '../../core/formula/excel-limits';
import type { FormulaNode } from '../../core/formula/formula.types';
import { EN_FORMULAS } from '../../core/formula/locale';
import { printFormula } from '../../core/formula/printer';
import type { Sheet, Workbook } from '../../core/workbook';
import type { XlsxLoss } from './write.types';

const tooLong = (ast: FormulaNode, place: CellAddress, written: string | undefined): boolean =>
  (written === undefined || written.length > MAX_FORMULA_TEXT) &&
  printFormula(ast, EN_FORMULAS, place).length > MAX_FORMULA_TEXT;

export const refusedByExcel = (
  calculator: Calculator,
  ast: FormulaNode,
  place: CellAddress,
  written?: string,
): boolean =>
  formulaRefusal(ast, (name) => calculator.functions.get(name)) !== undefined ||
  tooLong(ast, place, written);

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

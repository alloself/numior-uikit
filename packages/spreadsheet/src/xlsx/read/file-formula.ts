import type { CellAddress } from '../../core/cell.types';
import { EN_FORMULAS } from '../../core/formula/locale';
import { parseFormula } from '../../core/formula/parser';
import type { FormulaParse } from '../../core/formula/formula.types';

const FUTURE_PREFIXES = /_xl(?:fn|ws|pm)\./gu;

export const parseFileFormula = (text: string, origin?: CellAddress): FormulaParse =>
  parseFormula(text.replaceAll(FUTURE_PREFIXES, ''), EN_FORMULAS, origin);

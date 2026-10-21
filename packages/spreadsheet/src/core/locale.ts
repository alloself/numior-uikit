import { EN_FORMULAS, RU_FORMULAS } from './formula/locale';
import type { FormulaLocale } from './formula/formula.types';
import { EN_NUMBERS, RU_NUMBERS } from './format/number-locale';
import type { NumberLocale } from './format/format.types';

export interface BookLocale {
  readonly formulas: FormulaLocale;
  readonly numbers: NumberLocale;
}

export const EN_LOCALE: BookLocale = { formulas: EN_FORMULAS, numbers: EN_NUMBERS };

export const RU_LOCALE: BookLocale = { formulas: RU_FORMULAS, numbers: RU_NUMBERS };

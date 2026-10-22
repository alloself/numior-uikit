import { EN_ERRORS, RU_ERRORS } from '../error-texts';
import type { FormulaLocale } from './formula.types';
import { RU_FUNCTION_NAMES } from './function-names';

export const EN_FORMULAS: FormulaLocale = {
  argument: ',',
  decimal: '.',
  arrayColumn: ',',
  arrayRow: ';',
  defaultTable: 'Table',
  defaultColumn: 'Column',
  specials: {
    all: '#All',
    data: '#Data',
    headers: '#Headers',
    totals: '#Totals',
    row: '#This Row',
  },
  functions: {},
  trueText: 'TRUE',
  falseText: 'FALSE',
  errors: EN_ERRORS,
};

export const RU_FORMULAS: FormulaLocale = {
  argument: ';',
  decimal: ',',
  arrayColumn: '\\',
  arrayRow: ';',
  defaultTable: 'Таблица',
  defaultColumn: 'Столбец',
  specials: {
    all: '#Все',
    data: '#Данные',
    headers: '#Заголовки',
    totals: '#Итоги',
    row: '#Эта строка',
  },
  functions: RU_FUNCTION_NAMES,
  trueText: 'ИСТИНА',
  falseText: 'ЛОЖЬ',
  errors: RU_ERRORS,
};

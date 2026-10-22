import type { FormulaLocale } from './formula.types';

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
};

import type { NumberLocale } from './format.types';
import { currencyFormat } from './number-locale';

const FIXED: Readonly<Record<number, string>> = {
  0: 'General',
  1: '0',
  2: '0.00',
  3: '#,##0',
  4: '#,##0.00',
  9: '0%',
  10: '0.00%',
  11: '0.00E+00',
  12: '# ?/?',
  13: '# ??/??',
  15: 'd-mmm-yy',
  16: 'd-mmm',
  17: 'mmm-yy',
  18: 'h:mm AM/PM',
  19: 'h:mm:ss AM/PM',
  20: 'h:mm',
  21: 'h:mm:ss',
  37: '#,##0 ;(#,##0)',
  38: '#,##0 ;[Red](#,##0)',
  39: '#,##0.00;(#,##0.00)',
  40: '#,##0.00;[Red](#,##0.00)',
  45: 'mm:ss',
  46: '[h]:mm:ss',
  47: 'mmss.0',
  48: '##0.0E+0',
  49: '@',
};

export const builtinFormat = (id: number, locale: NumberLocale): string | undefined => {
  switch (id) {
    case 14:
      return locale.shortDate;
    case 22:
      return `${locale.shortDate} h:mm`;
    case 5:
    case 6:
    case 7:
    case 8:
      return currencyFormat(locale, id === 5 || id === 6 ? 0 : 2);
    default:
      return FIXED[id];
  }
};

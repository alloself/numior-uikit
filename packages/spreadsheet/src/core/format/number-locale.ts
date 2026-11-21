import { EN_ERRORS, RU_ERRORS } from '../error-texts';
import type { NumberLocale } from './format.types';

export const EN_NUMBERS: NumberLocale = {
  name: 'en',
  decimal: '.',
  group: ',',
  months: [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ],
  monthsShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  daysShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  am: 'AM',
  pm: 'PM',
  trueText: 'TRUE',
  falseText: 'FALSE',
  errors: EN_ERRORS,
  dateOrder: 'mdy',
  shortDate: 'm/d/yyyy',
  namedDate: 'd-mmm-yy',
  monthDate: 'mmm-yy',
  dayMonth: 'd-mmm',
  longDate: 'dddd, mmmm d, yyyy',
  shortTime: 'h:mm AM/PM',
  longTime: 'h:mm:ss AM/PM',
  currencyPositive: '"$"#',
  currencyNegative: '("$"#)',
  currencySymbols: ['$'],
  generalName: 'General',
};

export const RU_NUMBERS: NumberLocale = {
  name: 'ru',
  decimal: ',',
  group: ' ',
  months: [
    'Январь',
    'Февраль',
    'Март',
    'Апрель',
    'Май',
    'Июнь',
    'Июль',
    'Август',
    'Сентябрь',
    'Октябрь',
    'Ноябрь',
    'Декабрь',
  ],
  monthsShort: ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'],
  days: ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'],
  daysShort: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'],
  am: 'AM',
  pm: 'PM',
  trueText: 'ИСТИНА',
  falseText: 'ЛОЖЬ',
  errors: RU_ERRORS,
  dateOrder: 'dmy',
  shortDate: 'dd.mm.yyyy',
  namedDate: 'dd.mmm.yy',
  monthDate: 'mmm.yy',
  dayMonth: 'dd.mmm',
  longDate: '[$-FC19]d mmmm yyyy "г."',
  shortTime: 'h:mm',
  longTime: 'h:mm:ss',
  currencyPositive: '#\\ "₽"',
  currencyNegative: '-#\\ "₽"',
  currencySymbols: ['₽', 'руб.', 'р.'],
  generalName: 'Основной',
};

const DATED = new WeakMap<NumberLocale, NumberLocale>();

export const withYear = (locale: NumberLocale, year: number): NumberLocale => {
  const known = locale.year === year ? locale : DATED.get(locale);

  if (known?.year === year) {
    return known;
  }

  const dated = { ...locale, year };

  DATED.set(locale, dated);
  return dated;
};

const RU_GENITIVE_NUMBERS: NumberLocale = {
  ...RU_NUMBERS,
  months: [
    'января',
    'февраля',
    'марта',
    'апреля',
    'мая',
    'июня',
    'июля',
    'августа',
    'сентября',
    'октября',
    'ноября',
    'декабря',
  ],
};

const LANGUAGE = 0x3ff;

const GENITIVE = 0xfc00;

const BY_LANGUAGE: Readonly<Record<number, NumberLocale>> = {
  0x09: EN_NUMBERS,
  0x19: RU_NUMBERS,
};

const GENITIVE_BY_LANGUAGE: Readonly<Record<number, NumberLocale>> = {
  0x19: RU_GENITIVE_NUMBERS,
};

export const numberLocaleOf = (lcid: number): NumberLocale | undefined => {
  const id = lcid & 0xffff;
  const genitive = (id & GENITIVE) === GENITIVE ? GENITIVE_BY_LANGUAGE[id & LANGUAGE] : undefined;

  return genitive ?? BY_LANGUAGE[id & LANGUAGE];
};

export const currencyFormat = (locale: NumberLocale, decimals: number): string => {
  const digits = decimals > 0 ? `#,##0.${'0'.repeat(decimals)}` : '#,##0';

  return `${locale.currencyPositive.replace('#', digits)};${locale.currencyNegative.replace('#', digits)}`;
};

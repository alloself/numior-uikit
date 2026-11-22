import { daysInMonth, serialOfDate, timeSerial } from '../calc/serials';
import { DateOrder, type NumberLocale } from './format.types';

export interface DateText {
  readonly date: number | undefined;
  readonly time: number | undefined;
  readonly format: string;
}

interface Clock {
  readonly time: number;
  readonly format: string;
}

interface DateRead {
  readonly serial: number;
  readonly format: string;
  readonly timed: string;
}

const TIME = /^(\d{1,2}):(\d{1,2})(?::(\d{1,2}(?:[.,]\d+)?))?\s*([ap]\.?m\.?)?$/iu;

const TIME_TAIL = /\s+(\d{1,2}:\d{1,2}(?::\d{1,2}(?:[.,]\d+)?)?(?:\s*[ap]\.?m\.?)?)$/iu;

const ISO = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/u;

const NUMERIC = /^(\d{1,2})([./-])(\d{1,2})\2(\d{2,4})$/u;

const DAY_NAMED = /^(\d{1,2})[-\s.]+(\p{L}+)\.?[-\s.,]+(\d{2,4})$/iu;

const NAMED_DAY = /^(\p{L}+)\.?\s+(\d{1,2}),?\s+(\d{2,4})$/iu;

const MONTH_YEAR = /^(\p{L}+)\.?[-\s./]+(\d{1,2}|\d{4})$/iu;

const MONTH_NUMBER = /^(\d{1,2})\s*[./-]\s*(\d{2}|\d{4})$/u;

const NO_YEAR = '00';

const LEADING_SPACE = /^\s/u;

const DAY_MONTH = /^(\d{1,2})\s*([./-])\s*(\d{1,2})$/u;

const DAY_NAME = /^(\d{1,2})[-\s.]*(\p{L}+)$/iu;

const NAME_DAY = /^(\p{L}+)\.?[-\s./]+(\d{1,2})$/iu;

const fullYear = (text: string): number => {
  const year = Number(text);

  if (text.length > 2) {
    return year;
  }
  return year < 30 ? 2000 + year : 1900 + year;
};

const MONTH_PREFIX = 3;

const monthOf = (name: string, locale: NumberLocale): number | undefined => {
  const lower = name.toLocaleLowerCase(locale.name);

  if (lower.length < MONTH_PREFIX) {
    return undefined;
  }

  const index = locale.months.findIndex((month) =>
    month.toLocaleLowerCase(locale.name).startsWith(lower),
  );

  return index < 0 ? undefined : index + 1;
};

const validDate = (year: number, month: number | undefined, day: number): number | undefined =>
  month === undefined ||
  month < 1 ||
  month > 12 ||
  day < 1 ||
  year < 1900 ||
  year > 9999 ||
  day > daysInMonth(year, month)
    ? undefined
    : serialOfDate(year, month, day);

const inOrder = (
  year: number,
  first: number,
  second: number,
  locale: NumberLocale,
): number | undefined =>
  locale.dateOrder === DateOrder.Mdy
    ? validDate(year, first, second)
    : validDate(year, second, first);

const numericDate = (text: string, locale: NumberLocale): number | undefined => {
  const found = NUMERIC.exec(text);

  return found === null
    ? undefined
    : inOrder(fullYear(found[4] ?? ''), Number(found[1]), Number(found[3]), locale);
};

const namedDay = (text: string, locale: NumberLocale): number | undefined => {
  const found = locale.dateOrder === DateOrder.Mdy ? NAMED_DAY.exec(text) : null;

  return found === null
    ? undefined
    : validDate(fullYear(found[3] ?? ''), monthOf(found[1] ?? '', locale), Number(found[2]));
};

const namedDate = (text: string, locale: NumberLocale): number | undefined => {
  const dayNamed = DAY_NAMED.exec(text);

  return dayNamed === null
    ? namedDay(text, locale)
    : validDate(
        fullYear(dayNamed[3] ?? ''),
        monthOf(dayNamed[2] ?? '', locale),
        Number(dayNamed[1]),
      );
};

const numericMonth = (text: string): number | undefined => {
  const found = MONTH_NUMBER.exec(text);
  const year = found?.[2];

  return found === null || year === undefined || year === NO_YEAR
    ? undefined
    : validDate(fullYear(year), Number(found[1]), 1);
};

const monthYear = (text: string, locale: NumberLocale): number | undefined => {
  const found = MONTH_YEAR.exec(text);

  return found === null
    ? numericMonth(text)
    : validDate(fullYear(found[2] ?? ''), monthOf(found[1] ?? '', locale), 1);
};

const namedInYear = (text: string, year: number, locale: NumberLocale): number | undefined => {
  const dayName = DAY_NAME.exec(text);

  const nameDay =
    dayName === null && locale.dateOrder === DateOrder.Mdy ? NAME_DAY.exec(text) : null;

  if (dayName !== null) {
    return validDate(year, monthOf(dayName[2] ?? '', locale), Number(dayName[1]));
  }
  return nameDay === null
    ? undefined
    : validDate(year, monthOf(nameDay[1] ?? '', locale), Number(nameDay[2]));
};

const dateInYear = (text: string, locale: NumberLocale): number | undefined => {
  const year = locale.year;
  const numeric = DAY_MONTH.exec(text);

  if (year === undefined) {
    return undefined;
  }
  return numeric === null
    ? namedInYear(text, year, locale)
    : inOrder(year, Number(numeric[1]), Number(numeric[3]), locale);
};

const read = (serial: number | undefined, format: string, timed = format): DateRead | undefined =>
  serial === undefined ? undefined : { serial, format, timed };

const dateOf = (text: string, locale: NumberLocale): DateRead | undefined => {
  const iso = ISO.exec(text);

  const numeric =
    iso === null
      ? numericDate(text, locale)
      : validDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));

  return (
    read(numeric, locale.shortDate) ??
    read(namedDate(text, locale), locale.namedDate, locale.shortDate) ??
    read(dateInYear(text, locale), locale.dayMonth, locale.shortDate) ??
    read(monthYear(text, locale), locale.monthDate, locale.shortDate)
  );
};

const MAX_HOURS = 9999;

const clockFormat = (seconds: boolean, half: boolean, elapsed: boolean): string =>
  `${elapsed ? '[h]' : 'h'}:mm${seconds ? ':ss' : ''}${half ? ' AM/PM' : ''}`;

const timeOf = (text: string, elapsed: boolean): Clock | undefined => {
  const found = TIME.exec(text);

  if (found === null) {
    return undefined;
  }

  const hours = Number(found[1]);
  const minutes = Number(found[2]);
  const seconds = Number((found[3] ?? '0').replace(',', '.'));
  const half = found[4];

  if (minutes > 59 || seconds >= 60 || (half !== undefined && (hours < 1 || hours > 12))) {
    return undefined;
  }

  const day = half === undefined ? hours : (hours % 12) + (/^p/iu.test(half) ? 12 : 0);

  return day > (elapsed ? MAX_HOURS : 23)
    ? undefined
    : {
        time: timeSerial(day, minutes, seconds),
        format: clockFormat(found[3] !== undefined, half !== undefined, day > 23),
      };
};

export const readDateText = (raw: string, locale: NumberLocale): DateText | undefined => {
  if (LEADING_SPACE.test(raw)) {
    return undefined;
  }

  const text = raw.trimEnd();
  const clock = timeOf(text, true);

  if (clock !== undefined) {
    return { date: undefined, time: clock.time, format: clock.format };
  }

  const tail = TIME_TAIL.exec(text);
  const date = dateOf((tail === null ? text : text.slice(0, tail.index)).trim(), locale);
  const tailClock = tail === null ? undefined : timeOf(tail[1] ?? '', false);

  if (date === undefined || (tail !== null && tailClock === undefined)) {
    return undefined;
  }
  return {
    date: date.serial,
    time: tailClock?.time,
    format: tailClock === undefined ? date.format : `${date.timed} ${tailClock.format}`,
  };
};

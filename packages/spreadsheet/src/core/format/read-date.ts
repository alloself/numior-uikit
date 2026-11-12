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

const TIME = /^(\d{1,2}):(\d{1,2})(?::(\d{1,2}(?:[.,]\d+)?))?\s*([ap]\.?m\.?)?$/iu;

const TIME_TAIL = /\s+(\d{1,2}:\d{1,2}(?::\d{1,2}(?:[.,]\d+)?)?(?:\s*[ap]\.?m\.?)?)$/iu;

const ISO = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/u;

const NUMERIC = /^(\d{1,2})([./-])(\d{1,2})\2(\d{2,4})$/u;

const DAY_NAMED = /^(\d{1,2})[-\s.]+(\p{L}+)\.?[-\s.,]+(\d{2,4})$/iu;

const NAMED_DAY = /^(\p{L}+)\.?\s+(\d{1,2}),?\s+(\d{2,4})$/iu;

const MONTH_YEAR = /^(\p{L}+)\.?[-\s.]+(\d{4})$/iu;

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

const numericDate = (text: string, locale: NumberLocale): number | undefined => {
  const found = NUMERIC.exec(text);

  if (found === null) {
    return undefined;
  }

  const first = Number(found[1]);
  const second = Number(found[3]);
  const year = fullYear(found[4] ?? '');

  return locale.dateOrder === DateOrder.Mdy
    ? validDate(year, first, second)
    : validDate(year, second, first);
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

const monthYear = (text: string, locale: NumberLocale): number | undefined => {
  const found = MONTH_YEAR.exec(text);

  return found === null
    ? undefined
    : validDate(Number(found[2]), monthOf(found[1] ?? '', locale), 1);
};

const dateOf = (text: string, locale: NumberLocale): readonly [number, string] | undefined => {
  const iso = ISO.exec(text);

  const numeric =
    iso === null
      ? numericDate(text, locale)
      : validDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));

  if (numeric !== undefined) {
    return [numeric, locale.shortDate];
  }

  const named = namedDate(text, locale);

  if (named !== undefined) {
    return [named, locale.namedDate];
  }

  const month = monthYear(text, locale);

  return month === undefined ? undefined : [month, locale.monthDate];
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
  const text = raw.trim();
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
    date: date[0],
    time: tailClock?.time,
    format: tailClock === undefined ? date[1] : `${date[1]} ${tailClock.format}`,
  };
};

import { daysInMonth, serialOfDate } from '../calc/serials';
import type { NumberLocale } from './format.types';
import { EN_NUMBERS } from './number-locale';

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

const NAMED_FORMAT = 'd mmm yyyy';

const fullYear = (text: string): number => {
  const year = Number(text);

  if (text.length > 2) {
    return year;
  }
  return year < 30 ? 2000 + year : 1900 + year;
};

const formsOf = (locale: NumberLocale, index: number): string[] =>
  [EN_NUMBERS, locale].flatMap((source) =>
    [source.monthsShort[index], source.months[index], source.monthsGenitive[index]].flatMap(
      (form) => (form === undefined ? [] : [form.toLowerCase()]),
    ),
  );

const monthOf = (name: string, locale: NumberLocale): number | undefined => {
  const lower = name.toLowerCase();

  if (lower.length < 3) {
    return undefined;
  }

  const index = Array.from({ length: 12 }, (_, month) => month).find((month) =>
    formsOf(locale, month).some((form) => form.startsWith(lower) || lower.startsWith(form)),
  );

  return index === undefined ? undefined : index + 1;
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

  return locale.dateOrder === 'mdy'
    ? validDate(year, first, second)
    : validDate(year, second, first);
};

const namedDate = (text: string, locale: NumberLocale): number | undefined => {
  const dayNamed = DAY_NAMED.exec(text);

  if (dayNamed !== null) {
    return validDate(
      fullYear(dayNamed[3] ?? ''),
      monthOf(dayNamed[2] ?? '', locale),
      Number(dayNamed[1]),
    );
  }

  const namedDay = NAMED_DAY.exec(text);

  return namedDay === null
    ? undefined
    : validDate(
        fullYear(namedDay[3] ?? ''),
        monthOf(namedDay[1] ?? '', locale),
        Number(namedDay[2]),
      );
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

  return named === undefined ? undefined : [named, NAMED_FORMAT];
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
        time: (day * 3600 + minutes * 60 + seconds) / 86_400,
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

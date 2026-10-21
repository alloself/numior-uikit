import { daysInMonth, serialOfDate } from './serials';

export interface DateText {
  readonly date: number | undefined;
  readonly time: number | undefined;
}

const MONTHS = [
  'jan',
  'feb',
  'mar',
  'apr',
  'may',
  'jun',
  'jul',
  'aug',
  'sep',
  'oct',
  'nov',
  'dec',
] as const;

const TIME = /^(\d{1,2}):(\d{1,2})(?::(\d{1,2}(?:\.\d+)?))?\s*([ap]\.?m\.?)?$/iu;

const ISO = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/u;

const DOTTED = /^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/u;

const SLASHED = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/u;

const DAY_NAMED = /^(\d{1,2})[-\s]([a-z]+)\.?[-\s,]+(\d{2,4})$/iu;

const NAMED_DAY = /^([a-z]+)\.?\s+(\d{1,2}),?\s+(\d{2,4})$/iu;

const fullYear = (text: string): number => {
  const year = Number(text);

  if (text.length > 2) {
    return year;
  }
  return year < 30 ? 2000 + year : 1900 + year;
};

const monthOf = (name: string): number | undefined => {
  const index = MONTHS.findIndex((month) => name.toLowerCase().startsWith(month));

  return index < 0 || name.length < 3 ? undefined : index + 1;
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

const dateOf = (text: string): number | undefined => {
  const iso = ISO.exec(text);

  if (iso !== null) {
    return validDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  }

  const dotted = DOTTED.exec(text);

  if (dotted !== null) {
    return validDate(fullYear(dotted[3] ?? ''), Number(dotted[2]), Number(dotted[1]));
  }

  const slashed = SLASHED.exec(text);

  if (slashed !== null) {
    return validDate(fullYear(slashed[3] ?? ''), Number(slashed[1]), Number(slashed[2]));
  }

  const dayNamed = DAY_NAMED.exec(text);

  if (dayNamed !== null) {
    return validDate(fullYear(dayNamed[3] ?? ''), monthOf(dayNamed[2] ?? ''), Number(dayNamed[1]));
  }

  const namedDay = NAMED_DAY.exec(text);

  return namedDay === null
    ? undefined
    : validDate(fullYear(namedDay[3] ?? ''), monthOf(namedDay[1] ?? ''), Number(namedDay[2]));
};

const timeOf = (text: string): number | undefined => {
  const found = TIME.exec(text);

  if (found === null) {
    return undefined;
  }

  const hours = Number(found[1]);
  const minutes = Number(found[2]);
  const seconds = Number(found[3] ?? 0);
  const half = found[4]?.toLowerCase().startsWith('p');

  if (minutes > 59 || seconds >= 60 || (found[4] !== undefined && (hours < 1 || hours > 12))) {
    return undefined;
  }

  const day = found[4] === undefined ? hours : (hours % 12) + (half === true ? 12 : 0);

  return day > 23 ? undefined : (day * 3600 + minutes * 60 + seconds) / 86_400;
};

const TIME_TAIL = /\s+(\d{1,2}:\d{1,2}(?::\d{1,2}(?:\.\d+)?)?(?:\s*[ap]\.?m\.?)?)$/iu;

export const readDateText = (raw: string): DateText | undefined => {
  const text = raw.trim();
  const time = timeOf(text);

  if (time !== undefined) {
    return { date: undefined, time };
  }

  const tail = TIME_TAIL.exec(text);
  const datePart = tail === null ? text : text.slice(0, tail.index);
  const date = dateOf(datePart.trim());
  const clock = tail === null ? undefined : timeOf(tail[1] ?? '');

  if (date === undefined || (tail !== null && clock === undefined)) {
    return undefined;
  }
  return { date, time: clock };
};

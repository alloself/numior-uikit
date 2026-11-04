import { civilOf, mondayIndex, type CivilDate } from '../calc/serials';
import { DateUnit, FormatTokenKind, type FormatToken, type NumberLocale } from './format.types';
import { createOutput, type Output } from './output';

type DateToken = Extract<FormatToken, { kind: typeof FormatTokenKind.Date }>;

interface Moment {
  readonly date: CivilDate;
  readonly weekday: number;
  readonly days: number;
  readonly seconds: number;
  readonly ticks: number;
  readonly precision: number;
}

const DAY_SECONDS = 86_400;

const LAST_SERIAL = 2_958_466;

const two = (value: number): string => String(value).padStart(2, '0');

const precisionOf = (tokens: readonly FormatToken[]): number =>
  tokens.reduce(
    (widest, token) =>
      token.kind === FormatTokenKind.Date && token.unit === DateUnit.Subsecond
        ? Math.max(widest, Math.min(token.width, 3))
        : widest,
    0,
  );

const momentOf = (serial: number, precision: number): Moment | undefined => {
  const scale = 10 ** precision;
  const total = Math.round(serial * DAY_SECONDS * scale);
  const days = Math.floor(total / (DAY_SECONDS * scale));

  if (serial < 0 || days >= LAST_SERIAL) {
    return undefined;
  }

  const within = total - days * DAY_SECONDS * scale;

  return {
    date: civilOf(days),
    weekday: (mondayIndex(days) + 1) % 7,
    days,
    seconds: Math.floor(within / scale),
    ticks: within % scale,
    precision,
  };
};

const dayBefore = (tokens: readonly FormatToken[], index: number): boolean =>
  tokens
    .slice(0, index)
    .some(
      (token) =>
        token.kind === FormatTokenKind.Date && token.unit === DateUnit.Day && token.width <= 2,
    );

const monthText = (
  width: number,
  month: number,
  locale: NumberLocale,
  genitive: boolean,
): string => {
  const index = month - 1;

  switch (width) {
    case 1:
      return String(month);
    case 2:
      return two(month);
    case 3:
      return locale.monthsShort[index] ?? '';
    case 5:
      return (locale.months[index] ?? '').charAt(0);
    default:
      return (genitive ? locale.monthsGenitive : locale.months)[index] ?? '';
  }
};

const dayText = (width: number, moment: Moment, locale: NumberLocale): string => {
  switch (width) {
    case 1:
      return String(moment.date.day);
    case 2:
      return two(moment.date.day);
    case 3:
      return locale.daysShort[moment.weekday] ?? '';
    default:
      return locale.days[moment.weekday] ?? '';
  }
};

const hourOf = (moment: Moment, twelve: boolean): number => {
  const hour = Math.floor(moment.seconds / 3600);

  return twelve ? ((hour + 11) % 12) + 1 : hour;
};

const ampmText = (code: string, moment: Moment, locale: NumberLocale): string => {
  const morning = moment.seconds < 12 * 3600;

  if (code.length === 3) {
    return morning ? code.charAt(0) : code.charAt(2);
  }

  const text = morning ? locale.am : locale.pm;

  return code === code.toLowerCase() ? text.toLowerCase() : text;
};

const sized = (value: number, width: number): string => String(value).padStart(width, '0');

const elapsedText = (unit: DateUnit, width: number, moment: Moment): string => {
  const seconds = moment.days * DAY_SECONDS + moment.seconds;

  switch (unit) {
    case DateUnit.Hours:
      return sized(Math.floor(seconds / 3600), width);
    case DateUnit.Minutes:
      return sized(Math.floor(seconds / 60), width);
    default:
      return sized(seconds, width);
  }
};

const clockText = (
  token: DateToken,
  moment: Moment,
  twelve: boolean,
  locale: NumberLocale,
): string => {
  switch (token.unit) {
    case DateUnit.Hour:
      return sized(hourOf(moment, twelve), Math.min(token.width, 2));
    case DateUnit.Minute:
      return sized(Math.floor((moment.seconds % 3600) / 60), Math.min(token.width, 2));
    case DateUnit.Second:
      return sized(moment.seconds % 60, Math.min(token.width, 2));
    case DateUnit.Subsecond:
      return (
        locale.decimal +
        sized(moment.ticks, moment.precision).slice(0, token.width).padEnd(token.width, '0')
      );
    case DateUnit.Ampm:
      return ampmText(token.code, moment, locale);
    default:
      return elapsedText(token.unit, token.width, moment);
  }
};

const dateText = (
  tokens: readonly FormatToken[],
  index: number,
  token: DateToken,
  moment: Moment,
  locale: NumberLocale,
): string | undefined => {
  switch (token.unit) {
    case DateUnit.Year:
      return token.width <= 2 ? two(moment.date.year % 100) : String(moment.date.year);
    case DateUnit.Month:
      return monthText(
        token.width > 5 ? 4 : token.width,
        moment.date.month,
        locale,
        dayBefore(tokens, index),
      );
    case DateUnit.Day:
      return dayText(token.width, moment, locale);
    default:
      return undefined;
  }
};

export const formatDateSection = (
  tokens: readonly FormatToken[],
  serial: number,
  locale: NumberLocale,
): Output | undefined => {
  const moment = momentOf(serial, precisionOf(tokens));

  if (moment === undefined) {
    return undefined;
  }

  const output = createOutput();

  const twelve = tokens.some(
    (token) => token.kind === FormatTokenKind.Date && token.unit === DateUnit.Ampm,
  );

  tokens.forEach((token, index) => {
    if (token.kind === FormatTokenKind.Date) {
      output.push(
        dateText(tokens, index, token, moment, locale) ?? clockText(token, moment, twelve, locale),
      );
    } else if (token.kind === FormatTokenKind.Fill) {
      output.fill(token.char);
    } else if (token.kind === FormatTokenKind.Literal) {
      output.push(token.text);
    }
  });

  return output;
};

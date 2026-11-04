import { numberValue } from '../values';
import { DatedifUnit, type FunctionArgs, type FunctionSpec } from './calc.types';
import { raise } from './coerce';
import { readDateText } from '../format/read-date';
import { days360, yearFraction } from './day-counts';
import { defineFunction } from './registry';
import {
  civilOf,
  dateArgument,
  daysInMonth,
  mondayIndex,
  secondsOfDay,
  serialOfDate,
} from './serials';
import { networkDays, weekendMask, workday } from './workdays';
import { CellValueKind } from '../cell.types';

const serialArg = (args: FunctionArgs, index: number): number => {
  const value = args.scalar(index);

  if (value.kind !== CellValueKind.String) {
    return args.number(index);
  }

  const read = readDateText(value.value, args.locale);

  return read === undefined ? raise('#VALUE!') : (read.date ?? 0) + (read.time ?? 0);
};

const holidaysOf = (args: FunctionArgs, index: number): Set<number> => {
  const holidays = new Set<number>();

  if (args.missing(index)) {
    return holidays;
  }

  args.forEachValue(
    index,
    (value) => {
      switch (value.kind) {
        case CellValueKind.Number:
          holidays.add(Math.floor(value.value));
          break;
        case CellValueKind.String:
          holidays.add(
            Math.floor(readDateText(value.value, args.locale)?.date ?? raise('#VALUE!')),
          );

          break;
        case CellValueKind.Error:
          raise(value.code);
          break;
        case CellValueKind.Boolean:
          raise('#VALUE!');
          break;
        case CellValueKind.Empty:
          break;
      }
    },
    index + 1,
  );

  return holidays;
};

const dated = (
  name: string,
  max: number,
  compute: (args: FunctionArgs) => number,
  min = max,
): FunctionSpec =>
  defineFunction({
    name,
    min,
    max,
    lift: Array.from({ length: max }, (_, index) => index),
    evaluate: (args) => numberValue(compute(args)),
  });

const WEEK_STARTS: Readonly<Record<number, number>> = { 1: 6, 2: 0, 21: 0 };

const weekStart = (type: number): number => {
  const start = WEEK_STARTS[type] ?? (type >= 11 && type <= 17 ? type - 11 : undefined);

  return start ?? raise('#NUM!');
};

const weekday = (serial: number, type: number): number => {
  const index = mondayIndex(serial);

  switch (type) {
    case 1:
      return ((index + 1) % 7) + 1;
    case 2:
      return index + 1;
    case 3:
      return index;
    default:
      return type >= 11 && type <= 17 ? ((index - (type - 11) + 7) % 7) + 1 : raise('#NUM!');
  }
};

const isoWeek = (serial: number): number => {
  const thursday = Math.floor(serial) - mondayIndex(serial) + 3;
  const { year } = civilOf(thursday);

  return Math.floor((thursday - serialOfDate(year, 1, 1)) / 7) + 1;
};

const weekNumber = (serial: number, type: number): number => {
  if (type === 21) {
    return isoWeek(serial);
  }

  const start = weekStart(type);
  const firstDay = serialOfDate(civilOf(serial).year, 1, 1);
  const offset = (mondayIndex(firstDay) - start + 7) % 7;

  return Math.floor((Math.floor(serial) - firstDay + offset) / 7) + 1;
};

const shiftedMonth = (serial: number, months: number, endOfMonth: boolean): number => {
  const { year, month, day } = civilOf(serial);
  const target = month + Math.trunc(months);

  if (endOfMonth) {
    return serialOfDate(year, target + 1, 1) - 1;
  }

  const first = serialOfDate(year, target, 1);
  const { year: targetYear, month: targetMonth } = civilOf(first);

  return first + Math.min(day, daysInMonth(targetYear, targetMonth)) - 1;
};

const monthsBetween = (from: number, to: number): number => {
  const start = civilOf(from);
  const end = civilOf(to);

  return (end.year - start.year) * 12 + (end.month - start.month) - Number(end.day < start.day);
};

const sameDayBefore = (from: number, to: number): number => {
  const start = civilOf(from);
  const end = civilOf(to);
  const thisYear = serialOfDate(end.year, start.month, start.day);

  return thisYear <= to ? thisYear : serialOfDate(end.year - 1, start.month, start.day);
};

const dayDifference = (from: number, to: number): number => {
  const start = civilOf(from);
  const end = civilOf(to);

  if (end.day >= start.day) {
    return end.day - start.day;
  }

  const previous = civilOf(serialOfDate(end.year, end.month, 0));

  return daysInMonth(previous.year, previous.month) - start.day + end.day;
};

const dateDifference = (first: number, second: number, unit: string): number => {
  const from = Math.floor(first);
  const to = Math.floor(second);

  if (from > to) {
    return raise('#NUM!');
  }

  switch (unit.toUpperCase()) {
    case DatedifUnit.Y:
      return Math.floor(monthsBetween(from, to) / 12);
    case DatedifUnit.M:
      return monthsBetween(from, to);
    case DatedifUnit.D:
      return to - from;
    case DatedifUnit.YM:
      return monthsBetween(from, to) % 12;
    case DatedifUnit.MD:
      return dayDifference(from, to);
    case DatedifUnit.YD:
      return to - sameDayBefore(from, to);
    default:
      return raise('#NUM!');
  }
};

const timeOfParts = (hours: number, minutes: number, seconds: number): number => {
  const total = Math.trunc(hours) * 3600 + Math.trunc(minutes) * 60 + Math.trunc(seconds);

  return total < 0 ? raise('#NUM!') : (total % 86_400) / 86_400;
};

const textDate = (args: FunctionArgs): number => {
  const read = readDateText(args.text(0), args.locale);

  return read?.date ?? raise('#VALUE!');
};

const textTime = (args: FunctionArgs): number => {
  const read = readDateText(args.text(0), args.locale);

  return read === undefined ? raise('#VALUE!') : (read.time ?? 0) % 1;
};

export const DATE_FUNCTIONS: readonly FunctionSpec[] = [
  dated('DATE', 3, (args) =>
    serialOfDate(
      dateArgument(args.number(0)),
      Math.trunc(args.number(1)),
      Math.trunc(args.number(2)),
    ),
  ),
  dated('TIME', 3, (args) => timeOfParts(args.number(0), args.number(1), args.number(2))),
  dated('DATEVALUE', 1, textDate),
  dated('TIMEVALUE', 1, textTime),
  dated('YEAR', 1, (args) => civilOf(serialArg(args, 0)).year),
  dated('MONTH', 1, (args) => civilOf(serialArg(args, 0)).month),
  dated('DAY', 1, (args) => civilOf(serialArg(args, 0)).day),
  dated('HOUR', 1, (args) => Math.floor(secondsOfDay(serialArg(args, 0)) / 3600)),
  dated('MINUTE', 1, (args) => Math.floor((secondsOfDay(serialArg(args, 0)) % 3600) / 60)),
  dated('SECOND', 1, (args) => secondsOfDay(serialArg(args, 0)) % 60),
  dated('WEEKDAY', 2, (args) => weekday(serialArg(args, 0), Math.trunc(args.number(1, 1))), 1),
  dated('WEEKNUM', 2, (args) => weekNumber(serialArg(args, 0), Math.trunc(args.number(1, 1))), 1),
  dated('ISOWEEKNUM', 1, (args) => isoWeek(serialArg(args, 0))),
  dated('EDATE', 2, (args) => shiftedMonth(serialArg(args, 0), args.number(1), false)),
  dated('EOMONTH', 2, (args) => shiftedMonth(serialArg(args, 0), args.number(1), true)),
  dated('DAYS', 2, (args) => Math.floor(serialArg(args, 0)) - Math.floor(serialArg(args, 1))),
  dated(
    'DAYS360',
    3,
    (args) =>
      days360(
        Math.floor(serialArg(args, 0)),
        Math.floor(serialArg(args, 1)),
        args.logical(2, false),
      ),
    2,
  ),
  dated('DATEDIF', 3, (args) =>
    dateDifference(serialArg(args, 0), serialArg(args, 1), args.text(2)),
  ),
  dated(
    'YEARFRAC',
    3,
    (args) => yearFraction(serialArg(args, 0), serialArg(args, 1), args.number(2, 0)),
    2,
  ),
  defineFunction({
    name: 'NETWORKDAYS',
    min: 2,
    max: 3,
    lift: [0, 1],
    evaluate: (args) =>
      numberValue(
        networkDays(
          serialArg(args, 0),
          serialArg(args, 1),
          weekendMask(undefined),
          holidaysOf(args, 2),
        ),
      ),
  }),
  defineFunction({
    name: 'NETWORKDAYS.INTL',
    min: 2,
    max: 4,
    lift: [0, 1],
    evaluate: (args) =>
      numberValue(
        networkDays(
          serialArg(args, 0),
          serialArg(args, 1),
          weekendMask(args.missing(2) ? undefined : args.scalar(2)),
          holidaysOf(args, 3),
        ),
      ),
  }),
  defineFunction({
    name: 'WORKDAY',
    min: 2,
    max: 3,
    lift: [0, 1],
    evaluate: (args) =>
      numberValue(
        workday(serialArg(args, 0), args.number(1), weekendMask(undefined), holidaysOf(args, 2)),
      ),
  }),
  defineFunction({
    name: 'WORKDAY.INTL',
    min: 2,
    max: 4,
    lift: [0, 1],
    evaluate: (args) =>
      numberValue(
        workday(
          serialArg(args, 0),
          args.number(1),
          weekendMask(args.missing(2) ? undefined : args.scalar(2)),
          holidaysOf(args, 3),
        ),
      ),
  }),
];

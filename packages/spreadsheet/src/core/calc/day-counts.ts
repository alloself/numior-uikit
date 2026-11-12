import { raise } from './coerce';
import { civilOf, daysInMonth, isLeapYear, serialOfDate, type CivilDate } from './serials';

const lastOfMonth = (date: CivilDate): boolean => date.day === daysInMonth(date.year, date.month);

const span360 = (start: CivilDate, end: CivilDate, startDay: number, endDay: number): number =>
  (end.year - start.year) * 360 + (end.month - start.month) * 30 + (endDay - startDay);

export const days360 = (from: number, to: number, european: boolean): number => {
  const start = civilOf(from);
  const end = civilOf(to);

  if (european) {
    return span360(start, end, Math.min(start.day, 30), Math.min(end.day, 30));
  }

  const startDay = lastOfMonth(start) ? 30 : start.day;

  if (end.day !== 31) {
    return span360(start, end, startDay, end.day);
  }
  return startDay < 30
    ? span360(start, { ...end, month: end.month + 1 }, startDay, 1)
    : span360(start, end, startDay, 30);
};

const usDays = (start: CivilDate, end: CivilDate): readonly [number, number] => {
  if (start.day === 31) {
    return [30, end.day === 31 ? 30 : end.day];
  }
  if (start.day === 30 && end.day === 31) {
    return [30, 30];
  }

  const februaryEnd = start.month === 2 && lastOfMonth(start);

  if (februaryEnd && end.month === 2 && lastOfMonth(end)) {
    return [30, 30];
  }
  return [februaryEnd ? 30 : start.day, end.day];
};

const febTwentyNinthBetween = (start: CivilDate, from: number, to: number): boolean => {
  for (let year = start.year; year <= civilOf(to).year; year += 1) {
    if (!isLeapYear(year)) {
      continue;
    }

    const leapDay = serialOfDate(year, 2, 29);

    if (leapDay >= from && leapDay <= to) {
      return true;
    }
  }
  return false;
};

const actualActual = (from: number, to: number): number => {
  const start = civilOf(from);
  const end = civilOf(to);

  const withinYear =
    start.year === end.year ||
    (start.year + 1 === end.year &&
      (start.month > end.month || (start.month === end.month && start.day >= end.day)));

  if (withinYear) {
    const length =
      (start.year === end.year && isLeapYear(start.year)) ||
      febTwentyNinthBetween(start, from, to) ||
      (end.month === 2 && end.day === 29)
        ? 366
        : 365;

    return (to - from) / length;
  }

  const years = end.year - start.year + 1;
  const days = serialOfDate(end.year + 1, 1, 1) - serialOfDate(start.year, 1, 1);

  return (to - from) / (days / years);
};

export const yearFraction = (first: number, second: number, basis: number): number => {
  const from = Math.floor(Math.min(first, second));
  const to = Math.floor(Math.max(first, second));
  const start = civilOf(from);
  const end = civilOf(to);

  switch (Math.trunc(basis)) {
    case 0: {
      const [startDay, endDay] = usDays(start, end);

      return span360(start, end, startDay, endDay) / 360;
    }
    case 1:
      return actualActual(from, to);
    case 2:
      return (to - from) / 360;
    case 3:
      return (to - from) / 365;
    case 4:
      return days360(from, to, true) / 360;
    default:
      return raise('#NUM!');
  }
};

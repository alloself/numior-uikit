import { CellValueKind, type CellValue } from '../cell.types';
import { raise } from './coerce';
import { mondayIndex } from './serials';
import { WeekendMask } from './calc.types';

export type WeekendMask = readonly boolean[];

const PAIRS: Readonly<Record<number, readonly number[]>> = {
  1: [5, 6],
  2: [6, 0],
  3: [0, 1],
  4: [1, 2],
  5: [2, 3],
  6: [3, 4],
  7: [4, 5],
};

const SINGLE_FROM = 11;

const MASK = /^[01]{7}$/u;

const maskOf = (days: readonly number[]): WeekendMask =>
  Array.from({ length: 7 }, (_, index) => days.includes(index));

export const weekendMask = (value: CellValue | undefined): WeekendMask => {
  if (value === undefined || value.kind === CellValueKind.Empty) {
    return maskOf([5, 6]);
  }
  if (value.kind === CellValueKind.String) {
    if (!MASK.test(value.value) || value.value === WeekendMask.AllDays) {
      return raise('#VALUE!');
    }
    return Array.from(
      { length: 7 },
      (_, index) => value.value.charAt(index) === WeekendMask.Weekend,
    );
  }
  if (value.kind !== CellValueKind.Number) {
    return raise('#VALUE!');
  }

  const code = Math.trunc(value.value);
  const pair = PAIRS[code];

  if (pair !== undefined) {
    return maskOf(pair);
  }
  return code >= SINGLE_FROM && code < SINGLE_FROM + 7
    ? maskOf([(code - SINGLE_FROM + 6) % 7])
    : raise('#NUM!');
};

const isWorkday = (serial: number, mask: WeekendMask): boolean =>
  mask[mondayIndex(serial)] !== true;

const workdaysFrom = (first: number, last: number, mask: WeekendMask): number => {
  const days = last - first + 1;
  const perWeek = mask.reduce((count, weekend) => count + Number(!weekend), 0);
  let count = Math.floor(days / 7) * perWeek;

  for (let serial = first + Math.floor(days / 7) * 7; serial <= last; serial += 1) {
    count += Number(isWorkday(serial, mask));
  }
  return count;
};

export const networkDays = (
  from: number,
  to: number,
  mask: WeekendMask,
  holidays: ReadonlySet<number>,
): number => {
  const first = Math.floor(Math.min(from, to));
  const last = Math.floor(Math.max(from, to));
  let count = workdaysFrom(first, last, mask);

  for (const holiday of holidays) {
    if (holiday >= first && holiday <= last && isWorkday(holiday, mask)) {
      count -= 1;
    }
  }
  return from > to ? -count : count;
};

const LAST_SERIAL = 2_958_465;

export const workday = (
  start: number,
  days: number,
  mask: WeekendMask,
  holidays: ReadonlySet<number>,
): number => {
  const step = days < 0 ? -1 : 1;
  let left = Math.abs(Math.trunc(days));
  let serial = Math.floor(start);

  while (left > 0) {
    serial += step;
    if (serial < 0 || serial > LAST_SERIAL) {
      return raise('#NUM!');
    }
    if (isWorkday(serial, mask) && !holidays.has(serial)) {
      left -= 1;
    }
  }
  return serial;
};

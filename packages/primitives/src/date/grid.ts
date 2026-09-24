import { addDays, addMonths, addYears, differenceInDays, firstOfMonth } from './arithmetic';
import { endOfWeek, isoWeekOf, startOfWeek, weekdayOf, type Weekday } from './week';

export interface MonthGridOptions {
  readonly month: string;
  readonly weekStart: Weekday;
  readonly fixedWeeks: boolean;
}

export type GridMove =
  | 'prev-day'
  | 'next-day'
  | 'prev-week'
  | 'next-week'
  | 'week-start'
  | 'week-end'
  | 'prev-month'
  | 'next-month'
  | 'prev-year'
  | 'next-year';

export type CellMove =
  | 'prev'
  | 'next'
  | 'up'
  | 'down'
  | 'first'
  | 'last'
  | 'page-prev'
  | 'page-next';

const FIXED_ROWS = 6;

const GRID_KEYS: Record<string, GridMove> = {
  ArrowUp: 'prev-week',
  ArrowDown: 'next-week',
  Home: 'week-start',
  End: 'week-end',
};

const CELL_KEYS: Record<string, CellMove> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  Home: 'first',
  End: 'last',
  PageUp: 'page-prev',
  PageDown: 'page-next',
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export const monthGrid = ({ month, weekStart, fixedWeeks }: MonthGridOptions): string[][] => {
  const first = firstOfMonth(month);
  const last = addDays(addMonths(first, 1), -1);
  const start = startOfWeek(first, weekStart);
  const end = endOfWeek(last, weekStart);
  const weeks = (differenceInDays(start, end) + 1) / 7;
  const rows = fixedWeeks ? Math.max(weeks, FIXED_ROWS) : weeks;

  return Array.from({ length: rows }, (_row, week) =>
    Array.from({ length: 7 }, (_cell, offset) => addDays(start, week * 7 + offset)),
  );
};

export const weekNumberOfRow = (row: readonly string[]): number => {
  const thursday = row.find((date) => weekdayOf(date) === 4) ?? row[0];

  return thursday === undefined ? 1 : isoWeekOf(thursday);
};

export const gridMoveFor = (key: string, shift: boolean, rtl: boolean): GridMove | undefined => {
  if (key === 'ArrowLeft' || key === 'ArrowRight') {
    return (key === 'ArrowLeft') !== rtl ? 'prev-day' : 'next-day';
  }

  if (key === 'PageUp') {
    return shift ? 'prev-year' : 'prev-month';
  }

  if (key === 'PageDown') {
    return shift ? 'next-year' : 'next-month';
  }

  return GRID_KEYS[key];
};

const GRID_TARGETS: Record<GridMove, (date: string, weekStart: Weekday) => string> = {
  'prev-day': (date) => addDays(date, -1),
  'next-day': (date) => addDays(date, 1),
  'prev-week': (date) => addDays(date, -7),
  'next-week': (date) => addDays(date, 7),
  'week-start': (date, weekStart) => startOfWeek(date, weekStart),
  'week-end': (date, weekStart) => endOfWeek(date, weekStart),
  'prev-month': (date) => addMonths(date, -1),
  'next-month': (date) => addMonths(date, 1),
  'prev-year': (date) => addYears(date, -1),
  'next-year': (date) => addYears(date, 1),
};

export const gridTargetDate = (move: GridMove, date: string, weekStart: Weekday): string =>
  GRID_TARGETS[move](date, weekStart);

export const cellMoveFor = (key: string, rtl: boolean): CellMove | undefined => {
  if (key === 'ArrowLeft' || key === 'ArrowRight') {
    return (key === 'ArrowLeft') !== rtl ? 'prev' : 'next';
  }

  return CELL_KEYS[key];
};

export const cellTargetIndex = (
  move: CellMove,
  index: number,
  length: number,
  columns: number,
): number => {
  const last = length - 1;

  const targets: Record<CellMove, number> = {
    prev: index - 1,
    next: index + 1,
    up: index - columns,
    down: index + columns,
    first: 0,
    last,
    'page-prev': 0,
    'page-next': last,
  };

  return clamp(targets[move], 0, last);
};

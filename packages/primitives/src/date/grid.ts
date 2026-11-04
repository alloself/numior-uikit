import { clamp } from '@vueuse/core';
import { addDays, addMonths, addYears, differenceInDays, firstOfMonth } from './arithmetic';
import { Key } from '../keyboard/key.types';
import { CellMove, GridMove } from './date.types';
import { endOfWeek, isoWeekOf, startOfWeek, weekdayOf, type Weekday } from './week';

export interface MonthGridOptions {
  readonly month: string;
  readonly weekStart: Weekday;
  readonly fixedWeeks: boolean;
}

const FIXED_ROWS = 6;

const GRID_KEYS: Record<string, GridMove> = {
  [Key.ArrowUp]: GridMove.PrevWeek,
  [Key.ArrowDown]: GridMove.NextWeek,
  [Key.Home]: GridMove.WeekStart,
  [Key.End]: GridMove.WeekEnd,
};

const CELL_KEYS: Record<string, CellMove> = {
  [Key.ArrowUp]: CellMove.Up,
  [Key.ArrowDown]: CellMove.Down,
  [Key.Home]: CellMove.First,
  [Key.End]: CellMove.Last,
  [Key.PageUp]: CellMove.PagePrev,
  [Key.PageDown]: CellMove.PageNext,
};

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
  if (key === Key.ArrowLeft || key === Key.ArrowRight) {
    return (key === Key.ArrowLeft) !== rtl ? GridMove.PrevDay : GridMove.NextDay;
  }

  if (key === Key.PageUp) {
    return shift ? GridMove.PrevYear : GridMove.PrevMonth;
  }

  if (key === Key.PageDown) {
    return shift ? GridMove.NextYear : GridMove.NextMonth;
  }

  return GRID_KEYS[key];
};

const GRID_TARGETS: Record<GridMove, (date: string, weekStart: Weekday) => string> = {
  [GridMove.PrevDay]: (date) => addDays(date, -1),
  [GridMove.NextDay]: (date) => addDays(date, 1),
  [GridMove.PrevWeek]: (date) => addDays(date, -7),
  [GridMove.NextWeek]: (date) => addDays(date, 7),
  [GridMove.WeekStart]: (date, weekStart) => startOfWeek(date, weekStart),
  [GridMove.WeekEnd]: (date, weekStart) => endOfWeek(date, weekStart),
  [GridMove.PrevMonth]: (date) => addMonths(date, -1),
  [GridMove.NextMonth]: (date) => addMonths(date, 1),
  [GridMove.PrevYear]: (date) => addYears(date, -1),
  [GridMove.NextYear]: (date) => addYears(date, 1),
};

export const gridTargetDate = (move: GridMove, date: string, weekStart: Weekday): string =>
  GRID_TARGETS[move](date, weekStart);

export const cellMoveFor = (key: string, rtl: boolean): CellMove | undefined => {
  if (key === Key.ArrowLeft || key === Key.ArrowRight) {
    return (key === Key.ArrowLeft) !== rtl ? CellMove.Prev : CellMove.Next;
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
    [CellMove.Prev]: index - 1,
    [CellMove.Next]: index + 1,
    [CellMove.Up]: index - columns,
    [CellMove.Down]: index + columns,
    [CellMove.First]: 0,
    [CellMove.Last]: last,
    [CellMove.PagePrev]: 0,
    [CellMove.PageNext]: last,
  };

  return clamp(targets[move], 0, last);
};

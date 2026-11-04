import { DateTimePart } from '../intl/intl.types';

export type DateField = (typeof DateField)[keyof typeof DateField];

export type DateMaskField = (typeof DateMaskField)[keyof typeof DateMaskField];

export type DateMaskPartKind = (typeof DateMaskPartKind)[keyof typeof DateMaskPartKind];

export type GridMove = (typeof GridMove)[keyof typeof GridMove];

export type CellMove = (typeof CellMove)[keyof typeof CellMove];

export const DateField = {
  Year: DateTimePart.Year,
  Month: DateTimePart.Month,
  Day: DateTimePart.Day,
} as const;

export const DateMaskField = {
  ...DateField,
  Hour: DateTimePart.Hour,
  Minute: DateTimePart.Minute,
} as const;

export const DateMaskPartKind = { Digits: 'digits', Literal: DateTimePart.Literal } as const;

export const GridMove = {
  PrevDay: 'prev-day',
  NextDay: 'next-day',
  PrevWeek: 'prev-week',
  NextWeek: 'next-week',
  WeekStart: 'week-start',
  WeekEnd: 'week-end',
  PrevMonth: 'prev-month',
  NextMonth: 'next-month',
  PrevYear: 'prev-year',
  NextYear: 'next-year',
} as const;

export const CellMove = {
  Prev: 'prev',
  Next: 'next',
  Up: 'up',
  Down: 'down',
  First: 'first',
  Last: 'last',
  PagePrev: 'page-prev',
  PageNext: 'page-next',
} as const;

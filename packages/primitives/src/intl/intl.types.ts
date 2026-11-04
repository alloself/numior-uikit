export type DateTimePart = (typeof DateTimePart)[keyof typeof DateTimePart];

export type TimeSegmentType = (typeof TimeSegmentType)[keyof typeof TimeSegmentType];

export type HourCycle = (typeof HourCycle)[keyof typeof HourCycle];

export type DayPeriod = (typeof DayPeriod)[keyof typeof DayPeriod];

export type NumberStyle = (typeof NumberStyle)[keyof typeof NumberStyle];

export const DateTimePart = {
  Literal: 'literal',
  Year: 'year',
  Month: 'month',
  Day: 'day',
  Hour: 'hour',
  Minute: 'minute',
  Second: 'second',
  DayPeriod: 'dayPeriod',
} as const;

export const TimeSegmentType = {
  Hour: DateTimePart.Hour,
  Minute: DateTimePart.Minute,
  Second: DateTimePart.Second,
  DayPeriod: DateTimePart.DayPeriod,
} as const;

export const HourCycle = { H12: 'h12', H23: 'h23' } as const;

export const DayPeriod = { Am: 'am', Pm: 'pm' } as const;

export const NumberStyle = {
  Decimal: 'decimal',
  Percent: 'percent',
  Currency: 'currency',
  Unit: 'unit',
} as const;

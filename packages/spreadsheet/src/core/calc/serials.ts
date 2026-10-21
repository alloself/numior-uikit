import { raise } from './signal';

const DAY_MS = 86_400_000;

const EPOCH = Date.UTC(1899, 11, 30);

const PHANTOM_LEAP_DAY = 60;

const LAST_SERIAL = 2_958_465;

export interface CivilDate {
  readonly year: number;
  readonly month: number;
  readonly day: number;
}

const utcDays = (year: number, month: number, day: number): number => {
  const date = new Date(0);

  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(0, 0, 0, 0);
  return Math.round((date.getTime() - EPOCH) / DAY_MS);
};

const firstOfMonth = (year: number, month: number): number => {
  const days = utcDays(year, month, 1);

  return days < PHANTOM_LEAP_DAY + 1 ? days - 1 : days;
};

export const serialOfDate = (year: number, month: number, day: number): number => {
  const shifted = month - 1;
  const fullYear = year + Math.floor(shifted / 12);
  const serial = firstOfMonth(fullYear, (((shifted % 12) + 12) % 12) + 1) + day - 1;

  return serial < 0 || serial > LAST_SERIAL ? raise('#NUM!') : serial;
};

export const dateArgument = (year: number): number => {
  const whole = Math.trunc(year);

  if (whole < 0 || whole >= 10_000) {
    return raise('#NUM!');
  }
  return whole < 1900 ? whole + 1900 : whole;
};

export const civilOf = (serial: number): CivilDate => {
  const whole = Math.floor(serial);

  if (whole < 0 || whole > LAST_SERIAL) {
    return raise('#NUM!');
  }
  if (whole === 0) {
    return { year: 1900, month: 1, day: 0 };
  }
  if (whole === PHANTOM_LEAP_DAY) {
    return { year: 1900, month: 2, day: 29 };
  }

  const date = new Date(EPOCH + (whole < PHANTOM_LEAP_DAY ? whole + 1 : whole) * DAY_MS);

  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
};

export const daysInMonth = (year: number, month: number): number =>
  serialOfDate(year, month + 1, 1) - serialOfDate(year, month, 1);

export const mondayIndex = (serial: number): number => (((Math.floor(serial) - 2) % 7) + 7) % 7;

export const secondsOfDay = (serial: number): number => {
  if (serial < 0) {
    return raise('#NUM!');
  }

  const seconds = Math.round((serial - Math.floor(serial)) * 86_400);

  return seconds === 86_400 ? 0 : seconds;
};

export const isLeapYear = (year: number): boolean =>
  year === 1900 || (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0));

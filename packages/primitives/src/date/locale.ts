import { formatNumber } from '../intl/number-format';
import { parseIsoDate, toUtc } from './iso';
import type { Weekday } from './week';

export type WeekdayWidth = 'narrow' | 'short' | 'long';

export type MonthWidth = 'short' | 'long';

const SUNDAY_REGIONS = new Set([
  'AG',
  'AS',
  'BD',
  'BR',
  'BS',
  'BT',
  'BW',
  'BZ',
  'CA',
  'CN',
  'CO',
  'DM',
  'DO',
  'ET',
  'GT',
  'GU',
  'HK',
  'HN',
  'ID',
  'IL',
  'IN',
  'JM',
  'JP',
  'KE',
  'KH',
  'KR',
  'LA',
  'MH',
  'MM',
  'MO',
  'MT',
  'MX',
  'MZ',
  'NI',
  'NP',
  'PA',
  'PE',
  'PH',
  'PK',
  'PR',
  'PT',
  'PY',
  'SA',
  'SG',
  'SV',
  'TH',
  'TT',
  'TW',
  'UM',
  'US',
  'VE',
  'VI',
  'WS',
  'YE',
  'ZA',
  'ZW',
]);

const SATURDAY_REGIONS = new Set([
  'AE',
  'AF',
  'BH',
  'DJ',
  'DZ',
  'EG',
  'IQ',
  'IR',
  'JO',
  'KW',
  'LY',
  'OM',
  'QA',
  'SD',
  'SY',
]);

const MONDAY_2024 = Date.UTC(2024, 0, 1);

const DAY_MS = 86_400_000;

const formatters = new Map<string, Intl.DateTimeFormat>();

const isWeekday = (value: unknown): value is Weekday =>
  typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 7;

const weekInfoOf = (source: object): unknown => {
  const getter = 'getWeekInfo' in source ? source.getWeekInfo : undefined;

  if (typeof getter === 'function') {
    return getter.call(source);
  }

  return 'weekInfo' in source ? source.weekInfo : undefined;
};

const firstDayOf = (info: unknown): Weekday | undefined => {
  if (typeof info !== 'object' || info === null || !('firstDay' in info)) {
    return undefined;
  }

  return isWeekday(info.firstDay) ? info.firstDay : undefined;
};

const firstDayFromIntl = (locale: Intl.Locale): Weekday | undefined => {
  const source: unknown = locale;

  return typeof source === 'object' && source !== null ? firstDayOf(weekInfoOf(source)) : undefined;
};

export const weekStartOfRegion = (region: string | undefined): Weekday => {
  if (region && SUNDAY_REGIONS.has(region)) {
    return 7;
  }

  return region && SATURDAY_REGIONS.has(region) ? 6 : 1;
};

export const weekStartOf = (locale: string): Weekday => {
  try {
    const resolved = new Intl.Locale(locale).maximize();

    return firstDayFromIntl(resolved) ?? weekStartOfRegion(resolved.region);
  } catch {
    return 1;
  }
};

const formatterFor = (locale: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat => {
  const key = `${locale}|${JSON.stringify(options)}`;
  let formatter = formatters.get(key);

  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, { ...options, timeZone: 'UTC' });
    formatters.set(key, formatter);
  }

  return formatter;
};

export const weekdayLabels = (
  locale: string,
  weekStart: Weekday,
  width: WeekdayWidth = 'short',
): string[] => {
  const formatter = formatterFor(locale, { weekday: width });

  return Array.from({ length: 7 }, (_, offset) =>
    formatter.format(new Date(MONDAY_2024 + (weekStart - 1 + offset) * DAY_MS)),
  );
};

export const monthLabels = (locale: string, width: MonthWidth = 'long'): string[] => {
  const formatter = formatterFor(locale, { month: width });

  return Array.from({ length: 12 }, (_, month) => formatter.format(Date.UTC(2024, month, 1)));
};

export const formatDateLabel = (
  date: string,
  locale: string,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'full' },
): string => {
  const parts = parseIsoDate(date);

  return parts ? formatterFor(locale, options).format(toUtc(parts)) : '';
};

export const formatMonthLabel = (monthKey: string, locale: string): string =>
  formatDateLabel(`${monthKey}-01`, locale, { month: 'long', year: 'numeric' });

export const formatDayNumber = (day: number, locale: string): string =>
  formatNumber(day, locale, { useGrouping: false });

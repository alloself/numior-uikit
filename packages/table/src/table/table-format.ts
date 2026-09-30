import { formatNumber } from '@numior/primitives';
import type { TableEngineColumn } from '../engine';
import type {
  NuiTableBooleanColumn,
  NuiTableCellValue,
  NuiTableColumn,
  NuiTableDateColumn,
  NuiTableNumberColumn,
  NuiTableTextColumn,
} from './table.types';

export interface BooleanTexts {
  readonly yes: string;
  readonly no: string;
}

const dateFormats = new Map<string, Intl.DateTimeFormat>();

const dateFormatFor = (locale: string): Intl.DateTimeFormat => {
  const cached = dateFormats.get(locale);

  if (cached !== undefined) {
    return cached;
  }
  const created = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' });
  dateFormats.set(locale, created);
  return created;
};

export const instantOf = (value: NuiTableCellValue): number => {
  if (value instanceof Date) {
    return value.getTime();
  }
  return typeof value === 'number' ? value : Number.NaN;
};

const dateOf = (value: NuiTableCellValue): Date | null => {
  if (!(value instanceof Date) && typeof value !== 'number') {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const textValue = <T>(
  column: NuiTableTextColumn<T>,
  value: NuiTableCellValue,
  row: T | undefined,
): string => {
  if (typeof value !== 'string') {
    return '';
  }
  return column.format === undefined ? value : column.format(value, row);
};

const numberValue = <T>(
  column: NuiTableNumberColumn<T>,
  value: NuiTableCellValue,
  row: T | undefined,
  locale: string,
): string => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '';
  }
  return column.format === undefined ? formatNumber(value, locale) : column.format(value, row);
};

const dateValue = <T>(
  column: NuiTableDateColumn<T>,
  value: NuiTableCellValue,
  row: T | undefined,
  locale: string,
): string => {
  const date = dateOf(value);

  if (date === null) {
    return '';
  }
  return column.format === undefined
    ? dateFormatFor(locale).format(date)
    : column.format(date, row);
};

const booleanValue = <T>(
  column: NuiTableBooleanColumn<T>,
  value: NuiTableCellValue,
  row: T | undefined,
  texts: BooleanTexts,
): string => {
  if (typeof value !== 'boolean') {
    return '';
  }
  if (column.format !== undefined) {
    return column.format(value, row);
  }
  return value ? texts.yes : texts.no;
};

export const valueTextOf = <T>(
  column: NuiTableColumn<T>,
  value: NuiTableCellValue,
  row: T | undefined,
  locale: string,
  texts: BooleanTexts,
): string => {
  switch (column.type) {
    case 'text':
      return textValue(column, value, row);
    case 'number':
      return numberValue(column, value, row, locale);
    case 'date':
      return dateValue(column, value, row, locale);
    case 'boolean':
      return booleanValue(column, value, row, texts);
  }
};

export const cellTextOf = <T>(
  column: NuiTableColumn<T>,
  row: T,
  locale: string,
  texts: BooleanTexts,
): string => valueTextOf(column, column.value(row) ?? null, row, locale, texts);

export const cellValueOf = <T>(column: NuiTableColumn<T>, row: T): NuiTableCellValue =>
  column.value(row) ?? null;

export const cellValueFrom = (value: unknown): NuiTableCellValue =>
  typeof value === 'string' ||
  typeof value === 'number' ||
  typeof value === 'boolean' ||
  value instanceof Date
    ? value
    : null;

export const aggregateTextOf = <T>(
  column: NuiTableColumn<T>,
  value: unknown,
  locale: string,
  texts: BooleanTexts,
): string => {
  switch (typeof value) {
    case 'number':
      return column.aggregate === 'count' || column.type === 'text' || column.type === 'boolean'
        ? formatNumber(value, locale)
        : valueTextOf(column, value, undefined, locale, texts);
    case 'string':
      return value;
    case 'boolean':
      return value ? texts.yes : texts.no;
    default:
      return '';
  }
};

export const engineColumnOf = <T>(column: NuiTableColumn<T>): TableEngineColumn<T> => {
  const shared = { key: column.key, aggregate: column.aggregate };

  switch (column.type) {
    case 'text':
      return { ...shared, kind: 'string', value: column.value };
    case 'number':
      return { ...shared, kind: 'number', value: column.value };
    case 'date':
      return { ...shared, kind: 'date', value: column.value };
    case 'boolean':
      return { ...shared, kind: 'boolean', value: column.value };
  }
};

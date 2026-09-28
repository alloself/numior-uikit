import { formatNumber } from '@numior/primitives';
import type { GridEngineColumn } from '../engine';
import type {
  NuiGridBooleanColumn,
  NuiGridCellValue,
  NuiGridColumn,
  NuiGridDateColumn,
  NuiGridNumberColumn,
  NuiGridTextColumn,
} from './data-grid.types';

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

const dateOf = (value: NuiGridCellValue): Date | null => {
  if (!(value instanceof Date) && typeof value !== 'number') {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const textValue = <T>(
  column: NuiGridTextColumn<T>,
  value: NuiGridCellValue,
  row: T | undefined,
): string => {
  if (typeof value !== 'string') {
    return '';
  }
  return column.format === undefined ? value : column.format(value, row);
};

const numberValue = <T>(
  column: NuiGridNumberColumn<T>,
  value: NuiGridCellValue,
  row: T | undefined,
  locale: string,
): string => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '';
  }
  return column.format === undefined ? formatNumber(value, locale) : column.format(value, row);
};

const dateValue = <T>(
  column: NuiGridDateColumn<T>,
  value: NuiGridCellValue,
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
  column: NuiGridBooleanColumn<T>,
  value: NuiGridCellValue,
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
  column: NuiGridColumn<T>,
  value: NuiGridCellValue,
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
  column: NuiGridColumn<T>,
  row: T,
  locale: string,
  texts: BooleanTexts,
): string => valueTextOf(column, column.value(row) ?? null, row, locale, texts);

export const cellValueOf = <T>(column: NuiGridColumn<T>, row: T): NuiGridCellValue =>
  column.value(row) ?? null;

export const engineColumnOf = <T>(column: NuiGridColumn<T>): GridEngineColumn<T> => {
  switch (column.type) {
    case 'text':
      return { kind: 'string', key: column.key, value: column.value };
    case 'number':
      return { kind: 'number', key: column.key, value: column.value };
    case 'date':
      return { kind: 'date', key: column.key, value: column.value };
    case 'boolean':
      return { kind: 'boolean', key: column.key, value: column.value };
  }
};

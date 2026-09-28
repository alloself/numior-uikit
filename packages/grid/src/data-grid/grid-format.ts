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

const dateOf = (value: Date | number | null | undefined): Date | null => {
  if (value === null || value === undefined) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const textCell = <T>(column: NuiGridTextColumn<T>, row: T): string => {
  const value = column.value(row);

  if (value === null || value === undefined) {
    return '';
  }
  return column.format === undefined ? value : column.format(value, row);
};

const numberCell = <T>(column: NuiGridNumberColumn<T>, row: T, locale: string): string => {
  const value = column.value(row);

  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '';
  }
  return column.format === undefined ? formatNumber(value, locale) : column.format(value, row);
};

const dateCell = <T>(column: NuiGridDateColumn<T>, row: T, locale: string): string => {
  const date = dateOf(column.value(row));

  if (date === null) {
    return '';
  }
  return column.format === undefined
    ? dateFormatFor(locale).format(date)
    : column.format(date, row);
};

const booleanCell = <T>(column: NuiGridBooleanColumn<T>, row: T, texts: BooleanTexts): string => {
  const value = column.value(row);

  if (value === null || value === undefined) {
    return '';
  }
  if (column.format !== undefined) {
    return column.format(value, row);
  }
  return value ? texts.yes : texts.no;
};

export const cellTextOf = <T>(
  column: NuiGridColumn<T>,
  row: T,
  locale: string,
  texts: BooleanTexts,
): string => {
  switch (column.type) {
    case 'text':
      return textCell(column, row);
    case 'number':
      return numberCell(column, row, locale);
    case 'date':
      return dateCell(column, row, locale);
    case 'boolean':
      return booleanCell(column, row, texts);
  }
};

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

import type { NuiTableColumn } from './table.types';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const cellValue = <T>(row: T, column: NuiTableColumn<T>): unknown => {
  if (column.value) {
    return column.value(row);
  }
  return isRecord(row) ? row[column.key] : undefined;
};

export const cellText = (value: unknown): string => {
  if (value === null || value === undefined) {
    return '';
  }
  return value instanceof Date ? value.toLocaleDateString() : String(value);
};

export const alignClass = <T>(column: NuiTableColumn<T>): string | undefined =>
  column.align === undefined || column.align === 'start'
    ? undefined
    : `nui-table__cell--align-${column.align}`;

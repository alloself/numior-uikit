import type { AttrValue } from '@numior/editor-core';
import type { NuiContentCellValue, NuiContentTableType } from './content.types';

export const CONTENT_TABLE_TYPES: readonly NuiContentTableType[] = [
  'text',
  'number',
  'date',
  'boolean',
  'select',
];

const SPACES = /[\s  ]/gu;

const PLAIN = /^[-+]?\d+(?:\.\d+)?$/u;

const GROUPED = /^[-+]?\d{1,3}(?:,\d{3})+(?:\.\d+)?$/u;

const COMMA = /^[-+]?\d+,\d+$/u;

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/u;

const DOTTED = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/u;

const TRUE = new Set(['true', 'истина', 'да', 'yes']);

const FALSE = new Set(['false', 'ложь', 'нет', 'no']);

const twoDigits = (value: number): string => String(value).padStart(2, '0');

const isoOf = (year: number, month: number, day: number): string | undefined => {
  const date = new Date(Date.UTC(year, month - 1, day));

  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
    ? `${String(year).padStart(4, '0')}-${twoDigits(month)}-${twoDigits(day)}`
    : undefined;
};

export const parseCellNumber = (text: string): number | undefined => {
  const compact = text.replaceAll(SPACES, '');
  let normal: string | undefined;

  if (PLAIN.test(compact)) {
    normal = compact;
  } else if (GROUPED.test(compact)) {
    normal = compact.replaceAll(',', '');
  } else if (COMMA.test(compact)) {
    normal = compact.replace(',', '.');
  }
  const value = normal === undefined ? Number.NaN : Number(normal);

  return Number.isFinite(value) ? value : undefined;
};

export const parseCellDate = (text: string): string | undefined => {
  const iso = ISO.exec(text.trim());

  if (iso !== null) {
    return isoOf(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  }
  const dotted = DOTTED.exec(text.trim());

  return dotted === null
    ? undefined
    : isoOf(Number(dotted[3]), Number(dotted[2]), Number(dotted[1]));
};

export const parseCellBoolean = (text: string): boolean | undefined => {
  const word = text.trim().toLowerCase();

  if (TRUE.has(word)) {
    return true;
  }
  return FALSE.has(word) ? false : undefined;
};

export const parseCellText = (text: string, type: NuiContentTableType): NuiContentCellValue => {
  const trimmed = text.trim();

  if (trimmed === '') {
    return null;
  }
  switch (type) {
    case 'number':
      return parseCellNumber(trimmed) ?? null;
    case 'date':
      return parseCellDate(trimmed) ?? null;
    case 'boolean':
      return parseCellBoolean(trimmed) ?? null;
    case 'text':
    case 'select':
      return trimmed;
  }
};

export const cellText = (value: AttrValue | undefined): string => {
  if (value === null || value === undefined) {
    return '';
  }
  return typeof value === 'string' ? value : String(value);
};

export const cellValueOf = (
  value: AttrValue | undefined,
  type: NuiContentTableType,
): NuiContentCellValue => {
  if (value === undefined || value === null) {
    return null;
  }
  if (type === 'boolean') {
    return typeof value === 'boolean' ? value : parseCellText(cellText(value), type);
  }
  if (type === 'number') {
    return typeof value === 'number' ? value : parseCellText(cellText(value), type);
  }
  return parseCellText(cellText(value), type);
};

export const columnLetter = (index: number): string => {
  let rest = index + 1;
  let name = '';

  while (rest > 0) {
    const digit = (rest - 1) % 26;

    name = String.fromCodePoint(65 + digit) + name;
    rest = Math.floor((rest - 1) / 26);
  }
  return name;
};

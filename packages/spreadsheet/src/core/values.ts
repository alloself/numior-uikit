import { CellValueKind, type CellError, type CellValue } from './cell.types';

export const CELL_ERRORS: readonly CellError[] = [
  '#NULL!',
  '#DIV/0!',
  '#VALUE!',
  '#REF!',
  '#NAME?',
  '#NUM!',
  '#N/A',
  '#SPILL!',
  '#CALC!',
];

export const EMPTY: CellValue = { kind: 'empty' };

export const numberValue = (value: number): CellValue =>
  Number.isFinite(value) ? { kind: 'number', value } : { kind: 'error', code: '#NUM!' };

export const textValue = (value: string): CellValue => ({ kind: 'string', value });

export const booleanValue = (value: boolean): CellValue => ({ kind: 'boolean', value });

export const errorValue = (code: CellError): CellValue => ({ kind: 'error', code });

export const isCellError = (text: string): text is CellError =>
  CELL_ERRORS.some((code) => code === text);

export const sameValue = (left: CellValue, right: CellValue): boolean => {
  switch (left.kind) {
    case CellValueKind.Empty:
      return right.kind === CellValueKind.Empty;
    case CellValueKind.Error:
      return right.kind === CellValueKind.Error && right.code === left.code;
    default:
      return right.kind === left.kind && 'value' in right && right.value === left.value;
  }
};

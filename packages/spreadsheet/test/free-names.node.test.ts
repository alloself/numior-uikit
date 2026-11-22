import { describe, expect, it } from 'vite-plus/test';
import { nextFreeName } from '../src/core/collab/free-names';
import {
  DEFINED_NAME_LENGTH,
  SHEET_NAME_LENGTH,
  validSheetName,
  validTableName,
} from '../src/core/workbook';

const SHEET = { valid: validSheetName, longest: SHEET_NAME_LENGTH };

const TABLE = { valid: validTableName, longest: DEFINED_NAME_LENGTH };

const takenOf =
  (...names: readonly string[]) =>
  (name: string): boolean =>
    names.some((taken) => taken.toLowerCase() === name.toLowerCase());

describe('the next free name of a sheet or a table', () => {
  it.each([
    ['grows the number at the end', 'Sheet2', [], 'Sheet3'],
    ['keeps the space before the number', 'Сводная 1', [], 'Сводная 2'],
    ['gives a name without a number the number two', 'Budget', [], 'Budget2'],
    ['steps over names taken in any case', 'Sheet2', ['SHEET3', 'sheet4'], 'Sheet5'],
    ['drops leading zeros', 'Plan007', [], 'Plan8'],
  ])('%s', (_what, name, taken, next) => {
    expect(nextFreeName(name, takenOf(...taken), SHEET)).toBe(next);
  });

  it('shortens a sheet name to the length a sheet name may have', () => {
    const name = 'A'.repeat(SHEET_NAME_LENGTH);

    const next = nextFreeName(name, takenOf(), SHEET);

    expect(next).toBe(`${'A'.repeat(SHEET_NAME_LENGTH - 1)}2`);
    expect(validSheetName(next)).toBe(true);
  });

  it('keeps a table name off a cell address and a row or column of R1C1', () => {
    expect(nextFreeName('Tab', takenOf(), TABLE)).toBe('Tab_2');
    expect(nextFreeName('R', takenOf(), TABLE)).toBe('R_2');
    expect(nextFreeName('Table1', takenOf('Table2'), TABLE)).toBe('Table3');
  });
});

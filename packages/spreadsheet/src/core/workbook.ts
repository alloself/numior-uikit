import { createCellFormats, type CellFormats } from './cell-formats';
import { createCellStore, type CellStore } from './cell-store';
import { createNumberFormats, type NumberFormats } from './number-formats';
import { createSharedStrings, type SharedStrings } from './strings';

export interface Sheet {
  readonly id: number;
  name: string;
  readonly cells: CellStore;
  readonly formats: CellFormats;
}

export interface Workbook {
  readonly strings: SharedStrings;
  readonly formats: NumberFormats;
  readonly sheets: readonly Sheet[];
  addSheet(name?: string, index?: number): Sheet;
  removeSheet(sheet: Sheet): void;
  sheet(name: string): Sheet | undefined;
  renameSheet(sheet: Sheet, name: string): boolean;
}

const FORBIDDEN = /[[\]:*?/\\]/u;

const MAX_NAME = 31;

export const validSheetName = (name: string): boolean =>
  name.trim() !== '' &&
  name.length <= MAX_NAME &&
  !FORBIDDEN.test(name) &&
  !name.startsWith("'") &&
  !name.endsWith("'");

export const createWorkbook = (): Workbook => {
  const strings = createSharedStrings();
  const formats = createNumberFormats();
  const sheets: Sheet[] = [];
  let next = 1;

  const sheet = (name: string): Sheet | undefined => {
    const wanted = name.toLowerCase();

    return sheets.find((candidate) => candidate.name.toLowerCase() === wanted);
  };

  const freeName = (): string => {
    let index = sheets.length + 1;

    while (sheet(`Sheet${String(index)}`) !== undefined) {
      index += 1;
    }
    return `Sheet${String(index)}`;
  };

  return {
    strings,
    formats,
    sheets,
    sheet,
    addSheet: (name, index = sheets.length) => {
      const title = name ?? freeName();

      if (!validSheetName(title) || sheet(title) !== undefined) {
        throw new RangeError(`The sheet name ${title} is taken or not allowed`);
      }

      const created: Sheet = {
        id: next,
        name: title,
        cells: createCellStore(strings),
        formats: createCellFormats(),
      };

      next += 1;
      sheets.splice(Math.min(Math.max(index, 0), sheets.length), 0, created);
      return created;
    },
    removeSheet: (target) => {
      const index = sheets.indexOf(target);

      if (index >= 0) {
        sheets.splice(index, 1);
      }
    },
    renameSheet: (target, name) => {
      const taken = sheet(name);

      if (!validSheetName(name) || (taken !== undefined && taken !== target)) {
        return false;
      }
      target.name = name;
      return true;
    },
  };
};

import { parseCell } from './address';
import { createCellFormats, type CellFormats } from './cell-formats';
import { createCellStore, type CellStore } from './cell-store';
import { createNumberFormats, type NumberFormats } from './number-formats';
import type { FormulaNode } from './formula/formula.types';
import { createSharedStrings, type SharedStrings } from './strings';

export interface Sheet {
  readonly id: number;
  name: string;
  readonly cells: CellStore;
  readonly formats: CellFormats;
}

export interface DefinedName {
  readonly name: string;
  readonly scope: Sheet | undefined;
  readonly ast: FormulaNode;
}

export interface DefinedNames {
  get(name: string, scope: Sheet | undefined): DefinedName | undefined;
  resolve(name: string, sheet: Sheet): DefinedName | undefined;
  set(name: string, scope: Sheet | undefined, ast: FormulaNode): DefinedName;
  delete(name: string, scope: Sheet | undefined): void;
  forEach(visit: (name: DefinedName) => void): void;
}

export interface Workbook {
  readonly strings: SharedStrings;
  readonly formats: NumberFormats;
  readonly names: DefinedNames;
  readonly sheets: readonly Sheet[];
  addSheet(name?: string, index?: number): Sheet;
  removeSheet(sheet: Sheet): void;
  sheet(name: string): Sheet | undefined;
  renameSheet(sheet: Sheet, name: string): boolean;
}

const FORBIDDEN = /[[\]:*?/\\]/u;

const DEFINED_NAME = /^[\p{L}_][\p{L}\p{N}_.]*$/u;

const R1C1_NAME = /^(?:[RrCc]|[Rr]\d*[Cc]\d*|[Rr]\d+|[Cc]\d+)$/u;

const MAX_DEFINED_NAME = 255;

const MAX_NAME = 31;

export const validSheetName = (name: string): boolean =>
  name.trim() !== '' &&
  name.length <= MAX_NAME &&
  !FORBIDDEN.test(name) &&
  !name.startsWith("'") &&
  !name.endsWith("'");

export const validDefinedName = (name: string): boolean =>
  name.length <= MAX_DEFINED_NAME &&
  DEFINED_NAME.test(name) &&
  !R1C1_NAME.test(name) &&
  parseCell(name) === undefined &&
  !['true', 'false'].includes(name.toLowerCase());

const nameKey = (name: string, scope: Sheet | undefined): string =>
  `${String(scope?.id ?? 0)}:${name.toLowerCase()}`;

const createDefinedNames = (): DefinedNames => {
  const names = new Map<string, DefinedName>();

  return {
    get: (name, scope) => names.get(nameKey(name, scope)),
    resolve: (name, sheet) =>
      names.get(nameKey(name, sheet)) ?? names.get(nameKey(name, undefined)),
    set: (name, scope, ast) => {
      const defined: DefinedName = { name, scope, ast };

      names.set(nameKey(name, scope), defined);
      return defined;
    },
    delete: (name, scope) => {
      names.delete(nameKey(name, scope));
    },
    forEach: (visit) => {
      [...names.values()].forEach(visit);
    },
  };
};

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
    names: createDefinedNames(),
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

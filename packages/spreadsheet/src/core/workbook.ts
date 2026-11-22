import { parseCell } from './address';
import { createCellFormats, type CellFormats } from './cell-formats';
import { createCellStore, type CellStore, type WriteCount } from './cell-store';
import type { CellAddress, CellRange } from './cell.types';
import type { ConditionalFormat } from './conditional/conditional.types';
import type { PivotDefinition } from './pivot/pivot.types';
import type { SheetLayout } from './layout/layout.types';
import { EMPTY_LAYOUT } from './layout/line-layouts';
import { createDecorations, type CellDecorations } from './decorations';
import { createNumberFormats, type NumberFormats } from './number-formats';
import type { BookIndexOf, BookLabelOf, FormulaNode, SheetPlace } from './formula/formula.types';
import { randomTag } from './random-tag';
import { createSharedStrings, type SharedStrings } from './strings';
import type { TableShape } from './tables';

export interface Sheet {
  readonly id: number;
  readonly key: string;
  name: string;
  readonly cells: CellStore;
  readonly formats: CellFormats;
  readonly decorations: CellFormats;
  shifts: number;
  conditional: readonly ConditionalFormat[];
  layout: SheetLayout;
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
  taken(name: string): boolean;
  forEach(visit: (name: DefinedName) => void): void;
}

export interface SheetTable extends TableShape {
  readonly name: string;
  readonly sheet: Sheet;
}

export interface SheetTables {
  get(name: string): SheetTable | undefined;
  on(sheet: Sheet): readonly SheetTable[];
  at(sheet: Sheet, row: number, col: number): SheetTable | undefined;
  set(table: SheetTable): void;
  delete(name: string): void;
  forEach(visit: (table: SheetTable) => void): void;
}

export interface SheetPivot {
  readonly name: string;
  readonly sheet: Sheet;
  readonly anchor: CellAddress;
  readonly definition: PivotDefinition;
  readonly footprint: CellRange | undefined;
}

export interface SheetPivots {
  get(sheet: Sheet, name: string): SheetPivot | undefined;
  on(sheet: Sheet): readonly SheetPivot[];
  set(pivot: SheetPivot): void;
  delete(pivot: SheetPivot): void;
  forEach(visit: (pivot: SheetPivot) => void): void;
}

export interface ExternalName {
  readonly name: string;
  readonly sheet: string | undefined;
  readonly ast: FormulaNode | undefined;
}

export interface ExternalBookInit {
  readonly target: string;
  readonly sheets: readonly string[];
  readonly names: readonly ExternalName[];
}

export interface ExternalBook {
  readonly target: string;
  readonly sheets: readonly Sheet[];
  readonly names: readonly ExternalName[];
  sheet(name: string): Sheet | undefined;
  name(name: string, sheet: string | undefined): ExternalName | undefined;
}

export interface Workbook {
  readonly strings: SharedStrings;
  readonly formats: NumberFormats;
  readonly decorations: CellDecorations;
  readonly names: DefinedNames;
  readonly tables: SheetTables;
  readonly pivots: SheetPivots;
  readonly sheets: readonly Sheet[];
  readonly externals: readonly ExternalBook[];
  readonly revision: number;
  addSheet(name?: string, index?: number, key?: string): Sheet;
  addExternal(init: ExternalBookInit): ExternalBook;
  removeSheet(sheet: Sheet): void;
  sheet(name: string): Sheet | undefined;
  keyed(key: string): Sheet | undefined;
  freshKey(): string;
  renameSheet(sheet: Sheet, name: string): boolean;
}

export interface BookNames {
  readonly books: BookIndexOf;
}

export interface BookLabels {
  readonly books: BookLabelOf;
}

const FORBIDDEN = /[[\]:*?/\\]/u;

const NAME = /^[\p{L}_\\][\p{L}\p{N}_.?\\]*$/u;

const MACRO_NAME = /^\\.$/u;

const R1C1_NAME = /^(?:[RrCc]|[Rr]\d*[Cc]\d*|[Rr]\d+|[Cc]\d+)$/u;

export const DEFINED_NAME_LENGTH = 255;

export const SHEET_NAME_LENGTH = 31;

const SHEET_KEY_LENGTH = 12;

export const SHEET_KEY = /^[0-9a-z]{1,32}$/u;

export const validSheetName = (name: string): boolean =>
  name.trim() !== '' &&
  name.length <= SHEET_NAME_LENGTH &&
  !FORBIDDEN.test(name) &&
  !name.startsWith("'") &&
  !name.endsWith("'");

export const validTableName = (name: string): boolean =>
  name.length <= DEFINED_NAME_LENGTH &&
  NAME.test(name) &&
  !R1C1_NAME.test(name) &&
  parseCell(name) === undefined &&
  !['true', 'false'].includes(name.toLowerCase());

export const validDefinedName = (name: string): boolean =>
  validTableName(name) && !MACRO_NAME.test(name);

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
    taken: (name) => {
      const wanted = name.toLowerCase();

      return [...names.values()].some((defined) => defined.name.toLowerCase() === wanted);
    },
    forEach: (visit) => {
      names.forEach((defined) => {
        visit(defined);
      });
    },
  };
};

const createSheetTables = (): SheetTables => {
  const tables = new Map<string, SheetTable>();

  return {
    get: (name) => tables.get(name.toLowerCase()),
    on: (sheet) =>
      [...tables.values()].reduce<SheetTable[]>((found, table) => {
        if (table.sheet.id === sheet.id) {
          found.push(table);
        }
        return found;
      }, []),
    at: (sheet, row, col) =>
      [...tables.values()].find(
        (table) =>
          table.sheet.id === sheet.id &&
          row >= table.range.top &&
          row <= table.range.bottom &&
          col >= table.range.left &&
          col <= table.range.right,
      ),
    set: (table) => {
      tables.set(table.name.toLowerCase(), table);
    },
    delete: (name) => {
      tables.delete(name.toLowerCase());
    },
    forEach: (visit) => {
      tables.forEach((table) => {
        visit(table);
      });
    },
  };
};

const pivotKey = (sheet: Sheet, name: string): string =>
  `${String(sheet.id)}:${name.toLowerCase()}`;

const createSheetPivots = (): SheetPivots => {
  const pivots = new Map<string, SheetPivot>();

  return {
    get: (sheet, name) => pivots.get(pivotKey(sheet, name)),
    on: (sheet) =>
      [...pivots.values()].reduce<SheetPivot[]>((found, pivot) => {
        if (pivot.sheet.id === sheet.id) {
          found.push(pivot);
        }
        return found;
      }, []),
    set: (pivot) => {
      pivots.set(pivotKey(pivot.sheet, pivot.name), pivot);
    },
    delete: (pivot) => {
      pivots.delete(pivotKey(pivot.sheet, pivot.name));
    },
    forEach: (visit) => {
      pivots.forEach((pivot) => {
        visit(pivot);
      });
    },
  };
};

const fileName = (target: string): string => {
  const base = target.slice(Math.max(target.lastIndexOf('/'), target.lastIndexOf('\\')) + 1);

  try {
    return decodeURIComponent(base);
  } catch {
    return base;
  }
};

const externalFiles = (book: Workbook): string[] =>
  book.externals.map((external) => fileName(external.target).toLowerCase());

const onlyOne = (files: readonly string[], name: string): boolean =>
  name !== '' && files.includes(name) && files.indexOf(name) === files.lastIndexOf(name);

export const bookNames = (book: Workbook): BookNames => ({
  books: (name) => {
    const files = externalFiles(book);
    const wanted = name.toLowerCase();

    return onlyOne(files, wanted) ? files.indexOf(wanted) + 1 : undefined;
  },
});

export const bookLabels = (book: Workbook): BookLabels => ({
  books: (index) => {
    const external = book.externals[index - 1];
    const name = external === undefined ? '' : fileName(external.target);

    return onlyOne(externalFiles(book), name.toLowerCase()) ? name : undefined;
  },
});

export const localSheet = (
  book: Workbook,
  place: SheetPlace,
  current: Sheet,
): Sheet | undefined => {
  if (place.book !== undefined) {
    return undefined;
  }
  return place.sheet === undefined ? current : book.sheet(place.sheet);
};

export const tableFor = (
  book: Workbook,
  table: string | undefined,
  sheet: Sheet,
  row: number,
  col: number,
): SheetTable | undefined =>
  table === undefined ? book.tables.at(sheet, row, col) : book.tables.get(table);

const named = (sheets: readonly Sheet[], name: string): Sheet | undefined => {
  const wanted = name.toLowerCase();

  return sheets.find((candidate) => candidate.name.toLowerCase() === wanted);
};

const blankSheet = (
  id: number,
  key: string,
  name: string,
  strings: SharedStrings,
  count?: WriteCount,
): Sheet => ({
  id,
  key,
  name,
  cells: createCellStore(strings, count),
  formats: createCellFormats(),
  decorations: createCellFormats(),
  shifts: 0,
  conditional: [],
  layout: EMPTY_LAYOUT,
});

const externalBook = (init: ExternalBookInit, sheets: readonly Sheet[]): ExternalBook => ({
  target: init.target,
  sheets,
  names: init.names,
  sheet: (name) => named(sheets, name),
  name: (name, sheet) => {
    const wanted = name.toLowerCase();
    const scope = sheet?.toLowerCase();

    return init.names.find(
      (candidate) =>
        candidate.name.toLowerCase() === wanted && candidate.sheet?.toLowerCase() === scope,
    );
  },
});

export const createWorkbook = (): Workbook => {
  const strings = createSharedStrings();
  const formats = createNumberFormats();
  const sheets: Sheet[] = [];
  const externals: ExternalBook[] = [];
  const count: WriteCount = { writes: 0 };
  let next = 1;

  const sheet = (name: string): Sheet | undefined => named(sheets, name);

  const keyed = (key: string): Sheet | undefined =>
    sheets.find((candidate) => candidate.key === key);

  const freshKey = (): string => {
    let key = randomTag(SHEET_KEY_LENGTH);

    while (keyed(key) !== undefined) {
      key = randomTag(SHEET_KEY_LENGTH);
    }
    return key;
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
    decorations: createDecorations(),
    names: createDefinedNames(),
    tables: createSheetTables(),
    pivots: createSheetPivots(),
    sheets,
    externals,
    sheet,
    keyed,
    freshKey,
    get revision() {
      return count.writes;
    },
    addSheet: (name, index = sheets.length, key = freshKey()) => {
      const title = name ?? freeName();

      if (!validSheetName(title) || sheet(title) !== undefined) {
        throw new RangeError(`The sheet name ${title} is taken or not allowed`);
      }
      if (!SHEET_KEY.test(key) || keyed(key) !== undefined) {
        throw new RangeError(`The sheet key ${key} is taken or not allowed`);
      }

      const created = blankSheet(next, key, title, strings, count);

      next += 1;
      sheets.splice(Math.min(Math.max(index, 0), sheets.length), 0, created);
      return created;
    },
    addExternal: (init) => {
      const cached = init.sheets.map((name, index) =>
        blankSheet(next + index, randomTag(SHEET_KEY_LENGTH), name, strings),
      );

      const added = externalBook(init, cached);

      next += cached.length;
      externals.push(added);
      return added;
    },
    removeSheet: (target) => {
      const index = sheets.indexOf(target);

      if (index < 0) {
        return;
      }

      sheets.splice(index, 1);
      count.writes += 1;
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

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  EN_FORMULAS,
  MAX_COLS,
  MAX_ROWS,
  formatCell,
  formatRange,
  printFormula,
  type CellRange,
  type Sheet,
} from '../src/core';
import { writeZip, type Bytes, type XlsxRead } from '../src/xlsx';

const CORPUS = fileURLToPath(new URL('./corpus/xlsx/', import.meta.url));

const WHOLE: CellRange = { top: 0, left: 0, bottom: MAX_ROWS - 1, right: MAX_COLS - 1 };

type Opened = Extract<XlsxRead, { readonly kind: 'editable' | 'read-only' }>;

const filesUnder = (folder: string): string[] =>
  readdirSync(folder).flatMap((entry) => {
    const path = join(folder, entry);

    return statSync(path).isDirectory() ? filesUnder(path) : [path];
  });

export const corpusFixtures = (): string[] => readdirSync(CORPUS).toSorted();

export const expectedPath = (name: string): string => join(CORPUS, name, 'expected.json');

export const corpusPackage = async (name: string): Promise<Bytes> => {
  const single = join(CORPUS, name, 'package.bin');

  if (existsSync(single)) {
    return new Uint8Array(readFileSync(single));
  }

  const folder = join(CORPUS, name, 'package');

  return writeZip(
    filesUnder(folder)
      .map((path) => relative(folder, path).split('\\').join('/'))
      .toSorted(
        (left, right) =>
          Number(right === '[Content_Types].xml') - Number(left === '[Content_Types].xml'),
      )
      .map((part) => ({ name: part, data: new Uint8Array(readFileSync(join(folder, part))) })),
  );
};

const cellsOf = (read: Opened, sheet: Sheet): Record<string, unknown> => {
  const cells = new Map<number, Record<string, unknown>>();

  const add = (row: number, col: number): void => {
    const formula = read.calculator.formulaAt(sheet, row, col);
    const format = sheet.formats.get(row, col);
    const decoration = sheet.decorations.get(row, col);
    const value = sheet.cells.get(row, col);

    cells.set(row * MAX_COLS + col, {
      ...(value.kind === 'empty' ? {} : { value }),
      ...(formula === undefined
        ? {}
        : { formula: printFormula(formula.ast, EN_FORMULAS, { row, col }), state: formula.state }),
      ...(format === 0 ? {} : { format: read.book.formats.code(format) }),
      ...(decoration === 0 ? {} : { decoration: read.book.decorations.get(decoration) }),
    });
  };

  sheet.cells.forEachInRange(WHOLE, add);
  sheet.formats.forEachInRange(WHOLE, add);
  sheet.decorations.forEachInRange(WHOLE, add);

  read.calculator.forEachFormula((owner, row, col) => {
    if (owner === sheet) {
      add(row, col);
    }
  });

  return Object.fromEntries(
    [...cells]
      .toSorted(([left], [right]) => left - right)
      .map(([key, cell]) => [
        formatCell({
          row: Math.floor(key / MAX_COLS),
          col: key % MAX_COLS,
          rowAbsolute: false,
          colAbsolute: false,
        }),
        cell,
      ]),
  );
};

interface SheetModel {
  readonly name: string;
  readonly cells: Record<string, unknown>;
}

const valueOf = (cell: unknown): string =>
  typeof cell === 'object' && cell !== null && 'value' in cell ? JSON.stringify(cell.value) : '';

export const differingCells = (
  before: readonly SheetModel[],
  after: readonly SheetModel[],
): string[] =>
  before.flatMap((sheet, index) =>
    Object.entries(sheet.cells).reduce<string[]>((found, [address, cell]) => {
      const other = after[index]?.cells[address];

      if (valueOf(cell) !== valueOf(other)) {
        found.push(`${sheet.name}!${address}: ${valueOf(cell)} → ${valueOf(other)}`);
      }
      return found;
    }, []),
  );

export const modelOf = (
  read: Opened,
): { readonly sheets: SheetModel[]; readonly [key: string]: unknown } => {
  const names: unknown[] = [];
  const tables: unknown[] = [];

  read.book.names.forEach((defined) => {
    names.push({
      name: defined.name,
      scope: defined.scope?.name,
      formula: printFormula(defined.ast, EN_FORMULAS),
    });
  });

  read.book.tables.forEach((table) => {
    tables.push({ ...table, sheet: table.sheet.name, range: formatRange(table.range) });
  });

  return {
    defaultFont: read.book.decorations.defaultFont,
    sheets: read.book.sheets.map((sheet) => ({ name: sheet.name, cells: cellsOf(read, sheet) })),
    names,
    tables,
  };
};

export const dumpOf = (read: XlsxRead): string =>
  `${JSON.stringify(
    read.kind === 'rejected'
      ? { kind: read.kind, reason: read.reason }
      : {
          kind: read.kind,
          report: {
            staleFormulas: read.report.staleFormulas,
            items: read.report.items.map((item) => ({
              code: item.code,
              severity: item.severity,
              count: item.count,
              names: item.names,
            })),
          },
          ...modelOf(read),
        },
    null,
    2,
  )}\n`;

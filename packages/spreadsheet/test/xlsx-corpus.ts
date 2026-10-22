import {
  EN_FORMULAS,
  MAX_COLS,
  MAX_ROWS,
  columnName,
  formatCell,
  formatRange,
  printFormula,
  type CellRange,
  type Sheet,
} from '../src/core';
import { mapConditionalFormulas } from '../src/core/conditional/shift';
import { writeZip, type Bytes, type XlsxRead } from '../src/xlsx';
import { corpusSource } from './corpus-files';

export { corpusFixtures, expectedPath } from './corpus-files';

type Opened = Extract<XlsxRead, { readonly kind: 'editable' | 'read-only' }>;

interface SheetModel {
  readonly name: string;
  readonly cells: Record<string, unknown>;
  readonly conditional?: unknown;
  readonly layout?: unknown;
}

const WHOLE: CellRange = { top: 0, left: 0, bottom: MAX_ROWS - 1, right: MAX_COLS - 1 };

export const corpusPackage = async (name: string): Promise<Bytes> => {
  const source = corpusSource(name);

  return source.kind === 'bytes' ? source.bytes : writeZip(source.parts);
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

const linesOf = (
  book: Opened['book'],
  lines: Sheet['layout']['rows'],
  label: (line: number) => string,
): Record<string, unknown> => {
  const found: Record<string, unknown> = {};

  lines.forEach((line, layout) => {
    found[label(line)] = {
      ...layout,
      style:
        layout.style === undefined
          ? undefined
          : {
              format: book.formats.code(layout.style.format),
              decoration: book.decorations.get(layout.style.decoration),
            },
    };
  });

  return found;
};

export const layoutOf = (book: Opened['book'], sheet: Sheet): unknown => ({
  rows: linesOf(book, sheet.layout.rows, (line) => String(line + 1)),
  cols: linesOf(book, sheet.layout.cols, (line) => columnName(line)),
});

const conditionalOf = (sheet: Sheet): unknown =>
  sheet.conditional.map((format) => {
    const origin = { row: format.ranges[0]?.top ?? 0, col: format.ranges[0]?.left ?? 0 };

    const [printed] = mapConditionalFormulas([format], (ast) => ({
      kind: 'string',
      value: printFormula(ast, EN_FORMULAS, origin),
    }));

    return { ranges: format.ranges.map(formatRange), rules: printed?.rules };
  });

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
    sheets: read.book.sheets.map((sheet) => ({
      name: sheet.name,
      cells: cellsOf(read, sheet),
      ...(sheet.conditional.length === 0 ? {} : { conditional: conditionalOf(sheet) }),
      ...(sheet.layout.rows.size + sheet.layout.cols.size === 0
        ? {}
        : { layout: layoutOf(read.book, sheet) }),
    })),
    names,
    tables,
    externals: read.book.externals.map((external) => ({
      target: external.target,
      sheets: external.sheets.map((sheet) => ({ name: sheet.name, cells: cellsOf(read, sheet) })),
      names: external.names.map((entry) => ({
        name: entry.name,
        sheet: entry.sheet,
        formula: entry.ast === undefined ? undefined : printFormula(entry.ast, EN_FORMULAS),
      })),
    })),
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

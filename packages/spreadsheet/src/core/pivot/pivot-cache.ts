import { CellValueKind, type CellRange, type CellValue } from '../cell.types';
import { lookupKey, toText } from '../calc/coerce';
import { EN_NUMBERS } from '../format';
import { EMPTY } from '../values';
import type { Sheet, Workbook } from '../workbook';
import {
  PivotSourceKind,
  type PivotCache,
  type PivotGroup,
  type PivotSource,
  type PivotTable,
} from './pivot.types';

export const pivotKey = (value: CellValue): string => {
  switch (value.kind) {
    case CellValueKind.Error:
      return `e${value.code}`;
    case CellValueKind.Empty:
      return 'blank';
    default:
      return lookupKey(value) ?? 'blank';
  }
};

const uniqueName = (taken: Set<string>, name: string): string => {
  let candidate = name;

  for (let index = 2; taken.has(candidate.toUpperCase()); index += 1) {
    candidate = `${name}${String(index)}`;
  }
  taken.add(candidate.toUpperCase());
  return candidate;
};

const groupOf = (values: readonly CellValue[]): PivotGroup => {
  const index = new Map<string, number>();
  const items: CellValue[] = [];
  const records = new Int32Array(values.length);

  values.forEach((value, record) => {
    const key = pivotKey(value);
    let item = index.get(key);

    if (item === undefined) {
      item = items.length;
      index.set(key, item);
      items.push(value);
    }
    records[record] = item;
  });

  return { items, records };
};

export const buildPivotCache = (source: PivotTable): PivotCache | undefined => {
  const taken = new Set<string>();
  const groups = new Map<number, PivotGroup>();

  if (
    source.header.length === 0 ||
    source.header.some((value) => value.kind === CellValueKind.Empty)
  ) {
    return undefined;
  }

  const fields = source.header.map((value, col) => ({
    name: uniqueName(taken, toText(value, EN_NUMBERS)),
    values: source.columns[col] ?? [],
  }));

  return {
    fields,
    count: source.count,
    group: (field) => {
      const values = fields[field]?.values;
      const known = groups.get(field);

      if (known !== undefined || values === undefined) {
        return known;
      }

      const group = groupOf(values);

      groups.set(field, group);
      return group;
    },
  };
};

const tableOf = (sheet: Sheet, range: CellRange): PivotTable => {
  const width = range.right - range.left + 1;
  const count = range.bottom - range.top;
  const header: CellValue[] = Array.from({ length: width }, () => EMPTY);

  const columns: CellValue[][] = Array.from({ length: width }, () =>
    Array.from({ length: count }, (): CellValue => EMPTY),
  );

  sheet.cells.forEachInRange(range, (row, col, value) => {
    if (row === range.top) {
      header[col - range.left] = value;
    } else {
      const column = columns[col - range.left];

      if (column !== undefined) {
        column[row - range.top - 1] = value;
      }
    }
  });

  return { header, columns, count };
};

export const pivotTableOf = (rows: readonly (readonly CellValue[])[]): PivotTable => {
  const header = rows[0] ?? [];

  return {
    header,
    count: Math.max(rows.length - 1, 0),
    columns: header.map((_, col) => rows.slice(1).map((row) => row[col] ?? EMPTY)),
  };
};

export const pivotSource = (book: Workbook, source: PivotSource): PivotTable | undefined => {
  if (source.kind === PivotSourceKind.Range) {
    const sheet = book.sheet(source.sheet);

    return sheet === undefined ? undefined : tableOf(sheet, source.range);
  }
  if (source.kind === PivotSourceKind.Lost) {
    return undefined;
  }

  const table = book.tables.get(source.name);

  if (table === undefined || !table.headers) {
    return undefined;
  }
  return tableOf(table.sheet, {
    ...table.range,
    bottom: table.range.bottom - (table.totals ? 1 : 0),
  });
};

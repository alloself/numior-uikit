import { memoize } from 'lodash-es';
import { CellValueKind, type CellRange, type CellValue } from '../cell.types';
import { lookupKey, toText } from '../calc/coerce';
import type { CellStore } from '../cell-store';
import { EN_NUMBERS } from '../format';
import { EMPTY } from '../values';
import type { Sheet, Workbook } from '../workbook';
import {
  PivotSourceKind,
  type PivotCache,
  type PivotGroup,
  type PivotSource,
  type PivotSourceField,
  type PivotTable,
} from './pivot.types';

interface SourceArea {
  readonly sheet: Sheet;
  readonly range: CellRange;
}

interface KeptCaches {
  readonly revision: number;
  readonly caches: Map<string, PivotCache | undefined>;
}

const kept = new WeakMap<CellStore, KeptCaches>();

const NUMERIC_SAMPLE = 200;

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

const fieldNamesOf = (header: readonly CellValue[]): string[] | undefined => {
  const taken = new Set<string>();

  if (header.length === 0 || header.some((value) => value.kind === CellValueKind.Empty)) {
    return undefined;
  }
  return header.map((value) => uniqueName(taken, toText(value, EN_NUMBERS)));
};

export const buildPivotCache = (source: PivotTable): PivotCache | undefined => {
  const names = fieldNamesOf(source.header);

  if (names === undefined) {
    return undefined;
  }

  const fields = names.map((name) => ({ name }));

  return {
    fields,
    count: source.count,
    values: (field) => source.column(field),
    group: memoize((field: number) =>
      fields[field] === undefined ? undefined : groupOf(source.column(field)),
    ),
  };
};

const tableOf = (sheet: Sheet, range: CellRange): PivotTable => {
  const width = range.right - range.left + 1;
  const count = range.bottom - range.top;

  return {
    header: Array.from({ length: width }, (_, at) => sheet.cells.get(range.top, range.left + at)),
    count,
    column: memoize((index: number): readonly CellValue[] => {
      const values = Array.from({ length: count }, (): CellValue => EMPTY);
      const col = range.left + index;

      if (index >= 0 && index < width && count > 0) {
        sheet.cells.forEachInRange(
          { top: range.top + 1, bottom: range.bottom, left: col, right: col },
          (row, _col, value) => {
            values[row - range.top - 1] = value;
          },
        );
      }
      return values;
    }),
  };
};

export const pivotTableOf = (rows: readonly (readonly CellValue[])[]): PivotTable => {
  const header = rows[0] ?? [];

  return {
    header,
    count: Math.max(rows.length - 1, 0),
    column: memoize((col: number) => rows.slice(1).map((row) => row[col] ?? EMPTY)),
  };
};

export const pivotSourceArea = (book: Workbook, source: PivotSource): SourceArea | undefined => {
  if (source.kind === PivotSourceKind.Range) {
    const sheet = book.sheet(source.sheet);

    return sheet === undefined ? undefined : { sheet, range: source.range };
  }
  if (source.kind === PivotSourceKind.Lost) {
    return undefined;
  }

  const table = book.tables.get(source.name);

  if (table === undefined || !table.headers) {
    return undefined;
  }
  return {
    sheet: table.sheet,
    range: { ...table.range, bottom: table.range.bottom - (table.totals ? 1 : 0) },
  };
};

const cachesOf = (cells: CellStore): Map<string, PivotCache | undefined> => {
  const known = kept.get(cells);

  if (known?.revision === cells.revision) {
    return known.caches;
  }

  const caches = new Map<string, PivotCache | undefined>();

  kept.set(cells, { revision: cells.revision, caches });
  return caches;
};

export const pivotCacheOf = (book: Workbook, source: PivotSource): PivotCache | undefined => {
  const area = pivotSourceArea(book, source);

  if (area === undefined) {
    return undefined;
  }

  const { range } = area;
  const caches = cachesOf(area.sheet.cells);
  const key = [range.top, range.left, range.bottom, range.right].join(' ');

  if (!caches.has(key)) {
    caches.set(key, buildPivotCache(tableOf(area.sheet, range)));
  }
  return caches.get(key);
};

const numericColumns = (area: SourceArea): boolean[] => {
  const { range } = area;

  const seen = Array.from(
    { length: range.right - range.left + 1 },
    (): boolean | undefined => undefined,
  );

  const sample: CellRange = {
    ...range,
    top: range.top + 1,
    bottom: Math.min(range.bottom, range.top + NUMERIC_SAMPLE),
  };

  if (sample.top <= sample.bottom) {
    area.sheet.cells.forEachInRange(sample, (_row, col, value) => {
      const at = col - range.left;

      seen[at] = seen[at] !== false && value.kind === CellValueKind.Number;
    });
  }
  return seen.map((numeric) => numeric === true);
};

export const pivotSourceFields = (
  book: Workbook,
  source: PivotSource,
): PivotSourceField[] | undefined => {
  const area = pivotSourceArea(book, source);

  if (area === undefined) {
    return undefined;
  }

  const { range } = area;

  const header = Array.from({ length: range.right - range.left + 1 }, (_, at) =>
    area.sheet.cells.get(range.top, range.left + at),
  );

  const names = fieldNamesOf(header);
  const numeric = numericColumns(area);

  return names?.map((name, at) => ({ name, numeric: numeric[at] === true }));
};

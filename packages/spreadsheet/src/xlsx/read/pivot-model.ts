import type { CellRange, CellValue } from '../../core/cell.types';
import { pivotCaptions } from '../../core/pivot/pivot.messages';
import type {
  PivotBaseItem,
  PivotCaptions,
  PivotDefinition,
  PivotField,
  PivotLanguage,
  PivotLayout,
  PivotShowAs,
  PivotSource,
  PivotValue,
} from '../../core/pivot/pivot.types';
import { EMPTY } from '../../core/values';
import type { Sheet, SheetPivot, Workbook } from '../../core/workbook';
import type { CacheEntry, DataFieldEntry, PivotFieldEntry, PivotTableEntry } from './pivot-part';

export interface PivotContext {
  readonly book: Workbook;
  readonly sheet: Sheet;
  readonly numberFormat: (id: number) => string;
}

export type PivotReading =
  | { readonly ok: true; readonly pivot: SheetPivot }
  | { readonly ok: false; readonly reasons: readonly string[] };

type BasedShow = Extract<PivotShowAs, { readonly item: unknown }>['kind'];

type PlainShow = Exclude<PivotShowAs['kind'], 'normal' | 'runTotal' | BasedShow>;

const PREVIOUS = 1_048_828;

const NEXT = 1_048_829;

const SUBTOTAL_MARKS = new Set([undefined, 'default']);

const PLAIN_SHOWS: ReadonlyMap<string, PlainShow> = new Map([
  ['percentOfTotal', 'percentOfTotal'],
  ['percentOfRow', 'percentOfRow'],
  ['percentOfCol', 'percentOfCol'],
  ['index', 'index'],
]);

const BASED_SHOWS: ReadonlyMap<string, BasedShow> = new Map([
  ['difference', 'difference'],
  ['percent', 'percent'],
  ['percentDiff', 'percentDiff'],
]);

const CAPTION_KEYS: Readonly<Record<string, keyof PivotCaptions>> = {
  dataCaption: 'values',
  grandTotalCaption: 'grandTotal',
  rowHeaderCaption: 'rows',
  colHeaderCaption: 'columns',
};

const RUSSIAN = new Set(Object.values(pivotCaptions('ru')));

const itemAt = (
  table: PivotTableEntry,
  cache: CacheEntry,
  field: number,
  item: number,
): CellValue | undefined => {
  const x = table.fields[field]?.items[item]?.x;

  return x === undefined ? undefined : (cache.items[field]?.[x] ?? EMPTY);
};

const fieldOf = (entry: PivotFieldEntry, items: readonly CellValue[]): PivotField => {
  const values = entry.items.reduce<{ order: CellValue[]; hidden: CellValue[] }>(
    (found, item) => {
      const value = item.x === undefined ? undefined : (items[item.x] ?? EMPTY);

      if (value !== undefined) {
        found.order.push(value);
        if (item.hidden) {
          found.hidden.push(value);
        }
      }
      return found;
    },
    { order: [], hidden: [] },
  );

  return {
    ...values,
    sort: entry.sort === 'ascending' || entry.sort === 'descending' ? entry.sort : 'manual',
    subtotal: entry.subtotal,
  };
};

const layoutOf = (table: PivotTableEntry): PivotLayout | undefined => {
  const layouts = new Set(
    table.rows.reduce<PivotLayout[]>((found, field) => {
      const entry = table.fields[field];

      if (entry !== undefined) {
        found.push(entry.compact ? 'compact' : entry.outline ? 'outline' : 'tabular');
      }
      return found;
    }, []),
  );

  return layouts.size > 1 ? undefined : ([...layouts][0] ?? 'compact');
};

const baseItemOf = (
  table: PivotTableEntry,
  cache: CacheEntry,
  entry: DataFieldEntry,
): PivotBaseItem | undefined => {
  if (entry.baseItem === PREVIOUS) {
    return 'previous';
  }
  if (entry.baseItem === NEXT) {
    return 'next';
  }
  return itemAt(table, cache, entry.baseField, entry.baseItem);
};

const showOf = (
  table: PivotTableEntry,
  cache: CacheEntry,
  entry: DataFieldEntry,
): PivotShowAs | undefined => {
  const plain = PLAIN_SHOWS.get(entry.showAs);
  const based = BASED_SHOWS.get(entry.showAs);

  if (entry.showAs === 'normal') {
    return { kind: 'normal' };
  }
  if (plain !== undefined) {
    return { kind: plain };
  }
  if (entry.showAs === 'runTotal') {
    return { kind: 'runTotal', field: entry.baseField };
  }

  const item = baseItemOf(table, cache, entry);

  return based === undefined || item === undefined
    ? undefined
    : { kind: based, field: entry.baseField, item };
};

const sourceOf = (cache: CacheEntry, book: Workbook): PivotSource | undefined => {
  const { source } = cache;

  if (source?.kind === 'range') {
    return source;
  }
  return source !== undefined && book.tables.get(source.name) !== undefined
    ? { kind: 'table', name: source.name }
    : undefined;
};

const footprintOf = (table: PivotTableEntry, location: CellRange): CellRange => {
  const pageRows = table.pageRows > 0 ? table.pageRows + 1 : 0;

  return {
    top: location.top - pageRows,
    left: location.left,
    bottom: location.bottom,
    right: Math.max(location.right, location.left + (pageRows > 0 ? 1 : 0)),
  };
};

const languageOf = (sheet: Sheet, footprint: CellRange): PivotLanguage => {
  let russian = false;

  sheet.cells.forEachInRange(footprint, (_row, _col, value) => {
    russian ||= value.kind === 'string' && RUSSIAN.has(value.value);
  });

  return russian ? 'ru' : 'en';
};

const captionsOf = (table: PivotTableEntry, language: PivotLanguage): PivotCaptions =>
  Object.entries(table.captions).reduce<PivotCaptions>((captions, [attribute, text]) => {
    const key = CAPTION_KEYS[attribute];

    return key === undefined ? captions : { ...captions, [key]: text };
  }, pivotCaptions(language));

const valuesOf = (
  table: PivotTableEntry,
  cache: CacheEntry,
  numberFormat: (id: number) => string,
): PivotValue[] | undefined => {
  const values = table.values.map((entry) => {
    const showAs = showOf(table, cache, entry);
    const format = entry.format === undefined ? 'General' : numberFormat(entry.format);

    return showAs === undefined
      ? undefined
      : {
          field: entry.field,
          aggregate: entry.aggregate,
          name: entry.name,
          showAs,
          format: format === 'General' ? undefined : format,
        };
  });

  return values.every((value): value is PivotValue => value !== undefined) ? values : undefined;
};

const reasonsOf = (table: PivotTableEntry, cache: CacheEntry): string[] => [
  ...cache.unsupported,
  ...table.unsupported,
  ...(table.fields.length === cache.items.length ? [] : ['fields']),
  ...(table.fields.some((field) =>
    field.items.some((item) => !SUBTOTAL_MARKS.has(item.type) && item.x === undefined),
  )
    ? ['subtotals']
    : []),
  ...(table.rows.some((field) => {
    const entry = table.fields[field];

    return entry !== undefined && !entry.subtotalTop && (entry.compact || entry.outline);
  })
    ? ['subtotal-position']
    : []),
];

export const pivotOf = (
  table: PivotTableEntry,
  cache: CacheEntry,
  context: PivotContext,
): PivotReading => {
  const reasons = reasonsOf(table, cache);
  const source = sourceOf(cache, context.book);
  const layout = layoutOf(table);
  const values = valuesOf(table, cache, context.numberFormat);
  const { location } = table;

  if (
    reasons.length > 0 ||
    source === undefined ||
    layout === undefined ||
    values === undefined ||
    location === undefined
  ) {
    return {
      ok: false,
      reasons: [
        ...reasons,
        ...(source === undefined ? ['source'] : []),
        ...(layout === undefined ? ['layout'] : []),
        ...(values === undefined ? ['values'] : []),
      ],
    };
  }

  const footprint = footprintOf(table, location);

  const definition: PivotDefinition = {
    source,
    rows: table.rows,
    columns: table.columns,
    filters: table.pages.map((page) => ({
      field: page.field,
      selected: page.item === undefined ? undefined : itemAt(table, cache, page.field, page.item),
    })),
    values,
    fields: table.fields.map((field, index) => fieldOf(field, cache.items[index] ?? [])),
    layout,
    rowTotals: table.rowTotals,
    columnTotals: table.columnTotals,
    captions: captionsOf(table, languageOf(context.sheet, footprint)),
  };

  return {
    ok: true,
    pivot: {
      name: table.name,
      sheet: context.sheet,
      anchor: { row: footprint.top, col: footprint.left },
      definition,
      footprint,
    },
  };
};

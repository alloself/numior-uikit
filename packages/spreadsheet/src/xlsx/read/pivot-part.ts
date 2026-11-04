import { parseRange } from '../../core/address';
import type { CellRange, CellValue } from '../../core/cell.types';
import type { PivotAggregate } from '../../core/pivot/pivot.types';
import { EMPTY } from '../../core/values';
import { XmlBoolean, type XmlAttribute } from '../xml/xml.types';
import type { ZipArchive } from '../zip/zip.types';
import {
  MAIN,
  RELATIONSHIP_ATTRIBUTES,
  attributeOf,
  numberOf,
  readPart,
  truthy,
  type PartOptions,
} from './ooxml';
import { X14 } from './conditional-part';
import { valueOf } from './sheet-part';
import { CacheSourceType, OoxmlElement } from '../ooxml.types';

export interface CacheEntry {
  readonly source:
    | { readonly kind: 'range'; readonly sheet: string; readonly range: CellRange }
    | { readonly kind: 'name'; readonly name: string }
    | undefined;
  readonly items: readonly (readonly CellValue[])[];
  readonly unsupported: readonly string[];
}

export interface PivotItemEntry {
  readonly x: number | undefined;
  readonly type: string | undefined;
  readonly hidden: boolean;
}

export interface PivotFieldEntry {
  readonly axis: string | undefined;
  readonly sort: string | undefined;
  readonly subtotal: boolean;
  readonly compact: boolean;
  readonly outline: boolean;
  readonly subtotalTop: boolean;
  readonly items: PivotItemEntry[];
}

export interface DataFieldEntry {
  readonly name: string;
  readonly field: number;
  readonly aggregate: PivotAggregate;
  readonly showAs: string;
  readonly baseField: number;
  readonly baseItem: number;
  readonly format: number | undefined;
}

export interface PivotTableEntry {
  readonly name: string;
  readonly cacheId: number;
  readonly location: CellRange | undefined;
  readonly pageRows: number;
  readonly rowTotals: boolean;
  readonly columnTotals: boolean;
  readonly captions: Readonly<Record<string, string>>;
  readonly fields: PivotFieldEntry[];
  readonly rows: number[];
  readonly columns: number[];
  readonly pages: { readonly field: number; readonly item: number | undefined }[];
  readonly values: DataFieldEntry[];
  readonly unsupported: string[];
}

const AGGREGATES: readonly PivotAggregate[] = [
  'sum',
  'count',
  'average',
  'max',
  'min',
  'product',
  'countNums',
  'stdDev',
  'stdDevp',
  'var',
  'varp',
];

const ITEM_TYPES: Readonly<Record<string, string>> = { s: 'str', n: 'n', b: 'b', e: 'e', d: 'd' };

const CAPTIONS = [
  'dataCaption',
  'grandTotalCaption',
  'rowHeaderCaption',
  'colHeaderCaption',
  'missingCaption',
];

const UNSUPPORTED_TABLE = new Set(['filters', 'calculatedItems', 'conditionalFormats']);

const UNSUPPORTED_CACHE = new Set(['fieldGroup', 'calculatedItems', 'cacheHierarchies']);

const aggregateOf = (text: string | undefined): PivotAggregate =>
  AGGREGATES.find((aggregate) => aggregate === text) ?? 'sum';

const itemValue = (local: string, attributes: Parameters<typeof attributeOf>[0]): CellValue => {
  const type = ITEM_TYPES[local];

  return type === undefined
    ? EMPTY
    : valueOf({ type, value: attributeOf(attributes, 'v') ?? '', inline: '' }, []);
};

const cacheSourceOf = (attributes: readonly XmlAttribute[]): CacheEntry['source'] => {
  const name = attributeOf(attributes, 'name');
  const sheet = attributeOf(attributes, 'sheet');
  const range = parseRange(attributeOf(attributes, 'ref') ?? '');

  if (name !== undefined) {
    return { kind: 'name', name };
  }
  return sheet === undefined || range === undefined ? undefined : { kind: 'range', sheet, range };
};

const cacheProblems = (local: string, attributes: readonly XmlAttribute[]): string[] => {
  const found = UNSUPPORTED_CACHE.has(local) ? [local] : [];

  if (
    local === OoxmlElement.CacheSource &&
    attributeOf(attributes, 'type') !== CacheSourceType.Worksheet
  ) {
    found.push('source');
  }
  if (
    local === OoxmlElement.WorksheetSource &&
    attributeOf(attributes, 'id', RELATIONSHIP_ATTRIBUTES) !== undefined
  ) {
    found.push('external');
  }
  if (
    local === OoxmlElement.CacheField &&
    (attributeOf(attributes, 'formula') !== undefined ||
      attributeOf(attributes, 'databaseField') === XmlBoolean.Zero)
  ) {
    found.push('calculated');
  }
  return found;
};

export const readPivotCache = async (
  archive: ZipArchive,
  part: string,
  options: PartOptions,
): Promise<CacheEntry> => {
  const items: CellValue[][] = [];
  const unsupported: string[] = [];
  let source: CacheEntry['source'];
  let shared: CellValue[] | undefined;

  await readPart(
    archive,
    part,
    {
      open: (element, attributes) => {
        if (!MAIN.has(element.uri)) {
          return;
        }

        unsupported.push(...cacheProblems(element.local, attributes));

        if (element.local === OoxmlElement.WorksheetSource) {
          source = cacheSourceOf(attributes);
        } else if (element.local === OoxmlElement.CacheField) {
          shared = [];
          items.push(shared);
        } else if (element.local === OoxmlElement.M || ITEM_TYPES[element.local] !== undefined) {
          shared?.push(itemValue(element.local, attributes));
        }
      },
      close: (element) => {
        if (element.local === OoxmlElement.CacheField) {
          shared = undefined;
        }
      },
    },
    options,
  );

  return { source, items, unsupported };
};

const emptyTable = (): PivotTableEntry => ({
  name: '',
  cacheId: -1,
  location: undefined,
  pageRows: 0,
  rowTotals: true,
  columnTotals: true,
  captions: {},
  fields: [],
  rows: [],
  columns: [],
  pages: [],
  values: [],
  unsupported: [],
});

const tableHead = (
  table: PivotTableEntry,
  attributes: Parameters<typeof attributeOf>[0],
): PivotTableEntry => ({
  ...table,
  name: attributeOf(attributes, 'name') ?? '',
  cacheId: numberOf(attributeOf(attributes, 'cacheId'), -1),
  rowTotals: attributeOf(attributes, 'rowGrandTotals') !== XmlBoolean.Zero,
  columnTotals: attributeOf(attributes, 'colGrandTotals') !== XmlBoolean.Zero,
  captions: Object.fromEntries(
    CAPTIONS.reduce<[string, string][]>((found, caption) => {
      const text = attributeOf(attributes, caption);

      if (text !== undefined) {
        found.push([caption, text]);
      }
      return found;
    }, []),
  ),
});

const fieldOf = (attributes: Parameters<typeof attributeOf>[0]): PivotFieldEntry => ({
  axis: attributeOf(attributes, 'axis'),
  sort: attributeOf(attributes, 'sortType'),
  subtotal: attributeOf(attributes, 'defaultSubtotal') !== XmlBoolean.Zero,
  compact: attributeOf(attributes, 'compact') !== XmlBoolean.Zero,
  outline: attributeOf(attributes, 'outline') !== XmlBoolean.Zero,
  subtotalTop: attributeOf(attributes, 'subtotalTop') !== XmlBoolean.Zero,
  items: [],
});

const dataFieldOf = (attributes: Parameters<typeof attributeOf>[0]): DataFieldEntry => {
  const format = attributeOf(attributes, 'numFmtId');

  return {
    name: attributeOf(attributes, 'name') ?? '',
    field: numberOf(attributeOf(attributes, 'fld'), 0),
    aggregate: aggregateOf(attributeOf(attributes, 'subtotal')),
    showAs: attributeOf(attributes, 'showDataAs') ?? 'normal',
    baseField: numberOf(attributeOf(attributes, 'baseField'), -1),
    baseItem: numberOf(attributeOf(attributes, 'baseItem'), -1),
    format: format === undefined ? undefined : numberOf(format, 0),
  };
};

const optionalNumber = (text: string | undefined): number | undefined =>
  text === undefined ? undefined : numberOf(text, 0);

const LISTS: Readonly<Record<string, 'rows' | 'columns'>> = {
  rowFields: 'rows',
  colFields: 'columns',
};

const headed = (
  table: PivotTableEntry,
  local: string,
  attributes: readonly XmlAttribute[],
): PivotTableEntry => {
  if (local === OoxmlElement.PivotTableDefinition) {
    return tableHead(table, attributes);
  }
  return local === OoxmlElement.Location
    ? {
        ...table,
        location: parseRange(attributeOf(attributes, 'ref') ?? ''),
        pageRows: numberOf(attributeOf(attributes, 'rowPageCount'), 0),
      }
    : table;
};

const collect = (
  table: PivotTableEntry,
  local: string,
  attributes: readonly XmlAttribute[],
  list: 'rows' | 'columns' | undefined,
): void => {
  switch (local) {
    case OoxmlElement.PivotField:
      table.fields.push(fieldOf(attributes));
      return;
    case OoxmlElement.Item:
      table.fields.at(-1)?.items.push({
        x: optionalNumber(attributeOf(attributes, 'x')),
        type: attributeOf(attributes, 't'),
        hidden: truthy(attributeOf(attributes, 'h')),
      });

      return;
    case OoxmlElement.Field:
      if (list !== undefined) {
        table[list].push(numberOf(attributeOf(attributes, 'x'), 0));
      }
      return;
    case OoxmlElement.PageField:
      table.pages.push({
        field: numberOf(attributeOf(attributes, 'fld'), 0),
        item: optionalNumber(attributeOf(attributes, 'item')),
      });

      return;
    case OoxmlElement.DataField:
      table.values.push(dataFieldOf(attributes));
      return;
    default:
      return;
  }
};

export const readPivotTable = async (
  archive: ZipArchive,
  part: string,
  options: PartOptions,
): Promise<PivotTableEntry> => {
  let table = emptyTable();
  let list: 'rows' | 'columns' | undefined;

  await readPart(
    archive,
    part,
    {
      open: (element, attributes) => {
        if (element.uri === X14 && attributeOf(attributes, 'pivotShowAs') !== undefined) {
          table.unsupported.push('showAs');
        }
        if (!MAIN.has(element.uri)) {
          return;
        }
        if (UNSUPPORTED_TABLE.has(element.local)) {
          table.unsupported.push(element.local);
        }
        table = headed(table, element.local, attributes);
        list = LISTS[element.local] ?? list;
        collect(table, element.local, attributes, list);
      },
      close: (element) => {
        if (LISTS[element.local] !== undefined) {
          list = undefined;
        }
      },
    },
    options,
  );

  return table;
};

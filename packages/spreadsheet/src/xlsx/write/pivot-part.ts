import { formatRange } from '../../core/address';
import type { CellRange, CellValue } from '../../core/cell.types';
import { pivotKey } from '../../core/pivot/pivot-cache';
import { itemOrder, normalizedPivot, pivotFieldOf } from '../../core/pivot/pivot-engine';
import { pivotCaptions } from '../../core/pivot/pivot.messages';
import type {
  PivotCache,
  PivotDefinition,
  PivotOutput,
  PivotValue,
} from '../../core/pivot/pivot.types';
import type { SheetPivot } from '../../core/workbook';
import { escapeAttribute } from '../xml/writer';
import { encodeXstring } from '../xml/xstring';
import type { StyleBook } from './styles-part';

export interface PivotXml {
  readonly cache: string;
  readonly table: string;
}

interface Kinds {
  string: boolean;
  number: boolean;
  integer: boolean;
  blank: boolean;
  other: boolean;
  min: number;
  max: number;
}

const MAIN = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';

const OFFICE = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

const HEADER = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n';

const PREVIOUS = 1_048_828;

const NEXT = 1_048_829;

const ENGLISH = pivotCaptions('en');

const attribute = (name: string, value: string | number | undefined): string =>
  value === undefined ? '' : ` ${name}="${escapeAttribute(encodeXstring(String(value)))}"`;

const flag = (name: string, on: boolean): string => (on ? ` ${name}="1"` : '');

const kindsOf = (values: readonly CellValue[]): Kinds =>
  values.reduce<Kinds>(
    (kinds, value) => {
      switch (value.kind) {
        case 'string':
          kinds.string = true;
          break;
        case 'number':
          kinds.number = true;
          kinds.integer &&= Number.isInteger(value.value);
          kinds.min = Math.min(kinds.min, value.value);
          kinds.max = Math.max(kinds.max, value.value);
          break;
        case 'empty':
          kinds.blank = true;
          break;
        default:
          kinds.other = true;
      }
      return kinds;
    },
    {
      string: false,
      number: false,
      integer: true,
      blank: false,
      other: false,
      min: Number.POSITIVE_INFINITY,
      max: Number.NEGATIVE_INFINITY,
    },
  );

const itemXml = (value: CellValue): string => {
  switch (value.kind) {
    case 'string':
      return `<s${attribute('v', value.value)}/>`;
    case 'number':
      return `<n v="${String(value.value)}"/>`;
    case 'boolean':
      return `<b v="${value.value ? '1' : '0'}"/>`;
    case 'error':
      return `<e${attribute('v', value.code)}/>`;
    default:
      return '<m/>';
  }
};

const sharedItemsXml = (
  values: readonly CellValue[],
  items: readonly CellValue[] | undefined,
): string => {
  const kinds = kindsOf(values);
  const mixed = Number(kinds.string) + Number(kinds.number) + Number(kinds.other) > 1;

  const head = `<sharedItems${kinds.string || kinds.blank ? '' : ' containsSemiMixedTypes="0"'}${
    kinds.string ? '' : ' containsString="0"'
  }${flag('containsNumber', kinds.number)}${flag('containsInteger', kinds.number && kinds.integer)}${
    kinds.number ? `${attribute('minValue', kinds.min)}${attribute('maxValue', kinds.max)}` : ''
  }${flag('containsBlank', kinds.blank)}${flag('containsMixedTypes', mixed)}`;

  return items === undefined
    ? `${head}/>`
    : `${head}${attribute('count', items.length)}>${items.map(itemXml).join('')}</sharedItems>`;
};

const grouped = (definition: PivotDefinition): Set<number> =>
  new Set([
    ...definition.rows,
    ...definition.columns,
    ...definition.filters.map((filter) => filter.field),
  ]);

const sourceXml = (pivot: SheetPivot, range: CellRange | undefined): string => {
  const { source } = pivot.definition;

  if (source.kind === 'table') {
    return `<worksheetSource${attribute('name', source.name)}/>`;
  }
  return `<worksheetSource${attribute('ref', range === undefined ? '#REF!' : formatRange(range))}${
    source.kind === 'range' ? attribute('sheet', source.sheet) : ''
  }/>`;
};

const cacheXml = (pivot: SheetPivot, cache: PivotCache): string => {
  const groups = grouped(pivot.definition);

  const range =
    pivot.definition.source.kind === 'range' ? pivot.definition.source.range : undefined;

  return [
    HEADER,
    `<pivotCacheDefinition xmlns="${MAIN}" xmlns:r="${OFFICE}" saveData="0" refreshOnLoad="1" createdVersion="8" refreshedVersion="8" minRefreshableVersion="3"${attribute('recordCount', cache.count)}>`,
    `<cacheSource type="worksheet">${sourceXml(pivot, range)}</cacheSource>`,
    `<cacheFields${attribute('count', cache.fields.length)}>`,
    ...cache.fields.map(
      (field, index) =>
        `<cacheField${attribute('name', field.name)} numFmtId="0">${sharedItemsXml(
          field.values,
          groups.has(index) ? cache.group(index)?.items : undefined,
        )}</cacheField>`,
    ),
    '</cacheFields></pivotCacheDefinition>',
  ].join('');
};

const orderOf = (definition: PivotDefinition, cache: PivotCache, field: number): number[] =>
  itemOrder(pivotFieldOf(definition, field), cache.group(field)?.items ?? []);

const positionOf = (
  definition: PivotDefinition,
  cache: PivotCache,
  field: number,
  value: CellValue,
): number => {
  const items = cache.group(field)?.items ?? [];
  const wanted = pivotKey(value);

  return orderOf(definition, cache, field).findIndex(
    (index) => pivotKey(items[index] ?? value) === wanted,
  );
};

const axisOf = (definition: PivotDefinition, field: number): string | undefined => {
  if (definition.rows.includes(field)) {
    return 'axisRow';
  }
  if (definition.columns.includes(field)) {
    return 'axisCol';
  }
  return definition.filters.some((filter) => filter.field === field) ? 'axisPage' : undefined;
};

const layoutXml = (definition: PivotDefinition): string => {
  switch (definition.layout) {
    case 'compact':
      return '';
    case 'outline':
      return ' compact="0"';
    case 'tabular':
      return ' compact="0" outline="0"';
  }
};

const pivotFieldXml = (definition: PivotDefinition, cache: PivotCache, field: number): string => {
  const axis = axisOf(definition, field);
  const data = definition.values.some((value) => value.field === field);
  const settings = pivotFieldOf(definition, field);
  const items = cache.group(field)?.items ?? [];
  const hidden = new Set(settings.hidden.map(pivotKey));
  const head = `<pivotField${attribute('axis', axis)}${flag('dataField', data)}${layoutXml(definition)} showAll="0"`;

  if (axis === undefined) {
    return `${head}/>`;
  }

  const order = orderOf(definition, cache, field);

  const listed = order.map(
    (index) =>
      `<item${flag('h', hidden.has(pivotKey(items[index] ?? { kind: 'empty' })))} x="${String(index)}"/>`,
  );

  return `${head}${settings.sort === 'manual' ? '' : attribute('sortType', settings.sort)}${
    settings.subtotal ? '' : ' defaultSubtotal="0"'
  }><items${attribute('count', listed.length + (settings.subtotal ? 1 : 0))}>${listed.join('')}${
    settings.subtotal ? '<item t="default"/>' : ''
  }</items></pivotField>`;
};

const fieldsXml = (name: string, fields: readonly number[]): string =>
  fields.length === 0
    ? ''
    : `<${name}${attribute('count', fields.length)}>${fields
        .map((field) => `<field x="${String(field)}"/>`)
        .join('')}</${name}>`;

const baseOf = (definition: PivotDefinition, cache: PivotCache, value: PivotValue): string => {
  const show = value.showAs;

  if (show.kind === 'runTotal') {
    return `${attribute('baseField', show.field)} baseItem="0"`;
  }
  if (!('item' in show)) {
    return ' baseField="0" baseItem="0"';
  }

  const item =
    show.item === 'previous'
      ? PREVIOUS
      : show.item === 'next'
        ? NEXT
        : Math.max(positionOf(definition, cache, show.field, show.item), 0);

  return `${attribute('baseField', show.field)}${attribute('baseItem', item)}`;
};

const dataFieldXml = (
  definition: PivotDefinition,
  cache: PivotCache,
  value: PivotValue,
  styles: StyleBook,
): string =>
  `<dataField${attribute('name', value.name)}${attribute('fld', value.field)}${
    value.aggregate === 'sum' ? '' : attribute('subtotal', value.aggregate)
  }${value.showAs.kind === 'normal' ? '' : attribute('showDataAs', value.showAs.kind)}${baseOf(
    definition,
    cache,
    value,
  )}${value.format === undefined ? '' : attribute('numFmtId', styles.numberFormat(value.format))}/>`;

const captionAttributes = (definition: PivotDefinition): string => {
  const { captions } = definition;

  return `${attribute('dataCaption', captions.values)}${
    captions.grandTotal === ENGLISH.grandTotal
      ? ''
      : attribute('grandTotalCaption', captions.grandTotal)
  }${captions.rows === ENGLISH.rows ? '' : attribute('rowHeaderCaption', captions.rows)}${
    captions.columns === ENGLISH.columns ? '' : attribute('colHeaderCaption', captions.columns)
  }`;
};

const locationXml = (pivot: SheetPivot, output: PivotOutput): string => {
  const top = pivot.anchor.row + output.pageRows;

  const ref = formatRange({
    top,
    left: pivot.anchor.col,
    bottom: Math.max(pivot.anchor.row + output.size.row - 1, top),
    right: pivot.anchor.col + output.width - 1,
  });

  const pages = pivot.definition.filters.length;

  return `<location${attribute('ref', ref)}${attribute('firstHeaderRow', output.firstHeaderRow)}${attribute(
    'firstDataRow',
    output.firstDataRow,
  )}${attribute('firstDataCol', output.firstDataCol)}${
    pages === 0 ? '' : `${attribute('rowPageCount', pages)} colPageCount="1"`
  }/>`;
};

const tableXml = (
  pivot: SheetPivot,
  cache: PivotCache,
  output: PivotOutput,
  context: { readonly cacheId: number; readonly styles: StyleBook },
): string => {
  const definition = normalizedPivot(pivot.definition);

  return [
    HEADER,
    `<pivotTableDefinition xmlns="${MAIN}"${attribute('name', pivot.name)}${attribute('cacheId', context.cacheId)} applyNumberFormats="0" applyBorderFormats="0" applyFontFormats="0" applyPatternFormats="0" applyAlignmentFormats="0" applyWidthHeightFormats="1"${captionAttributes(definition)} updatedVersion="8" minRefreshableVersion="3" useAutoFormatting="1" itemPrintTitles="1" createdVersion="8" indent="0"${
      definition.layout === 'compact' ? '' : ' compact="0" compactData="0"'
    } outline="1" outlineData="1" multipleFieldFilters="0"${definition.rowTotals ? '' : ' rowGrandTotals="0"'}${
      definition.columnTotals ? '' : ' colGrandTotals="0"'
    }>`,
    locationXml(pivot, output),
    `<pivotFields${attribute('count', cache.fields.length)}>`,
    ...cache.fields.map((_, field) => pivotFieldXml(definition, cache, field)),
    '</pivotFields>',
    fieldsXml('rowFields', definition.rows),
    fieldsXml('colFields', definition.columns),
    definition.filters.length === 0
      ? ''
      : `<pageFields${attribute('count', definition.filters.length)}>${definition.filters
          .map(
            (filter) =>
              `<pageField${attribute('fld', filter.field)}${
                filter.selected === undefined
                  ? ''
                  : attribute('item', positionOf(definition, cache, filter.field, filter.selected))
              } hier="-1"/>`,
          )
          .join('')}</pageFields>`,
    `<dataFields${attribute('count', definition.values.length)}>${definition.values
      .map((value) => dataFieldXml(definition, cache, value, context.styles))
      .join('')}</dataFields>`,
    '<pivotTableStyleInfo name="PivotStyleLight16" showRowHeaders="1" showColHeaders="1" showRowStripes="0" showColStripes="0" showLastColumn="1"/>',
    '</pivotTableDefinition>',
  ].join('');
};

export const pivotXml = (
  pivot: SheetPivot,
  cache: PivotCache,
  output: PivotOutput,
  context: { readonly cacheId: number; readonly styles: StyleBook },
): PivotXml => ({ cache: cacheXml(pivot, cache), table: tableXml(pivot, cache, output, context) });

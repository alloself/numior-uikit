import { MAX_COLS, MAX_ROWS, formatCell, formatRange } from '../../core/address';
import type { CellValue } from '../../core/cell.types';
import type { FormulaNode } from '../../core/formula/formula.types';
import { FILE_FORMULAS } from '../../core/formula/locale';
import { ORIGIN } from '../../core/formula/origin';
import { printFormula } from '../../core/formula/printer';
import { mapReferences } from '../../core/formula/references';
import type { ExternalBook, Sheet, SheetTable, Workbook } from '../../core/workbook';
import { escapeAttribute, escapeText } from '../xml/writer';
import { encodeXstring } from '../xml/xstring';
import { withFuturePrefixes } from './future-functions';

export interface PlannedSheet {
  readonly name: string;
  readonly sheetId: number;
  readonly relationship: string;
  readonly hidden: boolean;
}

export interface PlannedRelationship {
  readonly id: string;
  readonly type: string;
  readonly target: string;
  readonly external?: boolean | undefined;
}

const HEADER = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n';

const MAIN = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';

export const OFFICE = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

const PACKAGE = 'http://schemas.openxmlformats.org/package/2006/relationships';

const CONTENT_TYPES = 'http://schemas.openxmlformats.org/package/2006/content-types';

export const TYPES = {
  workbook: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml',
  worksheet: 'application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml',
  styles: 'application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml',
  strings: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml',
  table: 'application/vnd.openxmlformats-officedocument.spreadsheetml.table+xml',
  metadata: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheetMetadata+xml',
  externalLink: 'application/vnd.openxmlformats-officedocument.spreadsheetml.externalLink+xml',
  pivotTable: 'application/vnd.openxmlformats-officedocument.spreadsheetml.pivotTable+xml',
  pivotCache:
    'application/vnd.openxmlformats-officedocument.spreadsheetml.pivotCacheDefinition+xml',
  relationships: 'application/vnd.openxmlformats-package.relationships+xml',
  xml: 'application/xml',
} as const;

export const METADATA_XML = `${HEADER}<metadata xmlns="${MAIN}" xmlns:xda="http://schemas.microsoft.com/office/spreadsheetml/2017/dynamicarray"><metadataTypes count="1"><metadataType name="XLDAPR" minSupportedVersion="120000" copy="1" pasteAll="1" pasteValues="1" merge="1" splitFirst="1" rowColShift="1" clearFormats="1" clearComments="1" assign="1" coerce="1" cellMeta="1"/></metadataTypes><futureMetadata name="XLDAPR" count="1"><bk><extLst><ext uri="{bdbb8cdc-fa1e-496e-a857-3c3f30c029c3}"><xda:dynamicArrayProperties fDynamic="1" fCollapsed="0"/></ext></extLst></bk></futureMetadata><cellMetadata count="1"><bk><rc t="1" v="0"/></bk></cellMetadata></metadata>`;

const definedNamesXml = (book: Workbook): string => {
  const names: string[] = [];

  book.names.forEach((defined) => {
    const local = defined.scope === undefined ? -1 : book.sheets.indexOf(defined.scope);
    const formula = printFormula(withFuturePrefixes(defined.ast), FILE_FORMULAS, ORIGIN);

    names.push(
      `<definedName name="${escapeAttribute(defined.name)}"${local < 0 ? '' : ` localSheetId="${String(local)}"`}>${escapeText(formula)}</definedName>`,
    );
  });

  return names.length === 0 ? '' : `<definedNames>${names.join('')}</definedNames>`;
};

const externalReferencesXml = (ids: readonly string[]): string =>
  ids.length === 0
    ? ''
    : `<externalReferences>${ids
        .map((id) => `<externalReference r:id="${escapeAttribute(id)}"/>`)
        .join('')}</externalReferences>`;

export const workbookXml = (
  book: Workbook,
  sheets: readonly PlannedSheet[],
  options: {
    readonly properties: string | undefined;
    readonly recalculate: boolean;
    readonly externals: readonly string[];
    readonly pivotCaches: string;
  },
): string =>
  [
    HEADER,
    `<workbook xmlns="${MAIN}" xmlns:r="${OFFICE}">`,
    options.properties ?? '<workbookPr/>',
    '<bookViews><workbookView/></bookViews><sheets>',
    ...sheets.map(
      (sheet) =>
        `<sheet name="${escapeAttribute(encodeXstring(sheet.name))}" sheetId="${String(sheet.sheetId)}"${sheet.hidden ? ' state="hidden"' : ''} r:id="${sheet.relationship}"/>`,
    ),
    '</sheets>',
    externalReferencesXml(options.externals),
    definedNamesXml(book),
    `<calcPr calcId="191029"${options.recalculate ? ' fullCalcOnLoad="1"' : ''}/>`,
    options.pivotCaches,
    '</workbook>',
  ].join('');

const WHOLE = { top: 0, left: 0, bottom: MAX_ROWS - 1, right: MAX_COLS - 1 };

const localFormula = (ast: FormulaNode): string =>
  printFormula(
    mapReferences(ast, (reference) =>
      reference.kind === 'structured' ? reference : { ...reference, book: undefined },
    ),
    FILE_FORMULAS,
    ORIGIN,
  );

const cachedCellXml = (row: number, col: number, value: CellValue): string => {
  const reference = formatCell({ row, col, rowAbsolute: false, colAbsolute: false });

  switch (value.kind) {
    case 'number':
      return `<cell r="${reference}"><v>${String(value.value)}</v></cell>`;
    case 'string':
      return `<cell r="${reference}" t="str"><v>${escapeText(encodeXstring(value.value))}</v></cell>`;
    case 'boolean':
      return `<cell r="${reference}" t="b"><v>${value.value ? '1' : '0'}</v></cell>`;
    case 'error':
      return `<cell r="${reference}" t="e"><v>${escapeText(value.code)}</v></cell>`;
    default:
      return '';
  }
};

const cachedSheetXml = (sheet: Sheet, index: number): string => {
  const rows = new Map<number, [number, string][]>();

  sheet.cells.forEachInRange(WHOLE, (row, col, value) => {
    const cells = rows.get(row) ?? [];

    cells.push([col, cachedCellXml(row, col, value)]);
    rows.set(row, cells);
  });

  return `<sheetData sheetId="${String(index)}">${[...rows]
    .toSorted(([left], [right]) => left - right)
    .map(
      ([row, cells]) =>
        `<row r="${String(row + 1)}">${cells
          .toSorted(([left], [right]) => left - right)
          .map(([, xml]) => xml)
          .join('')}</row>`,
    )
    .join('')}</sheetData>`;
};

const externalNamesXml = (external: ExternalBook): string => {
  const names = external.names.reduce<string[]>((found, entry) => {
    const scope = external.sheets.findIndex((sheet) => sheet.name === entry.sheet);

    if (entry.ast !== undefined) {
      found.push(
        `<definedName name="${escapeAttribute(entry.name)}" refersTo="${escapeAttribute(`=${localFormula(entry.ast)}`)}"${scope < 0 ? '' : ` sheetId="${String(scope)}"`}/>`,
      );
    }
    return found;
  }, []);

  return names.length === 0 ? '' : `<definedNames>${names.join('')}</definedNames>`;
};

export const externalLinkXml = (external: ExternalBook): string =>
  [
    HEADER,
    `<externalLink xmlns="${MAIN}" xmlns:r="${OFFICE}"><externalBook r:id="rId1"><sheetNames>`,
    ...external.sheets.map(
      (sheet) => `<sheetName val="${escapeAttribute(encodeXstring(sheet.name))}"/>`,
    ),
    '</sheetNames>',
    externalNamesXml(external),
    `<sheetDataSet>${external.sheets.map(cachedSheetXml).join('')}</sheetDataSet>`,
    '</externalBook></externalLink>',
  ].join('');

export const tableXml = (table: SheetTable, id: number): string => {
  const reference = formatRange(table.range);

  const filter = table.headers
    ? `<autoFilter ref="${formatRange({ ...table.range, bottom: table.range.bottom - (table.totals ? 1 : 0) })}"/>`
    : '';

  return [
    HEADER,
    `<table xmlns="${MAIN}" id="${String(id)}" name="${escapeAttribute(table.name)}" displayName="${escapeAttribute(table.name)}" ref="${reference}"`,
    table.headers ? '' : ' headerRowCount="0"',
    table.totals ? ' totalsRowCount="1"' : ' totalsRowShown="0"',
    '>',
    filter,
    `<tableColumns count="${String(table.columns.length)}">`,
    ...table.columns.map(
      (column, index) =>
        `<tableColumn id="${String(index + 1)}" name="${escapeAttribute(encodeXstring(column))}"/>`,
    ),
    '</tableColumns>',
    '<tableStyleInfo name="TableStyleMedium2" showFirstColumn="0" showLastColumn="0" showRowStripes="1" showColumnStripes="0"/>',
    '</table>',
  ].join('');
};

export const relationshipsXml = (items: readonly PlannedRelationship[]): string =>
  `${HEADER}<Relationships xmlns="${PACKAGE}">${items
    .map(
      (item) =>
        `<Relationship Id="${escapeAttribute(item.id)}" Type="${escapeAttribute(item.type)}" Target="${escapeAttribute(item.target)}"${item.external === true ? ' TargetMode="External"' : ''}/>`,
    )
    .join('')}</Relationships>`;

export const contentTypesXml = (
  defaults: ReadonlyMap<string, string>,
  overrides: ReadonlyMap<string, string>,
): string =>
  `${HEADER}<Types xmlns="${CONTENT_TYPES}">${[...defaults]
    .map(
      ([extension, type]) =>
        `<Default Extension="${escapeAttribute(extension)}" ContentType="${escapeAttribute(type)}"/>`,
    )
    .join('')}${[...overrides]
    .map(
      ([part, type]) =>
        `<Override PartName="/${escapeAttribute(part)}" ContentType="${escapeAttribute(type)}"/>`,
    )
    .join('')}</Types>`;

export const relativeTarget = (from: string, to: string): string => {
  const base = from
    .slice(0, from.lastIndexOf('/') + 1)
    .split('/')
    .filter((segment) => segment !== '');

  const target = to.split('/');
  let shared = 0;

  while (shared < base.length && shared < target.length - 1 && base[shared] === target[shared]) {
    shared += 1;
  }
  return [...base.slice(shared).map(() => '..'), ...target.slice(shared)].join('/');
};

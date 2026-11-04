import type { XmlAttribute } from '../xml/xml.types';
import { decodeXstring } from '../xml/xstring';
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
import { OoxmlElement, SheetState } from '../ooxml.types';

export interface SheetEntry {
  readonly name: string;
  readonly sheetId: number;
  readonly relationship: string;
  readonly hidden: boolean;
}

export interface NameEntry {
  readonly name: string;
  readonly sheet: number | undefined;
  readonly text: string;
}

export interface PivotCacheEntry {
  readonly cacheId: number;
  readonly relationship: string;
}

export interface WorkbookPart {
  readonly sheets: readonly SheetEntry[];
  readonly names: readonly NameEntry[];
  readonly date1904: boolean;
  readonly recalcOnLoad: boolean;
  readonly externalLinks: readonly string[];
  readonly pivotCaches: readonly PivotCacheEntry[];
  readonly strict: boolean;
}

const STRICT_MAIN = 'http://purl.oclc.org/ooxml/spreadsheetml/main';

const relationshipOf = (attributes: readonly XmlAttribute[]): string =>
  attributeOf(attributes, 'id', RELATIONSHIP_ATTRIBUTES) ?? '';

const sheetEntryOf = (attributes: readonly XmlAttribute[], fallbackId: number): SheetEntry => ({
  name: decodeXstring(attributeOf(attributes, 'name') ?? ''),
  sheetId: numberOf(attributeOf(attributes, 'sheetId'), fallbackId),
  relationship: relationshipOf(attributes),
  hidden: (attributeOf(attributes, 'state') ?? 'visible') !== SheetState.Visible,
});

const nameEntryOf = (
  attributes: readonly XmlAttribute[],
): { name: string; sheet: number | undefined; text: string } => {
  const local = attributeOf(attributes, 'localSheetId');

  return {
    name: attributeOf(attributes, 'name') ?? '',
    sheet: local === undefined ? undefined : numberOf(local, 0),
    text: '',
  };
};

export const readWorkbookPart = async (
  archive: ZipArchive,
  part: string,
  options: PartOptions,
): Promise<WorkbookPart> => {
  const sheets: SheetEntry[] = [];
  const names: NameEntry[] = [];
  let date1904 = false;
  let recalcOnLoad = false;
  const externalLinks: string[] = [];
  const pivotCaches: PivotCacheEntry[] = [];
  let strict = false;
  let name: { name: string; sheet: number | undefined; text: string } | undefined;

  await readPart(
    archive,
    part,
    {
      open: (element, attributes) => {
        if (!MAIN.has(element.uri)) {
          return;
        }
        switch (element.local) {
          case OoxmlElement.Workbook:
            strict = element.uri === STRICT_MAIN;
            break;
          case OoxmlElement.Sheet:
            sheets.push(sheetEntryOf(attributes, sheets.length + 1));
            break;
          case OoxmlElement.WorkbookPr:
            date1904 = truthy(attributeOf(attributes, 'date1904'));
            break;
          case OoxmlElement.CalcPr:
            recalcOnLoad = truthy(attributeOf(attributes, 'fullCalcOnLoad'));
            break;
          case OoxmlElement.DefinedName:
            name = nameEntryOf(attributes);
            break;
          case OoxmlElement.ExternalReference:
            externalLinks.push(relationshipOf(attributes));
            break;
          case OoxmlElement.PivotCache:
            pivotCaches.push({
              cacheId: numberOf(attributeOf(attributes, 'cacheId'), -1),
              relationship: relationshipOf(attributes),
            });

            break;
          default:
            break;
        }
      },
      text: (text) => {
        if (name !== undefined) {
          name.text += text;
        }
      },
      close: (element) => {
        if (name !== undefined && element.local === OoxmlElement.DefinedName) {
          names.push(name);
          name = undefined;
        }
      },
    },
    options,
  );

  return { sheets, names, date1904, recalcOnLoad, externalLinks, pivotCaches, strict };
};

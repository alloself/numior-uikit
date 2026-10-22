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

const STRICT_MAIN = 'http://purl.oclc.org/ooxml/spreadsheetml/main';

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

export interface WorkbookPart {
  readonly sheets: readonly SheetEntry[];
  readonly names: readonly NameEntry[];
  readonly date1904: boolean;
  readonly externalLinks: readonly string[];
  readonly pivotCaches: number;
  readonly strict: boolean;
}

export const readWorkbookPart = async (
  archive: ZipArchive,
  part: string,
  options: PartOptions,
): Promise<WorkbookPart> => {
  const sheets: SheetEntry[] = [];
  const names: NameEntry[] = [];
  let date1904 = false;
  const externalLinks: string[] = [];
  let pivotCaches = 0;
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
          case 'workbook':
            strict = element.uri === STRICT_MAIN;
            break;
          case 'sheet':
            sheets.push({
              name: decodeXstring(attributeOf(attributes, 'name') ?? ''),
              sheetId: numberOf(attributeOf(attributes, 'sheetId'), sheets.length + 1),
              relationship: attributeOf(attributes, 'id', RELATIONSHIP_ATTRIBUTES) ?? '',
              hidden: (attributeOf(attributes, 'state') ?? 'visible') !== 'visible',
            });

            break;
          case 'workbookPr':
            date1904 = truthy(attributeOf(attributes, 'date1904'));
            break;
          case 'definedName': {
            const local = attributeOf(attributes, 'localSheetId');

            name = {
              name: attributeOf(attributes, 'name') ?? '',
              sheet: local === undefined ? undefined : numberOf(local, 0),
              text: '',
            };

            break;
          }
          case 'externalReference':
            externalLinks.push(attributeOf(attributes, 'id', RELATIONSHIP_ATTRIBUTES) ?? '');
            break;
          case 'pivotCache':
            pivotCaches += 1;
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
        if (name !== undefined && element.local === 'definedName') {
          names.push(name);
          name = undefined;
        }
      },
    },
    options,
  );

  return { sheets, names, date1904, externalLinks, pivotCaches, strict };
};

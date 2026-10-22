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
  readonly externalLinks: number;
  readonly pivotCaches: number;
}

export const readWorkbookPart = async (
  archive: ZipArchive,
  part: string,
  options: PartOptions,
): Promise<WorkbookPart> => {
  const sheets: SheetEntry[] = [];
  const names: NameEntry[] = [];
  let date1904 = false;
  let externalLinks = 0;
  let pivotCaches = 0;
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
            externalLinks += 1;
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

  return { sheets, names, date1904, externalLinks, pivotCaches };
};

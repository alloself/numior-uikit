import type { CellValue } from '../../core/cell.types';
import type { XmlAttribute } from '../xml/xml.types';
import { decodeXstring } from '../xml/xstring';
import type { ZipArchive } from '../zip/zip.types';
import {
  MAIN,
  RELATIONSHIP_ATTRIBUTES,
  attributeOf,
  readPart,
  readRelationships,
  type PartOptions,
} from './ooxml';
import { cellOf, valueOf } from './sheet-part';

export interface ExternalCell {
  readonly sheet: number;
  readonly row: number;
  readonly col: number;
  readonly value: CellValue;
}

export interface ExternalNameEntry {
  readonly name: string;
  readonly sheet: number | undefined;
  readonly text: string;
}

export type ExternalPart =
  | {
      readonly kind: 'book';
      readonly target: string;
      readonly sheets: readonly string[];
      readonly names: readonly ExternalNameEntry[];
      readonly cells: readonly ExternalCell[];
    }
  | { readonly kind: 'linked' };

interface PendingCell {
  readonly sheet: number;
  readonly at: { readonly row: number; readonly col: number } | undefined;
  readonly type: string;
  value: string;
  reading: boolean;
}

interface Collected {
  book: string | undefined;
  linked: boolean;
  sheet: number;
  cell: PendingCell | undefined;
  readonly sheets: string[];
  readonly names: ExternalNameEntry[];
  readonly cells: ExternalCell[];
}

const sheetIndex = (text: string | undefined): number | undefined => {
  const index = text === undefined ? Number.NaN : Number(text);

  return Number.isInteger(index) && index >= 0 ? index : undefined;
};

type Opener = (found: Collected, attributes: readonly XmlAttribute[]) => void;

const linked: Opener = (found) => {
  found.linked = true;
};

const OPENERS = new Map<string, Opener>([
  [
    'externalBook',
    (found, attributes) => {
      found.book = attributeOf(attributes, 'id', RELATIONSHIP_ATTRIBUTES);
    },
  ],
  ['ddeLink', linked],
  ['oleLink', linked],
  [
    'sheetName',
    (found, attributes) => {
      found.sheets.push(decodeXstring(attributeOf(attributes, 'val') ?? ''));
    },
  ],
  [
    'definedName',
    (found, attributes) => {
      found.names.push({
        name: attributeOf(attributes, 'name') ?? '',
        sheet: sheetIndex(attributeOf(attributes, 'sheetId')),
        text: attributeOf(attributes, 'refersTo') ?? '',
      });
    },
  ],
  [
    'sheetData',
    (found, attributes) => {
      found.sheet = sheetIndex(attributeOf(attributes, 'sheetId')) ?? -1;
    },
  ],
  [
    'cell',
    (found, attributes) => {
      found.cell = {
        sheet: found.sheet,
        at: cellOf(attributeOf(attributes, 'r') ?? ''),
        type: attributeOf(attributes, 't') ?? 'n',
        value: '',
        reading: false,
      };
    },
  ],
  [
    'v',
    (found) => {
      if (found.cell !== undefined) {
        found.cell.reading = true;
      }
    },
  ],
]);

const closed = (found: Collected, local: string, strings: readonly string[]): void => {
  const { cell } = found;

  if (cell === undefined) {
    return;
  }
  if (local === 'v') {
    cell.reading = false;
  } else if (local === 'cell') {
    if (cell.at !== undefined && cell.sheet >= 0) {
      found.cells.push({
        sheet: cell.sheet,
        ...cell.at,
        value: valueOf({ type: cell.type, value: cell.value, inline: '' }, strings),
      });
    }
    found.cell = undefined;
  }
};

export const readExternalPart = async (
  archive: ZipArchive,
  part: string,
  strings: readonly string[],
  options: PartOptions,
): Promise<ExternalPart> => {
  const found: Collected = {
    book: undefined,
    linked: false,
    sheet: -1,
    cell: undefined,
    sheets: [],
    names: [],
    cells: [],
  };

  await readPart(
    archive,
    part,
    {
      open: (element, attributes) => {
        if (MAIN.has(element.uri)) {
          OPENERS.get(element.local)?.(found, attributes);
        }
      },
      text: (text) => {
        if (found.cell?.reading === true) {
          found.cell.value += text;
        }
      },
      close: (element) => {
        if (MAIN.has(element.uri)) {
          closed(found, element.local, strings);
        }
      },
    },
    options,
  );

  const relationships = await readRelationships(archive, part, options);
  const target = relationships.find((relationship) => relationship.id === found.book)?.target;

  return found.linked || target === undefined
    ? { kind: 'linked' }
    : { kind: 'book', target, sheets: found.sheets, names: found.names, cells: found.cells };
};

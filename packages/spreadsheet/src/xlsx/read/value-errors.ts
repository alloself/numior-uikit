import { CellError } from '../../core/cell.types';
import { OoxmlElement } from '../ooxml.types';
import type { XmlAttribute, XmlName } from '../xml/xml.types';
import type { ZipArchive } from '../zip/zip.types';
import { attributeOf, MAIN, numberOf, readPart, type PartOptions } from './ooxml';

interface RichStructure {
  readonly type: string;
  readonly keys: string[];
}

interface RichValue {
  readonly structure: number;
  readonly values: string[];
}

export interface ValueErrorParts {
  readonly metadata: string | undefined;
  readonly values: string | undefined;
  readonly structures: string | undefined;
}

const RICH_DATA = 'http://schemas.microsoft.com/office/spreadsheetml/2017/richdata';

const RICH_VALUE_TYPE = 'XLRICHVALUE';

const ERROR_STRUCTURE = '_error';

const ERROR_TYPE_KEY = 'errorType';

const ERROR_TYPES: ReadonlyMap<number, CellError> = new Map([
  [8, CellError.Spill],
  [13, CellError.Calc],
]);

const inMain = (name: XmlName): boolean => MAIN.has(name.uri);

const readSlots = async (
  archive: ZipArchive,
  part: string,
  options: PartOptions,
): Promise<readonly (number | undefined)[]> => {
  const types: string[] = [];
  const future: (number | undefined)[] = [];
  const slots: (number | undefined)[] = [];
  let section: string | undefined;
  let richFuture = false;

  const openMain = (local: string, attributes: readonly XmlAttribute[]): void => {
    switch (local) {
      case OoxmlElement.MetadataType:
        types.push(attributeOf(attributes, 'name') ?? '');
        return;
      case OoxmlElement.FutureMetadata:
        section = local;
        richFuture = attributeOf(attributes, 'name') === RICH_VALUE_TYPE;
        return;
      case OoxmlElement.ValueMetadata:
        section = local;
        return;
      case OoxmlElement.Bk:
        if (section === OoxmlElement.FutureMetadata && richFuture) {
          future.push(undefined);
          return;
        }
        if (section !== OoxmlElement.ValueMetadata) {
          return;
        }

        slots.push(undefined);
        return;
      case OoxmlElement.Rc: {
        const rich = types.indexOf(RICH_VALUE_TYPE) + 1;
        const richValue = rich > 0 && numberOf(attributeOf(attributes, 't'), 0) === rich;
        const open = section === OoxmlElement.ValueMetadata && slots.length > 0;

        if (!open || !richValue || slots.at(-1) !== undefined) {
          return;
        }

        slots[slots.length - 1] = future[numberOf(attributeOf(attributes, 'v'), -1)];
        return;
      }
      default:
        return;
    }
  };

  await readPart(
    archive,
    part,
    {
      open: (name, attributes) => {
        if (name.uri === RICH_DATA && name.local === OoxmlElement.Rvb && richFuture) {
          future[future.length - 1] = numberOf(attributeOf(attributes, 'i'), -1);
          return;
        }
        if (!inMain(name)) {
          return;
        }

        openMain(name.local, attributes);
      },
      close: (name) => {
        const ends =
          inMain(name) &&
          (name.local === OoxmlElement.FutureMetadata || name.local === OoxmlElement.ValueMetadata);

        if (!ends) {
          return;
        }

        section = undefined;
        richFuture = false;
      },
    },
    options,
  );

  return slots;
};

const readStructures = async (
  archive: ZipArchive,
  part: string,
  options: PartOptions,
): Promise<readonly RichStructure[]> => {
  const structures: RichStructure[] = [];

  await readPart(
    archive,
    part,
    {
      open: (name, attributes) => {
        if (name.uri !== RICH_DATA) {
          return;
        }
        if (name.local === OoxmlElement.S) {
          structures.push({ type: attributeOf(attributes, 't') ?? '', keys: [] });
          return;
        }
        if (name.local !== OoxmlElement.K) {
          return;
        }

        structures.at(-1)?.keys.push(attributeOf(attributes, 'n') ?? '');
      },
    },
    options,
  );

  return structures;
};

const readRichValues = async (
  archive: ZipArchive,
  part: string,
  options: PartOptions,
): Promise<readonly RichValue[]> => {
  const values: RichValue[] = [];
  let text: string[] | undefined;

  await readPart(
    archive,
    part,
    {
      open: (name, attributes) => {
        if (name.uri !== RICH_DATA) {
          return;
        }
        if (name.local === OoxmlElement.Rv) {
          values.push({ structure: numberOf(attributeOf(attributes, 's'), -1), values: [] });
          return;
        }
        if (name.local !== OoxmlElement.V) {
          return;
        }

        text = [];
      },
      text: (piece) => {
        text?.push(piece);
      },
      close: (name) => {
        if (name.uri !== RICH_DATA || name.local !== OoxmlElement.V || text === undefined) {
          return;
        }

        values.at(-1)?.values.push(text.join(''));
        text = undefined;
      },
    },
    options,
  );

  return values;
};

const errorOf = (
  value: RichValue | undefined,
  structures: readonly RichStructure[],
): CellError | undefined => {
  const structure = value === undefined ? undefined : structures[value.structure];

  if (value === undefined || structure?.type !== ERROR_STRUCTURE) {
    return undefined;
  }
  return ERROR_TYPES.get(numberOf(value.values[structure.keys.indexOf(ERROR_TYPE_KEY)], -1));
};

export const readValueErrors = async (
  archive: ZipArchive,
  parts: ValueErrorParts,
  options: PartOptions,
): Promise<readonly (CellError | undefined)[]> => {
  const { metadata, values, structures } = parts;

  const present = (part: string | undefined): part is string =>
    part !== undefined && archive.has(part);

  if (!present(metadata) || !present(values) || !present(structures)) {
    return [];
  }

  const slots = await readSlots(archive, metadata, options);
  const shapes = await readStructures(archive, structures, options);
  const rows = await readRichValues(archive, values, options);

  return slots.map((slot) => (slot === undefined ? undefined : errorOf(rows[slot], shapes)));
};

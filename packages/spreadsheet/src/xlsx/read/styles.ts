import { builtinFormat } from '../../core/format/builtin-formats';
import type { NumberLocale } from '../../core/format/format.types';
import { decodeXstring } from '../xml/xstring';
import type { ZipArchive } from '../zip/zip.types';
import { MAIN, attributeOf, numberOf, readPart, type PartOptions } from './ooxml';

export interface CellStyles {
  readonly formats: readonly string[];
  readonly decorated: number;
}

const GENERAL = 'General';

export const readStyles = async (
  archive: ZipArchive,
  part: string | undefined,
  locale: NumberLocale,
  options: PartOptions,
): Promise<CellStyles> => {
  const custom = new Map<number, string>();
  const ids: number[] = [];
  let decorated = 0;
  let inCellFormats = false;

  if (part === undefined || !archive.has(part)) {
    return { formats: [], decorated };
  }

  await readPart(
    archive,
    part,
    {
      open: (element, attributes) => {
        if (!MAIN.has(element.uri)) {
          return;
        }
        switch (element.local) {
          case 'numFmt':
            custom.set(
              numberOf(attributeOf(attributes, 'numFmtId'), 0),
              decodeXstring(attributeOf(attributes, 'formatCode') ?? GENERAL),
            );

            break;
          case 'cellXfs':
            inCellFormats = true;
            break;
          case 'xf':
            if (inCellFormats) {
              ids.push(numberOf(attributeOf(attributes, 'numFmtId'), 0));

              decorated += ['fontId', 'fillId', 'borderId'].some(
                (key) => numberOf(attributeOf(attributes, key), 0) > 0,
              )
                ? 1
                : 0;
            }
            break;
          default:
            break;
        }
      },
      close: (element) => {
        if (element.local === 'cellXfs') {
          inCellFormats = false;
        }
      },
    },
    options,
  );

  return {
    formats: ids.map((id) => custom.get(id) ?? builtinFormat(id, locale) ?? GENERAL),
    decorated,
  };
};

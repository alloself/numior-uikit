import { decodeXstring } from '../xml/xstring';
import type { ZipArchive } from '../zip/zip.types';
import { MAIN, readPart, type PartOptions } from './ooxml';
import { OoxmlElement } from '../ooxml.types';

export interface SharedStrings {
  readonly strings: readonly string[];
  readonly rich: number;
}

export const readSharedStrings = async (
  archive: ZipArchive,
  part: string | undefined,
  options: PartOptions,
): Promise<SharedStrings> => {
  const strings: string[] = [];
  let rich = 0;
  let item: string[] | undefined;
  let phonetic = 0;
  let inText = false;
  let runs = 0;

  if (part === undefined || !archive.has(part)) {
    return { strings, rich };
  }

  await readPart(
    archive,
    part,
    {
      open: (element) => {
        if (!MAIN.has(element.uri)) {
          return;
        }
        switch (element.local) {
          case OoxmlElement.Si:
            item = [];
            runs = 0;
            break;
          case OoxmlElement.RPh:
            phonetic += 1;
            break;
          case OoxmlElement.R:
            runs += 1;
            break;
          case OoxmlElement.T:
            inText = phonetic === 0;
            break;
          default:
            break;
        }
      },
      text: (text) => {
        if (!inText) {
          return;
        }

        item?.push(text);
      },
      close: (element) => {
        switch (element.local) {
          case OoxmlElement.Si:
            strings.push(decodeXstring((item ?? []).join('')));
            rich += runs > 0 ? 1 : 0;
            item = undefined;
            break;
          case OoxmlElement.RPh:
            phonetic -= 1;
            break;
          case OoxmlElement.T:
            inText = false;
            break;
          default:
            break;
        }
      },
    },
    options,
  );

  return { strings, rich };
};

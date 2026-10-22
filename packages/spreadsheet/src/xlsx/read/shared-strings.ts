import { decodeXstring } from '../xml/xstring';
import type { ZipArchive } from '../zip/zip.types';
import { MAIN, readPart, type PartOptions } from './ooxml';

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
          case 'si':
            item = [];
            runs = 0;
            break;
          case 'rPh':
            phonetic += 1;
            break;
          case 'r':
            runs += 1;
            break;
          case 't':
            inText = phonetic === 0;
            break;
          default:
            break;
        }
      },
      text: (text) => {
        if (inText) {
          item?.push(text);
        }
      },
      close: (element) => {
        switch (element.local) {
          case 'si':
            strings.push(decodeXstring((item ?? []).join('')));
            rich += runs > 0 ? 1 : 0;
            item = undefined;
            break;
          case 'rPh':
            phonetic -= 1;
            break;
          case 't':
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

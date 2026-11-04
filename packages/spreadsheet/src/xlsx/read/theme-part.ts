import { OFFICE_THEME, THEME_SLOTS, type ThemePalette } from '../../core/theme';
import type { ZipArchive } from '../zip/zip.types';
import { attributeOf, readPart, type PartOptions } from './ooxml';
import { OoxmlElement } from '../ooxml.types';

const DRAWING = 'http://schemas.openxmlformats.org/drawingml/2006/main';

const HEX = /^[\da-f]{6}$/iu;

const COLOR_VALUES: Readonly<Record<string, string>> = { srgbClr: 'val', sysClr: 'lastClr' };

const SLOTS: ReadonlyMap<string, number> = new Map(THEME_SLOTS.map((slot, index) => [slot, index]));

export const readTheme = async (
  archive: ZipArchive,
  part: string | undefined,
  options: PartOptions,
): Promise<ThemePalette> => {
  const palette = [...OFFICE_THEME];
  let scheme = 0;
  let slot: number | undefined;

  if (part === undefined || !archive.has(part)) {
    return palette;
  }

  await readPart(
    archive,
    part,
    {
      open: (element, attributes) => {
        if (element.uri !== DRAWING) {
          return;
        }
        if (element.local === OoxmlElement.ClrScheme) {
          scheme += 1;
          return;
        }
        if (scheme !== 1) {
          return;
        }

        const known = SLOTS.get(element.local);

        if (known !== undefined) {
          slot = known;
          return;
        }

        const value = attributeOf(attributes, COLOR_VALUES[element.local] ?? '');

        if (slot !== undefined && value !== undefined && HEX.test(value)) {
          palette[slot] = value.toUpperCase();
          slot = undefined;
        }
      },
      close: (element) => {
        if (element.uri === DRAWING && SLOTS.has(element.local)) {
          slot = undefined;
        }
      },
    },
    options,
  );

  return palette;
};

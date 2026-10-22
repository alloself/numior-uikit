import type {
  AlignmentStyle,
  BorderStyle,
  CellDecoration,
  FillStyle,
  FontStyle,
  ProtectionStyle,
  StyleColor,
  UnderlineStyle,
} from '../../core/decorations';
import { builtinFormat } from '../../core/format/builtin-formats';
import type { NumberLocale } from '../../core/format/format.types';
import type { XmlAttribute } from '../xml/xml.types';
import { decodeXstring } from '../xml/xstring';
import type { ZipArchive } from '../zip/zip.types';
import { MAIN, attributeOf, numberOf, readPart, type PartOptions } from './ooxml';

export interface CellStyles {
  readonly formats: readonly string[];
  readonly decorations: readonly CellDecoration[];
  readonly defaultFont: FontStyle | undefined;
  readonly unmodeled: number;
}

type Mutable<T> = { -readonly [Key in keyof T]: T[Key] };

type Section = 'fonts' | 'fills' | 'borders' | 'cellXfs' | 'other';

type BorderEdge = 'left' | 'right' | 'top' | 'bottom' | 'diagonal';

interface CellFormat {
  readonly numberFormat: number;
  readonly font: number;
  readonly fill: number;
  readonly border: number;
  alignment?: AlignmentStyle | undefined;
  protection?: ProtectionStyle | undefined;
}

const GENERAL = 'General';

const SECTIONS = new Set<string>(['fonts', 'fills', 'borders', 'cellXfs']);

const EDGES: Readonly<Record<string, BorderEdge>> = {
  left: 'left',
  start: 'left',
  right: 'right',
  end: 'right',
  top: 'top',
  bottom: 'bottom',
  diagonal: 'diagonal',
};

const UNDERLINES: readonly UnderlineStyle[] = [
  'single',
  'double',
  'singleAccounting',
  'doubleAccounting',
];

const isUnderline = (value: string): value is UnderlineStyle =>
  UNDERLINES.some((underline) => underline === value);

const sectionOf = (element: string): Section => {
  switch (element) {
    case 'fonts':
    case 'fills':
    case 'borders':
    case 'cellXfs':
      return element;
    default:
      return 'other';
  }
};

const flag = (attributes: readonly XmlAttribute[], fallback = true): boolean => {
  const value = attributeOf(attributes, 'val');

  return value === undefined ? fallback : value === '1' || value === 'true';
};

const optionalFlag = (text: string | undefined): boolean | undefined =>
  text === undefined ? undefined : text === '1' || text === 'true';

const optionalNumber = (text: string | undefined): number | undefined =>
  text === undefined ? undefined : numberOf(text, 0);

const colorOf = (attributes: readonly XmlAttribute[]): StyleColor | undefined => {
  const rgb = attributeOf(attributes, 'rgb');
  const theme = attributeOf(attributes, 'theme');
  const indexed = attributeOf(attributes, 'indexed');

  if (rgb !== undefined) {
    return { kind: 'rgb', argb: rgb.toUpperCase() };
  }
  if (theme !== undefined) {
    return {
      kind: 'theme',
      theme: numberOf(theme, 0),
      tint: numberOf(attributeOf(attributes, 'tint'), 0),
    };
  }
  if (indexed !== undefined) {
    return { kind: 'indexed', index: numberOf(indexed, 0) };
  }
  return attributeOf(attributes, 'auto') === '1' ? { kind: 'auto' } : undefined;
};

const fontPart = (
  font: Mutable<FontStyle>,
  element: string,
  attributes: readonly XmlAttribute[],
): void => {
  switch (element) {
    case 'b':
      font.bold = flag(attributes);
      return;
    case 'i':
      font.italic = flag(attributes);
      return;
    case 'strike':
      font.strike = flag(attributes);
      return;
    case 'u': {
      const value = attributeOf(attributes, 'val') ?? 'single';

      font.underline = isUnderline(value) ? value : undefined;
      return;
    }
    default:
      fontValue(font, element, attributes);
  }
};

const fontValue = (
  font: Mutable<FontStyle>,
  element: string,
  attributes: readonly XmlAttribute[],
): void => {
  const value = attributeOf(attributes, 'val');

  switch (element) {
    case 'sz':
      font.size = optionalNumber(value);
      return;
    case 'name':
      font.name = value;
      return;
    case 'family':
      font.family = optionalNumber(value);
      return;
    case 'scheme':
      font.scheme = value === 'major' || value === 'minor' ? value : undefined;
      return;
    case 'vertAlign':
      font.script = value === 'superscript' || value === 'subscript' ? value : undefined;
      return;
    case 'color':
      font.color = colorOf(attributes);
      return;
    default:
      return;
  }
};

const alignmentOf = (attributes: readonly XmlAttribute[]): AlignmentStyle => ({
  horizontal: attributeOf(attributes, 'horizontal'),
  vertical: attributeOf(attributes, 'vertical'),
  wrap: optionalFlag(attributeOf(attributes, 'wrapText')),
  indent: optionalNumber(attributeOf(attributes, 'indent')),
  rotation: optionalNumber(attributeOf(attributes, 'textRotation')),
  shrink: optionalFlag(attributeOf(attributes, 'shrinkToFit')),
});

const protectionOf = (attributes: readonly XmlAttribute[]): ProtectionStyle => ({
  locked: optionalFlag(attributeOf(attributes, 'locked')),
  hidden: optionalFlag(attributeOf(attributes, 'hidden')),
});

const hasSides = (border: BorderStyle): boolean =>
  [border.left, border.right, border.top, border.bottom, border.diagonal].some(
    (side) => side !== undefined,
  );

const decorationOf = (
  format: CellFormat,
  parts: {
    fonts: readonly FontStyle[];
    fills: readonly FillStyle[];
    borders: readonly BorderStyle[];
  },
): CellDecoration => {
  const border = parts.borders[format.border];

  return {
    font: format.font > 0 ? parts.fonts[format.font] : undefined,
    fill: format.fill > 1 ? parts.fills[format.fill] : undefined,
    border: border !== undefined && hasSides(border) ? border : undefined,
    alignment: format.alignment,
    protection: format.protection,
  };
};

export const readStyles = async (
  archive: ZipArchive,
  part: string | undefined,
  locale: NumberLocale,
  options: PartOptions,
): Promise<CellStyles> => {
  const custom = new Map<number, string>();
  const fonts: Mutable<FontStyle>[] = [];
  const fills: Mutable<FillStyle>[] = [];
  const borders: Mutable<BorderStyle>[] = [];
  const formats: CellFormat[] = [];
  let section: Section = 'other';
  let edge: BorderEdge | undefined;
  let unmodeled = 0;

  if (part === undefined || !archive.has(part)) {
    return { formats: [], decorations: [], defaultFont: undefined, unmodeled };
  }

  const borderPart = (element: string, attributes: readonly XmlAttribute[]): void => {
    const border = borders.at(-1);
    const side = EDGES[element];

    if (border === undefined) {
      return;
    }
    if (side !== undefined) {
      const style = attributeOf(attributes, 'style');

      edge = side;
      border[side] = style === undefined || style === 'none' ? undefined : { style };
      return;
    }

    const current = edge === undefined ? undefined : border[edge];

    if (element === 'color' && edge !== undefined && current !== undefined) {
      border[edge] = { ...current, color: colorOf(attributes) };
    }
  };

  const fillPart = (element: string, attributes: readonly XmlAttribute[]): void => {
    const fill = fills.at(-1);

    if (fill === undefined) {
      return;
    }
    switch (element) {
      case 'patternFill':
        fill.pattern = attributeOf(attributes, 'patternType') ?? 'none';
        return;
      case 'gradientFill':
        unmodeled += 1;
        return;
      case 'fgColor':
        fill.foreground = colorOf(attributes);
        return;
      case 'bgColor':
        fill.background = colorOf(attributes);
        return;
      default:
        return;
    }
  };

  const cellFormatPart = (element: string, attributes: readonly XmlAttribute[]): void => {
    const format = formats.at(-1);

    if (element === 'xf') {
      formats.push({
        numberFormat: numberOf(attributeOf(attributes, 'numFmtId'), 0),
        font: numberOf(attributeOf(attributes, 'fontId'), 0),
        fill: numberOf(attributeOf(attributes, 'fillId'), 0),
        border: numberOf(attributeOf(attributes, 'borderId'), 0),
      });
    } else if (format !== undefined && element === 'alignment') {
      format.alignment = alignmentOf(attributes);
    } else if (format !== undefined && element === 'protection') {
      format.protection = protectionOf(attributes);
    }
  };

  const sectionPart = (element: string, attributes: readonly XmlAttribute[]): void => {
    switch (section) {
      case 'fonts':
        if (element === 'font') {
          fonts.push({});
        } else {
          const font = fonts.at(-1);

          if (font !== undefined) {
            fontPart(font, element, attributes);
          }
        }
        return;
      case 'fills':
        if (element === 'fill') {
          fills.push({ pattern: 'none' });
        } else {
          fillPart(element, attributes);
        }
        return;
      case 'borders':
        if (element === 'border') {
          borders.push({
            diagonalUp: optionalFlag(attributeOf(attributes, 'diagonalUp')),
            diagonalDown: optionalFlag(attributeOf(attributes, 'diagonalDown')),
          });

          edge = undefined;
        } else {
          borderPart(element, attributes);
        }
        return;
      case 'cellXfs':
        cellFormatPart(element, attributes);
        return;
      default:
        return;
    }
  };

  await readPart(
    archive,
    part,
    {
      open: (element, attributes) => {
        if (!MAIN.has(element.uri)) {
          return;
        }
        if (SECTIONS.has(element.local)) {
          section = sectionOf(element.local);
        } else if (element.local === 'numFmt') {
          custom.set(
            numberOf(attributeOf(attributes, 'numFmtId'), 0),
            decodeXstring(attributeOf(attributes, 'formatCode') ?? GENERAL),
          );
        } else {
          sectionPart(element.local, attributes);
        }
      },
      close: (element) => {
        if (SECTIONS.has(element.local)) {
          section = 'other';
        }
      },
    },
    options,
  );

  return {
    formats: formats.map(
      (format) =>
        custom.get(format.numberFormat) ?? builtinFormat(format.numberFormat, locale) ?? GENERAL,
    ),
    decorations: formats.map((format) => decorationOf(format, { fonts, fills, borders })),
    defaultFont: fonts[0],
    unmodeled,
  };
};

import type {
  AlignmentStyle,
  BorderStyle,
  CellDecoration,
  FillStyle,
  FontStyle,
  ProtectionStyle,
  StyleColor,
} from '../../core/decorations';
import type { DifferentialStyle } from '../../core/conditional/conditional.types';
import { builtinFormat } from '../../core/format/builtin-formats';
import type { NumberLocale } from '../../core/format/format.types';
import { XmlBoolean, type XmlAttribute } from '../xml/xml.types';
import { decodeXstring } from '../xml/xstring';
import type { ZipArchive } from '../zip/zip.types';
import { MAIN, attributeOf, numberOf, readPart, type PartOptions } from './ooxml';
import { BorderLineStyle, FontScheme, FontScript, UnderlineStyle } from '../../core/cell.types';
import { StyleSection } from './read.types';
import { OoxmlElement } from '../ooxml.types';

export interface CellStyles {
  readonly formats: readonly string[];
  readonly decorations: readonly CellDecoration[];
  readonly differentials: readonly DifferentialStyle[];
  readonly defaultFont: FontStyle | undefined;
  readonly unmodeled: number;
  readonly numberFormat: (id: number) => string;
}

type Mutable<T> = { -readonly [Key in keyof T]: T[Key] };

interface Differential {
  font?: Mutable<FontStyle> | undefined;
  fill?: Mutable<FillStyle> | undefined;
  border?: Mutable<BorderStyle> | undefined;
  format?: string | undefined;
}

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

const SECTIONS = new Set<string>(['fonts', 'fills', 'borders', 'cellXfs', 'dxfs']);

const EDGES: Readonly<Record<string, BorderEdge>> = {
  left: 'left',
  start: 'left',
  right: 'right',
  end: 'right',
  top: 'top',
  bottom: 'bottom',
  diagonal: 'diagonal',
};

const UNDERLINES: readonly UnderlineStyle[] = Object.values(UnderlineStyle);

const isUnderline = (value: string): value is UnderlineStyle =>
  UNDERLINES.some((underline) => underline === value);

const sectionOf = (element: string): StyleSection => {
  switch (element) {
    case OoxmlElement.Fonts:
    case OoxmlElement.Fills:
    case OoxmlElement.Borders:
    case OoxmlElement.CellXfs:
    case OoxmlElement.Dxfs:
      return element;
    default:
      return 'other';
  }
};

const flag = (attributes: readonly XmlAttribute[], fallback = true): boolean => {
  const value = attributeOf(attributes, 'val');

  return value === undefined ? fallback : value === XmlBoolean.One || value === XmlBoolean.True;
};

const optionalFlag = (text: string | undefined): boolean | undefined =>
  text === undefined ? undefined : text === XmlBoolean.One || text === XmlBoolean.True;

const optionalNumber = (text: string | undefined): number | undefined =>
  text === undefined ? undefined : numberOf(text, 0);

export const colorOf = (attributes: readonly XmlAttribute[]): StyleColor | undefined => {
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
  return attributeOf(attributes, 'auto') === XmlBoolean.One ? { kind: 'auto' } : undefined;
};

const fontPart = (
  font: Mutable<FontStyle>,
  element: string,
  attributes: readonly XmlAttribute[],
): void => {
  switch (element) {
    case OoxmlElement.B:
      font.bold = flag(attributes);
      return;
    case OoxmlElement.I:
      font.italic = flag(attributes);
      return;
    case OoxmlElement.Strike:
      font.strike = flag(attributes);
      return;
    case OoxmlElement.U: {
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
    case OoxmlElement.Sz:
      font.size = optionalNumber(value);
      return;
    case OoxmlElement.Name:
      font.name = value;
      return;
    case OoxmlElement.Family:
      font.family = optionalNumber(value);
      return;
    case OoxmlElement.Scheme:
      font.scheme = value === FontScheme.Major || value === FontScheme.Minor ? value : undefined;
      return;
    case OoxmlElement.VertAlign:
      font.script =
        value === FontScript.Superscript || value === FontScript.Subscript ? value : undefined;

      return;
    case OoxmlElement.Color:
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
  const differentials: Differential[] = [];
  let section: StyleSection = 'other';
  let edge: BorderEdge | undefined;
  let unmodeled = 0;

  if (part === undefined || !archive.has(part)) {
    return {
      formats: [],
      decorations: [],
      differentials: [],
      defaultFont: undefined,
      unmodeled,
      numberFormat: (id) => builtinFormat(id, locale) ?? GENERAL,
    };
  }

  const borderPart = (element: string, attributes: readonly XmlAttribute[]): void => {
    const border = borders.at(-1);

    if (border === undefined) {
      return;
    }

    borderSide(border, element, attributes);
  };

  const fillPart = (element: string, attributes: readonly XmlAttribute[]): void => {
    const fill = fills.at(-1);

    if (fill === undefined) {
      return;
    }
    switch (element) {
      case OoxmlElement.PatternFill:
        fill.pattern = attributeOf(attributes, 'patternType') ?? 'none';
        return;
      case OoxmlElement.GradientFill:
        unmodeled += 1;
        return;
      case OoxmlElement.FgColor:
        fill.foreground = colorOf(attributes);
        return;
      case OoxmlElement.BgColor:
        fill.background = colorOf(attributes);
        return;
      default:
        return;
    }
  };

  const cellFormatPart = (element: string, attributes: readonly XmlAttribute[]): void => {
    const format = formats.at(-1);

    if (element === OoxmlElement.Xf) {
      formats.push({
        numberFormat: numberOf(attributeOf(attributes, 'numFmtId'), 0),
        font: numberOf(attributeOf(attributes, 'fontId'), 0),
        fill: numberOf(attributeOf(attributes, 'fillId'), 0),
        border: numberOf(attributeOf(attributes, 'borderId'), 0),
      });
    } else if (format !== undefined && element === OoxmlElement.Alignment) {
      format.alignment = alignmentOf(attributes);
    } else if (format !== undefined && element === OoxmlElement.Protection) {
      format.protection = protectionOf(attributes);
    }
  };

  const differentialPart = (element: string, attributes: readonly XmlAttribute[]): void => {
    const differential = differentials.at(-1);

    if (element === OoxmlElement.Dxf) {
      differentials.push({});
      edge = undefined;
      return;
    }
    if (differential === undefined) {
      return;
    }
    switch (element) {
      case OoxmlElement.Font:
        differential.font = {};
        return;
      case OoxmlElement.Fill:
        differential.fill = { pattern: 'solid' };
        return;
      case OoxmlElement.Border:
        differential.border = {};
        edge = undefined;
        return;
      case OoxmlElement.NumFmt:
        differential.format = decodeXstring(attributeOf(attributes, 'formatCode') ?? GENERAL);
        return;
      default:
        differentialDetail(differential, element, attributes);
    }
  };

  const differentialDetail = (
    differential: Differential,
    element: string,
    attributes: readonly XmlAttribute[],
  ): void => {
    const { fill, border } = differential;

    if (border !== undefined && (EDGES[element] !== undefined || element === OoxmlElement.Color)) {
      borderSide(border, element, attributes);
    } else if (fill !== undefined && element === OoxmlElement.PatternFill) {
      fill.pattern = attributeOf(attributes, 'patternType') ?? 'solid';
    } else if (
      fill !== undefined &&
      (element === OoxmlElement.FgColor || element === OoxmlElement.BgColor)
    ) {
      fill[element === OoxmlElement.FgColor ? 'foreground' : 'background'] = colorOf(attributes);
    } else if (differential.font !== undefined) {
      fontPart(differential.font, element, attributes);
    }
  };

  const borderSide = (
    border: Mutable<BorderStyle>,
    element: string,
    attributes: readonly XmlAttribute[],
  ): void => {
    const side = EDGES[element];

    if (side !== undefined) {
      const style = attributeOf(attributes, 'style');

      edge = side;
      border[side] = style === undefined || style === BorderLineStyle.None ? undefined : { style };
      return;
    }

    const current = edge === undefined ? undefined : border[edge];

    if (element !== OoxmlElement.Color || edge === undefined || current === undefined) {
      return;
    }

    border[edge] = { ...current, color: colorOf(attributes) };
  };

  const sectionPart = (element: string, attributes: readonly XmlAttribute[]): void => {
    switch (section) {
      case StyleSection.Dxfs:
        differentialPart(element, attributes);
        return;
      case StyleSection.Fonts:
        if (element === OoxmlElement.Font) {
          fonts.push({});
        } else {
          const font = fonts.at(-1);

          if (font !== undefined) {
            fontPart(font, element, attributes);
          }
        }
        return;
      case StyleSection.Fills:
        if (element === OoxmlElement.Fill) {
          fills.push({ pattern: 'none' });
        } else {
          fillPart(element, attributes);
        }
        return;
      case StyleSection.Borders:
        if (element === OoxmlElement.Border) {
          borders.push({
            diagonalUp: optionalFlag(attributeOf(attributes, 'diagonalUp')),
            diagonalDown: optionalFlag(attributeOf(attributes, 'diagonalDown')),
          });

          edge = undefined;
        } else {
          borderPart(element, attributes);
        }
        return;
      case StyleSection.CellXfs:
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
        } else if (element.local === OoxmlElement.NumFmt && section !== StyleSection.Dxfs) {
          custom.set(
            numberOf(attributeOf(attributes, 'numFmtId'), 0),
            decodeXstring(attributeOf(attributes, 'formatCode') ?? GENERAL),
          );
        } else {
          sectionPart(element.local, attributes);
        }
      },
      close: (element) => {
        if (!SECTIONS.has(element.local)) {
          return;
        }

        section = 'other';
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
    differentials,
    defaultFont: fonts[0],
    unmodeled,
    numberFormat: (id) => custom.get(id) ?? builtinFormat(id, locale) ?? GENERAL,
  };
};

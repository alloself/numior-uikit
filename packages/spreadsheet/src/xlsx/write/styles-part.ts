import type {
  AlignmentStyle,
  BorderSide,
  BorderStyle,
  CellDecoration,
  FillStyle,
  FontStyle,
  ProtectionStyle,
  StyleColor,
} from '../../core/decorations';
import { builtinFormat } from '../../core/format/builtin-formats';
import type { NumberLocale } from '../../core/format/format.types';
import type { Workbook } from '../../core/workbook';
import { escapeAttribute } from '../xml/writer';
import { encodeXstring } from '../xml/xstring';

export interface StyleExtras {
  readonly dxfs?: string | undefined;
  readonly tableStyles?: string | undefined;
  readonly colors?: string | undefined;
}

export interface StyleBook {
  xf(format: number, decoration: number): number;
  xml(extras: StyleExtras): string;
}

interface CellFormatEntry {
  readonly format: number;
  readonly font: number;
  readonly fill: number;
  readonly border: number;
  readonly decoration: CellDecoration;
}

const MAIN = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';

const HEADER = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n';

const FIRST_CUSTOM = 164;

const BUILTIN_IDS = 50;

const NONE_FILL = '<fill><patternFill patternType="none"/></fill>';

const GRAY_FILL = '<fill><patternFill patternType="gray125"/></fill>';

const EMPTY_BORDER = '<border><left/><right/><top/><bottom/><diagonal/></border>';

const attribute = (name: string, value: string | number | boolean | undefined): string => {
  if (value === undefined) {
    return '';
  }
  if (typeof value === 'boolean') {
    return ` ${name}="${value ? '1' : '0'}"`;
  }
  return ` ${name}="${escapeAttribute(String(value))}"`;
};

const colorXml = (element: string, color: StyleColor | undefined): string => {
  if (color === undefined) {
    return '';
  }
  switch (color.kind) {
    case 'rgb':
      return `<${element} rgb="${color.argb}"/>`;
    case 'theme':
      return `<${element} theme="${String(color.theme)}"${color.tint === 0 ? '' : attribute('tint', color.tint)}/>`;
    case 'indexed':
      return `<${element} indexed="${String(color.index)}"/>`;
    case 'auto':
      return `<${element} auto="1"/>`;
  }
};

const valueXml = (element: string, value: string | number | undefined): string =>
  value === undefined ? '' : `<${element}${attribute('val', value)}/>`;

const flagXml = (element: string, value: boolean | undefined): string => {
  if (value === undefined) {
    return '';
  }
  return value ? `<${element}/>` : `<${element} val="0"/>`;
};

const fontXml = (font: FontStyle): string =>
  [
    '<font>',
    flagXml('b', font.bold),
    flagXml('i', font.italic),
    flagXml('strike', font.strike),
    font.underline === undefined
      ? ''
      : font.underline === 'single'
        ? '<u/>'
        : valueXml('u', font.underline),
    valueXml('vertAlign', font.script),
    valueXml('sz', font.size),
    colorXml('color', font.color),
    valueXml('name', font.name),
    valueXml('family', font.family),
    valueXml('scheme', font.scheme),
    '</font>',
  ].join('');

const fillXml = (fill: FillStyle): string =>
  `<fill><patternFill${attribute('patternType', fill.pattern)}>${colorXml('fgColor', fill.foreground)}${colorXml('bgColor', fill.background)}</patternFill></fill>`;

const sideXml = (element: string, side: BorderSide | undefined): string =>
  side === undefined
    ? `<${element}/>`
    : `<${element}${attribute('style', side.style)}>${colorXml('color', side.color)}</${element}>`;

const borderXml = (border: BorderStyle): string =>
  `<border${attribute('diagonalUp', border.diagonalUp)}${attribute('diagonalDown', border.diagonalDown)}>${sideXml('left', border.left)}${sideXml('right', border.right)}${sideXml('top', border.top)}${sideXml('bottom', border.bottom)}${sideXml('diagonal', border.diagonal)}</border>`;

const alignmentXml = (alignment: AlignmentStyle | undefined): string =>
  alignment === undefined
    ? ''
    : `<alignment${attribute('horizontal', alignment.horizontal)}${attribute('vertical', alignment.vertical)}${attribute('textRotation', alignment.rotation)}${attribute('wrapText', alignment.wrap)}${attribute('indent', alignment.indent)}${attribute('shrinkToFit', alignment.shrink)}/>`;

const protectionXml = (protection: ProtectionStyle | undefined): string =>
  protection === undefined
    ? ''
    : `<protection${attribute('locked', protection.locked)}${attribute('hidden', protection.hidden)}/>`;

const listXml = (element: string, items: readonly string[]): string =>
  `<${element} count="${String(items.length)}">${items.join('')}</${element}>`;

const interned = (items: string[], ids: Map<string, number>, xml: string): number => {
  const known = ids.get(xml);

  if (known !== undefined) {
    return known;
  }
  ids.set(xml, items.length);
  items.push(xml);
  return items.length - 1;
};

const builtinIds = (locale: NumberLocale): Map<string, number> =>
  Array.from({ length: BUILTIN_IDS }, (_unused, id) => id).reduce((ids, id) => {
    const code = builtinFormat(id, locale);

    if (code !== undefined && !ids.has(code)) {
      ids.set(code, id);
    }
    return ids;
  }, new Map<string, number>());

const xfXml = (entry: CellFormatEntry, numberFormat: number): string => {
  const { decoration } = entry;
  const inner = alignmentXml(decoration.alignment) + protectionXml(decoration.protection);

  const applied = [
    attribute('applyNumberFormat', numberFormat === 0 ? undefined : true),
    attribute('applyFont', entry.font === 0 ? undefined : true),
    attribute('applyFill', entry.fill === 0 ? undefined : true),
    attribute('applyBorder', entry.border === 0 ? undefined : true),
    attribute('applyAlignment', decoration.alignment === undefined ? undefined : true),
    attribute('applyProtection', decoration.protection === undefined ? undefined : true),
  ].join('');

  const head = `<xf numFmtId="${String(numberFormat)}" fontId="${String(entry.font)}" fillId="${String(entry.fill)}" borderId="${String(entry.border)}" xfId="0"${applied}`;

  return inner === '' ? `${head}/>` : `${head}>${inner}</xf>`;
};

export const createStyleBook = (book: Workbook, locale: NumberLocale): StyleBook => {
  const fonts = [fontXml(book.decorations.defaultFont)];
  const fills = [NONE_FILL, GRAY_FILL];
  const borders = [EMPTY_BORDER];
  const fontIds = new Map([[fonts[0] ?? '', 0]]);

  const fillIds = new Map([
    [NONE_FILL, 0],
    [GRAY_FILL, 1],
  ]);

  const borderIds = new Map([[EMPTY_BORDER, 0]]);
  const entries: CellFormatEntry[] = [{ format: 0, font: 0, fill: 0, border: 0, decoration: {} }];
  const entryIds = new Map([['0:0', 0]]);
  const builtins = builtinIds(locale);

  const xf = (format: number, decoration: number): number => {
    const key = `${String(format)}:${String(decoration)}`;
    const known = entryIds.get(key);

    if (known !== undefined) {
      return known;
    }

    const style = book.decorations.get(decoration);

    entries.push({
      format,
      font: style.font === undefined ? 0 : interned(fonts, fontIds, fontXml(style.font)),
      fill: style.fill === undefined ? 0 : interned(fills, fillIds, fillXml(style.fill)),
      border:
        style.border === undefined ? 0 : interned(borders, borderIds, borderXml(style.border)),
      decoration: style,
    });

    entryIds.set(key, entries.length - 1);
    return entries.length - 1;
  };

  const xml = (extras: StyleExtras): string => {
    const custom = new Map<number, number>();

    const numberFormatOf = (format: number): number => {
      const code = book.formats.code(format);
      const builtin = builtins.get(code);

      if (builtin !== undefined) {
        return builtin;
      }

      const known = custom.get(format) ?? FIRST_CUSTOM + custom.size;

      custom.set(format, known);
      return known;
    };

    const cellFormats = entries.map((entry) => xfXml(entry, numberFormatOf(entry.format)));

    const numberFormats = [...custom].map(
      ([format, id]) =>
        `<numFmt numFmtId="${String(id)}" formatCode="${escapeAttribute(encodeXstring(book.formats.code(format)))}"/>`,
    );

    return [
      HEADER,
      `<styleSheet xmlns="${MAIN}">`,
      numberFormats.length === 0 ? '' : listXml('numFmts', numberFormats),
      listXml('fonts', fonts),
      listXml('fills', fills),
      listXml('borders', borders),
      '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>',
      listXml('cellXfs', cellFormats),
      '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>',
      extras.dxfs ?? '<dxfs count="0"/>',
      extras.tableStyles ??
        '<tableStyles count="0" defaultTableStyle="TableStyleMedium2" defaultPivotStyle="PivotStyleLight16"/>',
      extras.colors ?? '',
      '</styleSheet>',
    ].join('');
  };

  return { xf, xml };
};

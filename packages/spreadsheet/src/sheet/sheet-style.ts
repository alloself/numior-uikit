import { NuiTableAlign, type NuiTableCellBorders, type NuiTableCellStyle } from '@numior/table';
import {
  colorHex,
  formatColor,
  type BorderSide,
  type CellDecoration,
  type FontStyle,
  type StyleColor,
  type ThemePalette,
} from '../core';
import { ValueShape, type StyleInput } from './sheet.types';
import { FillPattern, StyleColorKind } from '../core/cell.types';

const BORDER_WIDTHS: Readonly<Record<string, string>> = {
  thin: '1px solid',
  hair: '1px dotted',
  dotted: '1px dotted',
  dashed: '1px dashed',
  dashDot: '1px dashed',
  dashDotDot: '1px dashed',
  medium: '2px solid',
  mediumDashed: '2px dashed',
  mediumDashDot: '2px dashed',
  mediumDashDotDot: '2px dashed',
  slantDashDot: '2px dashed',
  thick: '3px solid',
  double: '3px double',
};

const ALIGNS: Readonly<Record<string, NuiTableAlign>> = {
  left: 'start',
  center: 'center',
  centerContinuous: 'center',
  right: 'end',
  justify: 'start',
  distributed: 'center',
  fill: 'start',
};

const GENERAL_ALIGNS: Readonly<Record<ValueShape, NuiTableAlign>> = {
  number: 'end',
  text: 'start',
  logical: 'center',
  empty: 'start',
};

const cssOf = (hex: string | undefined): string | undefined =>
  hex === undefined ? undefined : `#${hex}`;

const borderOf = (side: BorderSide | undefined, theme: ThemePalette): string | undefined => {
  const width = side === undefined ? undefined : BORDER_WIDTHS[side.style];

  return width === undefined
    ? undefined
    : `${width} ${cssOf(colorHex(side?.color, theme)) ?? 'currentColor'}`;
};

const bordersOf = (
  decoration: CellDecoration,
  theme: ThemePalette,
): NuiTableCellBorders | undefined => {
  const { border } = decoration;

  if (border === undefined) {
    return undefined;
  }

  const borders = {
    top: borderOf(border.top, theme),
    end: borderOf(border.right, theme),
    bottom: borderOf(border.bottom, theme),
    start: borderOf(border.left, theme),
  };

  return Object.values(borders).some((edge) => edge !== undefined) ? borders : undefined;
};

const fontCss = (font: FontStyle | undefined, base: FontStyle): Record<string, string> => {
  const lines = [
    font?.underline === undefined ? '' : 'underline',
    font?.strike ? 'line-through' : '',
  ]
    .filter((line) => line !== '')
    .join(' ');

  const size = font?.size;
  const baseSize = base.size ?? size;

  return {
    ...(font?.bold === true ? { 'font-weight': '700' } : {}),
    ...(font?.italic === true ? { 'font-style': 'italic' } : {}),
    ...(lines === '' ? {} : { 'text-decoration-line': lines }),
    ...(size !== undefined && baseSize !== undefined && size !== baseSize
      ? { 'font-size': `${String(Math.round((size / baseSize) * 1000) / 1000)}em` }
      : {}),
  };
};

const TEXT_ONE = 1;

const BACKGROUND_ONE = 0;

const semantic = (color: StyleColor | undefined, index: number): boolean =>
  color?.kind === StyleColorKind.Theme && color.theme === index && color.tint === 0;

const fillHex = (decoration: CellDecoration, theme: ThemePalette): string | undefined => {
  const { fill } = decoration;
  const color = fill?.foreground ?? fill?.background;

  return fill === undefined || fill.pattern === FillPattern.None || semantic(color, BACKGROUND_ONE)
    ? undefined
    : colorHex(color, theme);
};

const luminance = (hex: string): number =>
  [0, 2, 4].reduce((sum, at, index) => {
    const channel = Number.parseInt(hex.slice(at, at + 2), 16) / 255;
    const linear = channel <= 0.039_28 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;

    return sum + linear * ([0.2126, 0.7152, 0.0722][index] ?? 0);
  }, 0);

const lightFill = (fill: string): boolean => {
  const light = luminance(fill);

  return (light + 0.05) / 0.05 >= 1.05 / (light + 0.05);
};

const inkOf = (
  decoration: CellDecoration,
  theme: ThemePalette,
  fill: string | undefined,
): string | undefined => {
  const color = decoration.font?.color;
  const own = semantic(color, TEXT_ONE) && fill === undefined ? undefined : colorHex(color, theme);

  if (own !== undefined || fill === undefined) {
    return cssOf(own);
  }
  return lightFill(fill) ? '#000000' : '#FFFFFF';
};

const schemeOf = (fill: string | undefined): Record<string, string> =>
  fill === undefined ? {} : { 'color-scheme': lightFill(fill) ? 'light' : 'dark' };

export const sheetStyle = (input: StyleInput): NuiTableCellStyle | undefined => {
  const { decoration, theme, shape } = input;
  const alignment = decoration.alignment;
  const wrap = alignment?.wrap === true;
  const align = ALIGNS[alignment?.horizontal ?? ''] ?? GENERAL_ALIGNS[shape];
  const fill = fillHex(decoration, theme);
  const style = { ...fontCss(decoration.font, input.base), ...schemeOf(fill) };

  const color =
    (input.formatColor === undefined ? undefined : formatColor(input.formatColor)) ??
    inkOf(decoration, theme, fill);

  const looks: NuiTableCellStyle = {
    fill: cssOf(fill),
    color,
    align: align === NuiTableAlign.Start ? undefined : align,
    wrap: wrap ? true : undefined,
    overflow: shape === ValueShape.Text && !wrap ? true : undefined,
    borders: bordersOf(decoration, theme),
    style: Object.keys(style).length === 0 ? undefined : style,
  };

  return Object.values(looks).some((value) => value !== undefined) ? looks : undefined;
};

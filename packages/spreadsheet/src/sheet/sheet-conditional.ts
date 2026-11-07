import {
  MAX_COLS,
  colorHex,
  createConditionalPainter,
  type Calculator,
  type CellDecoration,
  type ConditionalLook,
  type DifferentialStyle,
  type ScaleLook,
  type Sheet,
  type ThemePalette,
  type Workbook,
} from '../core';
import { FillPattern, StyleColorKind } from '../core/cell.types';
import type { ConditionalLookAt, LookKeys } from './sheet.types';

const ROW_LIMIT = 512;

const NO_LOOK: ConditionalLookAt = () => undefined;

const channelsOf = (hex: string): number[] =>
  [0, 2, 4].map((at) => Number.parseInt(hex.slice(at, at + 2), 16));

const hexOf = (channel: number): string => Math.round(channel).toString(16).padStart(2, '0');

const scaleHex = (scale: ScaleLook, theme: ThemePalette): string | undefined => {
  const from = colorHex(scale.from, theme);
  const to = colorHex(scale.to, theme);

  if (from === undefined || to === undefined) {
    return from ?? to;
  }

  const ends = channelsOf(to);

  return channelsOf(from)
    .map((channel, index) => hexOf(channel + ((ends[index] ?? channel) - channel) * scale.amount))
    .join('')
    .toUpperCase();
};

const styledWith = (decoration: CellDecoration, style: DifferentialStyle): CellDecoration => ({
  ...decoration,
  font: style.font === undefined ? decoration.font : { ...decoration.font, ...style.font },
  fill: style.fill ?? decoration.fill,
  border:
    style.border === undefined ? decoration.border : { ...decoration.border, ...style.border },
});

export const decorationWith = (
  decoration: CellDecoration,
  look: ConditionalLook,
  theme: ThemePalette,
): CellDecoration => {
  const styled = look.style === undefined ? decoration : styledWith(decoration, look.style);
  const scaled = look.scale === undefined ? undefined : scaleHex(look.scale, theme);

  return scaled === undefined
    ? styled
    : {
        ...styled,
        fill: {
          pattern: FillPattern.Solid,
          foreground: { kind: StyleColorKind.Rgb, argb: `FF${scaled}` },
        },
      };
};

export const createLookKeys = (theme: ThemePalette): LookKeys => {
  const known = new WeakMap<DifferentialStyle, number>();
  let count = 0;

  const styleKey = (style: DifferentialStyle): number => {
    const found = known.get(style) ?? count;

    if (found === count) {
      known.set(style, count);
      count += 1;
    }
    return found;
  };

  return (look) =>
    `${look.style === undefined ? '' : String(styleKey(look.style))}:${
      look.scale === undefined ? '' : (scaleHex(look.scale, theme) ?? '')
    }`;
};

const revisionOf = (book: Workbook): number =>
  book.sheets.reduce((sum, sheet) => sum + sheet.cells.revision, 0);

export const createConditionalLooks = (
  book: Workbook,
  sheet: Sheet,
  calculator: Calculator | undefined,
): ConditionalLookAt => {
  if (calculator === undefined) {
    return NO_LOOK;
  }

  const painter = createConditionalPainter(calculator);
  const rows = new Map<number, ReadonlyMap<number, ConditionalLook>>();
  let revision = -1;
  let formats = sheet.conditional;

  const rowLooks = (row: number): ReadonlyMap<number, ConditionalLook> => {
    const now = revisionOf(book);

    if (now !== revision || formats !== sheet.conditional || rows.size >= ROW_LIMIT) {
      rows.clear();
      revision = now;
      formats = sheet.conditional;
    }

    const known =
      rows.get(row) ??
      painter.looks(sheet, { top: row, bottom: row, left: 0, right: MAX_COLS - 1 });

    rows.set(row, known);
    return known;
  };

  return (row, col) =>
    sheet.conditional.length === 0 ? undefined : rowLooks(row).get(row * MAX_COLS + col);
};

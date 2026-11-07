import type { NuiTableCellBar, NuiTableCellStyle } from '@numior/table';
import {
  MAX_COLS,
  colorHex,
  createConditionalPainter,
  type Calculator,
  type BarLook,
  type CellDecoration,
  type ConditionalLook,
  type DifferentialStyle,
  type ScaleLook,
  type Sheet,
  type ThemePalette,
  type Workbook,
} from '../core';
import { FillPattern, StyleColorKind } from '../core/cell.types';
import { sheetIcon } from './sheet-icons';
import type { ConditionalLookAt, LookKeys } from './sheet.types';

const ROW_LIMIT = 512;

const NO_LOOK: ConditionalLookAt = () => undefined;

const BAR_STEPS = 200;

const BAR_COLOR = 'var(--nui-primary)';

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

const barOf = (bar: BarLook, theme: ThemePalette): NuiTableCellBar => {
  const hex = colorHex(bar.color, theme);

  return {
    length: Math.round(bar.length * BAR_STEPS) / BAR_STEPS,
    color: hex === undefined ? BAR_COLOR : `#${hex}`,
  };
};

export const markedStyle = (
  style: NuiTableCellStyle | undefined,
  look: ConditionalLook,
  theme: ThemePalette,
): NuiTableCellStyle | undefined => {
  const bar = look.bar === undefined ? undefined : barOf(look.bar, theme);
  const icon = look.icon === undefined ? undefined : sheetIcon(look.icon);

  return bar === undefined && icon === undefined ? style : { ...style, bar, icon };
};

const marksKey = (look: ConditionalLook): string =>
  [
    look.bar === undefined ? '' : String(Math.round(look.bar.length * BAR_STEPS)),
    look.bar === undefined ? '' : JSON.stringify(look.bar.color),
    look.icon === undefined ? '' : `${look.icon.set}/${String(look.icon.index)}`,
  ].join(':');

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
    }:${marksKey(look)}`;
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

import {
  isBoolean,
  isNumber,
  isString,
  oneOf,
  optional,
  shapeOf,
  type Guard,
} from '@numior/primitives/guards';
import { FontScheme, FontScript, StyleColorKind, UnderlineStyle } from '../cell.types';
import type {
  AlignmentStyle,
  BorderSide,
  BorderStyle,
  CellDecoration,
  FillStyle,
  FontStyle,
  ProtectionStyle,
  StyleColor,
} from '../decorations';
import { byKind } from './wire-values';

export const isStyleColor: Guard<StyleColor> = byKind({
  [StyleColorKind.Rgb]: shapeOf({ kind: oneOf(StyleColorKind.Rgb), argb: isString }),
  [StyleColorKind.Theme]: shapeOf({
    kind: oneOf(StyleColorKind.Theme),
    theme: isNumber,
    tint: isNumber,
  }),
  [StyleColorKind.Indexed]: shapeOf({ kind: oneOf(StyleColorKind.Indexed), index: isNumber }),
  [StyleColorKind.Auto]: shapeOf({ kind: oneOf(StyleColorKind.Auto) }),
});

export const isFontStyle: Guard<FontStyle> = shapeOf({
  name: optional(isString),
  size: optional(isNumber),
  bold: optional(isBoolean),
  italic: optional(isBoolean),
  underline: optional(oneOf(...Object.values(UnderlineStyle))),
  strike: optional(isBoolean),
  color: optional(isStyleColor),
  script: optional(oneOf(...Object.values(FontScript))),
  family: optional(isNumber),
  scheme: optional(oneOf(...Object.values(FontScheme))),
});

export const isFillStyle: Guard<FillStyle> = shapeOf({
  pattern: isString,
  foreground: optional(isStyleColor),
  background: optional(isStyleColor),
});

const isBorderSide: Guard<BorderSide> = shapeOf({
  style: isString,
  color: optional(isStyleColor),
});

export const isBorderStyle: Guard<BorderStyle> = shapeOf({
  left: optional(isBorderSide),
  right: optional(isBorderSide),
  top: optional(isBorderSide),
  bottom: optional(isBorderSide),
  diagonal: optional(isBorderSide),
  diagonalUp: optional(isBoolean),
  diagonalDown: optional(isBoolean),
});

const isAlignment: Guard<AlignmentStyle> = shapeOf({
  horizontal: optional(isString),
  vertical: optional(isString),
  wrap: optional(isBoolean),
  indent: optional(isNumber),
  rotation: optional(isNumber),
  shrink: optional(isBoolean),
});

const isProtection: Guard<ProtectionStyle> = shapeOf({
  locked: optional(isBoolean),
  hidden: optional(isBoolean),
});

export const isDecoration: Guard<CellDecoration> = shapeOf({
  font: optional(isFontStyle),
  fill: optional(isFillStyle),
  border: optional(isBorderStyle),
  alignment: optional(isAlignment),
  protection: optional(isProtection),
});

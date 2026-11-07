import {
  ArrowDown,
  ArrowDownRight,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  Circle,
  CircleAlert,
  CircleCheck,
  CircleX,
  Clock3,
  Clock6,
  Clock9,
  Flag,
  Minus,
  Octagon,
  Signal,
  SignalHigh,
  SignalLow,
  SignalMedium,
  SignalZero,
  Star,
  StarHalf,
  Triangle,
  TriangleAlert,
  X,
  ChevronDown,
  ChevronUp,
} from '@lucide/vue';
import type { NuiTableCellIcon } from '@numior/table';
import { markRaw, type Component } from 'vue';
import type { IconLook } from '../core';

const ERROR = 'var(--nui-error)';

const WARNING = 'var(--nui-warning)';

const SUCCESS = 'var(--nui-success)';

const SUBTLE = 'var(--nui-text-subtle)';

const INK = 'var(--nui-text)';

const INFO = 'var(--nui-info)';

const PINK = 'color-mix(in oklab, var(--nui-error) 55%, var(--nui-surface))';

const icon = (glyph: Component, color: string, filled = false): NuiTableCellIcon => ({
  icon: markRaw(glyph),
  color,
  filled,
});

const dot = (color: string): NuiTableCellIcon => icon(Circle, color, true);

const gray = (glyphs: readonly Component[]): NuiTableCellIcon[] =>
  glyphs.map((glyph) => icon(glyph, SUBTLE));

const ARROWS_3 = [ArrowDown, ArrowRight, ArrowUp];

const ARROWS_4 = [ArrowDown, ArrowDownRight, ArrowUpRight, ArrowUp];

const ARROWS_5 = [ArrowDown, ArrowDownRight, ArrowRight, ArrowUpRight, ArrowUp];

const LIGHTS = [dot(ERROR), dot(WARNING), dot(SUCCESS)];

const RATING_5 = [SignalZero, SignalLow, SignalMedium, SignalHigh, Signal].map((glyph) =>
  icon(glyph, INFO),
);

const ICON_SETS: Readonly<Record<string, readonly NuiTableCellIcon[]>> = {
  '3Arrows': [icon(ArrowDown, ERROR), icon(ArrowRight, WARNING), icon(ArrowUp, SUCCESS)],
  '3ArrowsGray': gray(ARROWS_3),
  '4Arrows': [
    icon(ArrowDown, ERROR),
    icon(ArrowDownRight, WARNING),
    icon(ArrowUpRight, WARNING),
    icon(ArrowUp, SUCCESS),
  ],
  '4ArrowsGray': gray(ARROWS_4),
  '5Arrows': [
    icon(ArrowDown, ERROR),
    icon(ArrowDownRight, WARNING),
    icon(ArrowRight, WARNING),
    icon(ArrowUpRight, WARNING),
    icon(ArrowUp, SUCCESS),
  ],
  '5ArrowsGray': gray(ARROWS_5),
  '3Flags': [icon(Flag, ERROR, true), icon(Flag, WARNING, true), icon(Flag, SUCCESS, true)],
  '3TrafficLights1': LIGHTS,
  '3TrafficLights2': LIGHTS,
  '4TrafficLights': [dot(INK), ...LIGHTS],
  '3Signs': [icon(Octagon, ERROR, true), icon(Triangle, WARNING, true), dot(SUCCESS)],
  '3Symbols': [icon(CircleX, ERROR), icon(CircleAlert, WARNING), icon(CircleCheck, SUCCESS)],
  '3Symbols2': [icon(X, ERROR), icon(TriangleAlert, WARNING), icon(CircleCheck, SUCCESS)],
  '4RedToBlack': [dot(INK), dot(SUBTLE), dot(PINK), dot(ERROR)],
  '4Rating': RATING_5.slice(1),
  '5Rating': RATING_5,
  '5Boxes': RATING_5,
  '5Quarters': [
    icon(Circle, SUBTLE),
    icon(Clock3, SUBTLE),
    icon(Clock6, SUBTLE),
    icon(Clock9, SUBTLE),
    dot(SUBTLE),
  ],
  '3Stars': [icon(Star, WARNING), icon(StarHalf, WARNING, true), icon(Star, WARNING, true)],
  NoIcons: [],
  '3Triangles': [icon(ChevronDown, ERROR), icon(Minus, WARNING), icon(ChevronUp, SUCCESS)],
};

export const SHEET_ICON_SETS: readonly string[] = [
  '3TrafficLights1',
  '4TrafficLights',
  '3Signs',
  '3Symbols',
  '3Symbols2',
  '3Flags',
  '3Arrows',
  '4Arrows',
  '5Arrows',
  '3ArrowsGray',
  '4ArrowsGray',
  '5ArrowsGray',
  '3Triangles',
  '3Stars',
  '4Rating',
  '5Rating',
  '5Quarters',
  '4RedToBlack',
];

export const sheetIcons = (set: string): readonly NuiTableCellIcon[] => ICON_SETS[set] ?? LIGHTS;

export const sheetIcon = (look: IconLook): NuiTableCellIcon | undefined => {
  const steps = sheetIcons(look.set);

  return steps[Math.min(Math.max(look.index, 0), steps.length - 1)];
};

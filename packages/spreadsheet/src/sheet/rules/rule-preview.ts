import { colorHex, type ConditionalRule, type DifferentialStyle } from '../../core';
import { ConditionalRuleKind } from '../../core/conditional/conditional.types';
import { ValueShape } from '../sheet.types';
import { decorationWith } from '../sheet-conditional';
import { sheetIcons } from '../sheet-icons';
import { sheetStyle } from '../sheet-style';
import { RulePreviewKind, type RuleLooks, type RulePreview } from './rules.types';

const NO_STYLE: Readonly<Record<string, string>> = {};

const PAPER = '#ffffff';

const INK = 'CanvasText';

const BLANK: RulePreview = { kind: RulePreviewKind.Blank, style: NO_STYLE, icons: [] };

const hexCss = (hex: string | undefined): string | undefined =>
  hex === undefined ? undefined : `#${hex}`;

export const stylePreview = (style: DifferentialStyle, looks: RuleLooks): RulePreview => {
  const cell = sheetStyle({
    decoration: decorationWith({}, { style }, looks.theme),
    theme: looks.theme,
    base: looks.font,
    shape: ValueShape.Text,
    formatColor: undefined,
  });

  const borders = cell?.borders;

  const css: Record<string, string> = {
    'color-scheme': 'light',
    ...cell?.style,
    background: cell?.fill ?? PAPER,
    color: cell?.color ?? INK,
    ...(borders?.top === undefined ? {} : { 'border-block-start': borders.top }),
    ...(borders?.bottom === undefined ? {} : { 'border-block-end': borders.bottom }),
    ...(borders?.start === undefined ? {} : { 'border-inline-start': borders.start }),
    ...(borders?.end === undefined ? {} : { 'border-inline-end': borders.end }),
  };

  return { kind: RulePreviewKind.Style, style: css, icons: [] };
};

export const rulePreview = (rule: ConditionalRule, looks: RuleLooks): RulePreview => {
  switch (rule.kind) {
    case ConditionalRuleKind.ColorScale: {
      const stops = rule.stops.map(
        (stop) => hexCss(colorHex(stop.color, looks.theme)) ?? 'transparent',
      );

      return {
        kind: RulePreviewKind.Scale,
        style: { background: `linear-gradient(90deg, ${stops.join(', ')})` },
        icons: [],
      };
    }
    case ConditionalRuleKind.DataBar: {
      const color = hexCss(colorHex(rule.color, looks.theme));

      return {
        kind: RulePreviewKind.Bar,
        style: color === undefined ? NO_STYLE : { '--_bar-color': color },
        icons: [],
      };
    }
    case ConditionalRuleKind.IconSet:
      return { kind: RulePreviewKind.Icons, style: NO_STYLE, icons: sheetIcons(rule.set) };
    case ConditionalRuleKind.Foreign:
      return BLANK;
    default:
      return stylePreview(rule.style, looks);
  }
};

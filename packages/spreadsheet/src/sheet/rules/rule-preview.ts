import { type NuiTableCellBorders, NuiTableCellScheme } from '@numior/table';
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

const BORDER_PROPERTIES = [
  ['top', 'border-block-start'],
  ['bottom', 'border-block-end'],
  ['start', 'border-inline-start'],
  ['end', 'border-inline-end'],
] as const;

const borderCss = (borders: NuiTableCellBorders | undefined): Record<string, string> =>
  BORDER_PROPERTIES.reduce<Record<string, string>>((css, [side, property]) => {
    const line = borders?.[side];

    if (line !== undefined) {
      css[property] = line;
    }

    return css;
  }, {});

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

  const css: Record<string, string> = {
    ...cell?.style,
    'color-scheme': cell?.scheme ?? NuiTableCellScheme.Light,
    background: cell?.fill ?? PAPER,
    color: cell?.color ?? INK,
    ...borderCss(cell?.borders),
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

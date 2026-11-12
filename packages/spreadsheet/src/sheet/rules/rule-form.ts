import {
  CONDITIONAL_PRESETS,
  formatCell,
  parseCell,
  parseFormula,
  printFormula,
  type BookLocale,
  type CellAddress,
  type CellRange,
  type ConditionalRule,
  type DifferentialStyle,
  type FormulaNode,
  type PlacedRule,
  type SignatureOf,
} from '../../core';
import { FillPattern, StyleColorKind } from '../../core/cell.types';
import {
  CellIsOperator,
  ConditionalRuleKind,
  TextOperator,
  ThresholdKind,
  TimePeriod,
  type Threshold,
} from '../../core/conditional/conditional.types';
import type { StyleColor } from '../../core/decorations';
import {
  AverageChoice,
  CUSTOM_PRESET,
  RuleField,
  RuleFormKind,
  type CustomLook,
  type ParsedValue,
  type RuleReading,
  type RuleForm,
  type RuleFormResult,
} from './rules.types';

type StyledKind =
  | typeof RuleFormKind.Duplicates
  | typeof RuleFormKind.Uniques
  | typeof RuleFormKind.Blanks
  | typeof RuleFormKind.Filled
  | typeof RuleFormKind.Errors
  | typeof RuleFormKind.NoErrors;

const rgb = (hex: string): StyleColor => ({ kind: StyleColorKind.Rgb, argb: `FF${hex}` });

const SCALE_TWO: readonly StyleColor[] = [rgb('F8696B'), rgb('63BE7B')];

const SCALE_THREE: readonly StyleColor[] = [rgb('F8696B'), rgb('FFEB84'), rgb('63BE7B')];

const BAR_COLOR = rgb('638EC6');

const DEFAULT_SET = '3TrafficLights1';

const NO_LOOK: CustomLook = {
  bold: false,
  italic: false,
  strike: false,
  color: undefined,
  fill: undefined,
};

const ORIGIN: CellAddress = { row: 0, col: 0 };

const VALUE_TESTS: ReadonlySet<string> = new Set([
  RuleFormKind.Duplicates,
  RuleFormKind.Uniques,
  RuleFormKind.Blanks,
  RuleFormKind.Filled,
  RuleFormKind.Errors,
  RuleFormKind.NoErrors,
]);

const isValueTest = (kind: RuleFormKind): kind is StyledKind => VALUE_TESTS.has(kind);

const BLANK_FORM: RuleForm = {
  kind: RuleFormKind.CellIs,
  area: '',
  operator: CellIsOperator.GreaterThan,
  first: '',
  second: '',
  formula: '',
  textOperator: TextOperator.Contains,
  text: '',
  period: TimePeriod.Today,
  rank: '10',
  percent: false,
  bottom: false,
  average: AverageChoice.Above,
  preset: CONDITIONAL_PRESETS[0]?.key ?? CUSTOM_PRESET,
  custom: NO_LOOK,
  base: {},
  colors: SCALE_TWO,
  iconSet: DEFAULT_SET,
  showValue: true,
  stopIfTrue: false,
  source: undefined,
};

const rangeText = (range: CellRange): string => {
  const from = formatCell({ row: range.top, col: range.left });

  return range.top === range.bottom && range.left === range.right
    ? from
    : `${from}:${formatCell({ row: range.bottom, col: range.right })}`;
};

export const areaText = (ranges: readonly CellRange[]): string => ranges.map(rangeText).join(', ');

const rangeOf = (part: string): CellRange | undefined => {
  const [from, to = from, ...rest] = part.split(':');
  const start = from === undefined ? undefined : parseCell(from);
  const end = to === undefined ? undefined : parseCell(to);

  if (start === undefined || end === undefined || rest.length > 0) {
    return undefined;
  }
  return {
    top: Math.min(start.row, end.row),
    left: Math.min(start.col, end.col),
    bottom: Math.max(start.row, end.row),
    right: Math.max(start.col, end.col),
  };
};

export const parseArea = (text: string): CellRange[] | undefined => {
  const parts = text
    .toUpperCase()
    .split(/[,;\s]+/u)
    .filter((part) => part !== '');

  const ranges = parts.reduce<CellRange[] | undefined>((found, part) => {
    const range = rangeOf(part.replaceAll('$', ''));

    return found === undefined || range === undefined ? undefined : [...found, range];
  }, []);

  return ranges === undefined || ranges.length === 0 ? undefined : ranges;
};

const originOf = (ranges: readonly CellRange[]): CellAddress => {
  const first = ranges[0];

  return first === undefined ? ORIGIN : { row: first.top, col: first.left };
};

const sameStyle = (left: DifferentialStyle, right: DifferentialStyle): boolean =>
  JSON.stringify(left) === JSON.stringify(right);

const presetOf = (style: DifferentialStyle): string =>
  CONDITIONAL_PRESETS.find((preset) => sameStyle(preset.style, style))?.key ?? CUSTOM_PRESET;

const lookOf = (style: DifferentialStyle): CustomLook => ({
  bold: style.font?.bold === true,
  italic: style.font?.italic === true,
  strike: style.font?.strike === true,
  color: style.font?.color,
  fill: style.fill?.background ?? style.fill?.foreground,
});

const styleFields = (style: DifferentialStyle) => ({
  preset: presetOf(style),
  custom: lookOf(style),
  base: style,
});

const valueText = (
  formula: FormulaNode | undefined,
  locale: BookLocale,
  origin: CellAddress,
): string => (formula === undefined ? '' : printFormula(formula, locale.formulas, origin));

const averageOf = (below: boolean, equal: boolean): AverageChoice => {
  if (below) {
    return equal ? AverageChoice.BelowEqual : AverageChoice.Below;
  }
  return equal ? AverageChoice.AboveEqual : AverageChoice.Above;
};

const ruleFields = (
  rule: ConditionalRule,
  locale: BookLocale,
  origin: CellAddress,
): Partial<RuleForm> => {
  switch (rule.kind) {
    case ConditionalRuleKind.CellIs:
      return {
        kind: RuleFormKind.CellIs,
        operator: rule.operator,
        first: valueText(rule.formulas[0], locale, origin),
        second: valueText(rule.formulas[1], locale, origin),
        ...styleFields(rule.style),
      };
    case ConditionalRuleKind.Expression:
      return {
        kind: RuleFormKind.Expression,
        formula: `=${valueText(rule.formula, locale, origin)}`,
        ...styleFields(rule.style),
      };
    case ConditionalRuleKind.Text:
      return {
        kind: RuleFormKind.Text,
        textOperator: rule.operator,
        text: rule.text,
        ...styleFields(rule.style),
      };
    case ConditionalRuleKind.TimePeriod:
      return { kind: RuleFormKind.TimePeriod, period: rule.period, ...styleFields(rule.style) };
    case ConditionalRuleKind.Top:
      return {
        kind: RuleFormKind.Top,
        rank: String(rule.rank),
        percent: rule.percent,
        bottom: rule.bottom,
        ...styleFields(rule.style),
      };
    case ConditionalRuleKind.AboveAverage:
      return {
        kind: RuleFormKind.AboveAverage,
        average: averageOf(rule.below, rule.equal),
        ...styleFields(rule.style),
      };
    case ConditionalRuleKind.ColorScale:
      return {
        kind: rule.stops.length > 2 ? RuleFormKind.ThreeColorScale : RuleFormKind.TwoColorScale,
        colors: rule.stops.map((stop) => stop.color),
      };
    case ConditionalRuleKind.DataBar:
      return { kind: RuleFormKind.DataBar, colors: [rule.color], showValue: rule.showValue };
    case ConditionalRuleKind.IconSet:
      return { kind: RuleFormKind.IconSet, iconSet: rule.set, showValue: rule.showValue };
    case ConditionalRuleKind.Foreign:
      return {};
    default:
      return { kind: rule.kind, ...styleFields(rule.style) };
  }
};

export const formOf = (
  placed: PlacedRule | undefined,
  selection: readonly CellRange[],
  locale: BookLocale,
): RuleForm => {
  if (placed === undefined) {
    return { ...BLANK_FORM, area: areaText(selection) };
  }
  return {
    ...BLANK_FORM,
    area: areaText(placed.ranges),
    stopIfTrue: placed.entry.stopIfTrue,
    source: placed.entry.rule,
    ...ruleFields(placed.entry.rule, locale, originOf(placed.ranges)),
  };
};

const lookStyle = (form: RuleForm): DifferentialStyle => {
  const { custom, base } = form;
  const font = { ...base.font, bold: custom.bold, italic: custom.italic, strike: custom.strike };

  return {
    ...base,
    font:
      custom.color === undefined ? { ...font, color: undefined } : { ...font, color: custom.color },
    fill:
      custom.fill === undefined
        ? undefined
        : { pattern: FillPattern.Solid, background: custom.fill },
  };
};

export const formStyle = (form: RuleForm): DifferentialStyle =>
  form.preset === CUSTOM_PRESET
    ? lookStyle(form)
    : (CONDITIONAL_PRESETS.find((preset) => preset.key === form.preset)?.style ?? lookStyle(form));

const number = (value: number): FormulaNode => ({ kind: 'number', value });

const evenThresholds = (count: number): Threshold[] =>
  Array.from({ length: count }, (_, index): Threshold =>
    index === 0
      ? { kind: ThresholdKind.Min }
      : { kind: ThresholdKind.Percent, value: number(Math.round((100 * index) / count)) },
  );

const iconCount = (set: string): number => Number.parseInt(set, 10) || 3;

const scaleStops = (colors: readonly StyleColor[]) =>
  colors.map((color, index) => ({
    threshold:
      index === 0
        ? { kind: ThresholdKind.Min }
        : index === colors.length - 1
          ? { kind: ThresholdKind.Max }
          : { kind: ThresholdKind.Percentile, value: number(50) },
    color,
  }));

const parsedValue = (text: string, reading: RuleReading): ParsedValue => {
  const trimmed = text.trim();

  if (trimmed === '') {
    return { ok: false };
  }

  const parsed = parseFormula(trimmed, reading.locale.formulas, reading.origin, {
    signatures: reading.signatures,
  });

  return parsed.ok ? { ok: true, ast: parsed.ast } : { ok: false };
};

const refused = (field: RuleField): RuleFormResult => ({ ok: false, field });

const twoValues = (operator: CellIsOperator): boolean =>
  operator === CellIsOperator.Between || operator === CellIsOperator.NotBetween;

const cellIsRule = (form: RuleForm, reading: RuleReading): ConditionalRule | RuleField => {
  const first = parsedValue(form.first, reading);
  const second = twoValues(form.operator) ? parsedValue(form.second, reading) : undefined;

  if (!first.ok) {
    return RuleField.First;
  }
  if (second !== undefined && !second.ok) {
    return RuleField.Second;
  }
  return {
    kind: ConditionalRuleKind.CellIs,
    operator: form.operator,
    formulas: second === undefined ? [first.ast] : [first.ast, second.ast],
    style: formStyle(form),
  };
};

const rankRule = (form: RuleForm): ConditionalRule | RuleField => {
  const rank = Number(form.rank.trim());

  if (!Number.isInteger(rank) || rank < 1 || (form.percent && rank > 100)) {
    return RuleField.Rank;
  }
  return {
    kind: ConditionalRuleKind.Top,
    rank,
    percent: form.percent,
    bottom: form.bottom,
    style: formStyle(form),
  };
};

const expressionRule = (form: RuleForm, reading: RuleReading): ConditionalRule | RuleField => {
  const parsed = parsedValue(form.formula, reading);

  return parsed.ok
    ? { kind: ConditionalRuleKind.Expression, formula: parsed.ast, style: formStyle(form) }
    : RuleField.Formula;
};

const textRule = (form: RuleForm): ConditionalRule | RuleField =>
  form.text === ''
    ? RuleField.Text
    : {
        kind: ConditionalRuleKind.Text,
        operator: form.textOperator,
        text: form.text,
        style: formStyle(form),
      };

const averageRule = (form: RuleForm): ConditionalRule => ({
  kind: ConditionalRuleKind.AboveAverage,
  below: form.average === AverageChoice.Below || form.average === AverageChoice.BelowEqual,
  equal: form.average === AverageChoice.AboveEqual || form.average === AverageChoice.BelowEqual,
  deviations: form.source?.kind === ConditionalRuleKind.AboveAverage ? form.source.deviations : 0,
  style: formStyle(form),
});

const scaleColors = (form: RuleForm): readonly StyleColor[] => {
  const wanted = form.kind === RuleFormKind.ThreeColorScale ? SCALE_THREE : SCALE_TWO;

  return form.colors.length === wanted.length ? form.colors : wanted;
};

const barRule = (form: RuleForm): ConditionalRule => {
  const source = form.source?.kind === ConditionalRuleKind.DataBar ? form.source : undefined;

  return {
    kind: ConditionalRuleKind.DataBar,
    min: source?.min ?? { kind: ThresholdKind.Min },
    max: source?.max ?? { kind: ThresholdKind.Max },
    color: form.colors[0] ?? BAR_COLOR,
    showValue: form.showValue,
  };
};

const iconRule = (form: RuleForm): ConditionalRule => {
  const source =
    form.source?.kind === ConditionalRuleKind.IconSet && form.source.set === form.iconSet
      ? form.source
      : undefined;

  return {
    kind: ConditionalRuleKind.IconSet,
    set: form.iconSet,
    thresholds: source?.thresholds ?? evenThresholds(iconCount(form.iconSet)),
    reverse: source?.reverse ?? false,
    showValue: form.showValue,
  };
};

const scaleRule = (form: RuleForm): ConditionalRule => {
  const colors = scaleColors(form);
  const source = form.source?.kind === ConditionalRuleKind.ColorScale ? form.source : undefined;

  return {
    kind: ConditionalRuleKind.ColorScale,
    stops:
      source?.stops.length === colors.length
        ? source.stops.map((stop, index) => ({ ...stop, color: colors[index] ?? stop.color }))
        : scaleStops(colors),
  };
};

const markRule = (form: RuleForm): ConditionalRule => {
  switch (form.kind) {
    case RuleFormKind.DataBar:
      return barRule(form);
    case RuleFormKind.IconSet:
      return iconRule(form);
    default:
      return scaleRule(form);
  }
};

const formRule = (form: RuleForm, reading: RuleReading): ConditionalRule | RuleField => {
  switch (form.kind) {
    case RuleFormKind.CellIs:
      return cellIsRule(form, reading);
    case RuleFormKind.Expression:
      return expressionRule(form, reading);
    case RuleFormKind.Text:
      return textRule(form);
    case RuleFormKind.TimePeriod:
      return { kind: ConditionalRuleKind.TimePeriod, period: form.period, style: formStyle(form) };
    case RuleFormKind.Top:
      return rankRule(form);
    case RuleFormKind.AboveAverage:
      return averageRule(form);
    default:
      return isValueTest(form.kind) ? { kind: form.kind, style: formStyle(form) } : markRule(form);
  }
};

const isField = (value: ConditionalRule | RuleField): value is RuleField =>
  typeof value === 'string';

export const ruleOf = (
  form: RuleForm,
  locale: BookLocale,
  signatures: SignatureOf,
): RuleFormResult => {
  const ranges = parseArea(form.area);

  if (ranges === undefined) {
    return refused(RuleField.Area);
  }

  const rule = formRule(form, { locale, origin: originOf(ranges), signatures });

  return isField(rule)
    ? refused(rule)
    : { ok: true, draft: { ranges, rule, stopIfTrue: form.stopIfTrue } };
};

export const styledForm = (kind: RuleFormKind): boolean =>
  kind !== RuleFormKind.TwoColorScale &&
  kind !== RuleFormKind.ThreeColorScale &&
  kind !== RuleFormKind.DataBar &&
  kind !== RuleFormKind.IconSet;

const colorsFor = (form: RuleForm, kind: RuleFormKind): readonly StyleColor[] => {
  if (kind === form.kind) {
    return form.colors;
  }
  switch (kind) {
    case RuleFormKind.DataBar:
      return [BAR_COLOR];
    case RuleFormKind.TwoColorScale:
      return SCALE_TWO;
    case RuleFormKind.ThreeColorScale:
      return SCALE_THREE;
    default:
      return form.colors;
  }
};

export const withKind = (form: RuleForm, kind: RuleFormKind): RuleForm => ({
  ...form,
  kind,
  colors: colorsFor(form, kind),
});

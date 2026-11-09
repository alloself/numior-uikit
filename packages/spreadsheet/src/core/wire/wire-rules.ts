import {
  anyOf,
  isBoolean,
  isNumber,
  isString,
  listOf,
  oneOf,
  optional,
  shapeOf,
  type Guard,
} from '@numior/primitives/guards';
import {
  CellIsOperator,
  ConditionalRuleKind,
  TextOperator,
  ThresholdKind,
  TimePeriod,
  type ConditionalEntry,
  type ConditionalFormat,
  type ConditionalRule,
  type DifferentialStyle,
  type Threshold,
} from '../conditional/conditional.types';
import { isBorderStyle, isFillStyle, isFontStyle, isStyleColor } from './wire-styles';
import { isFormula, isRange } from './wire-values';

const isDifferential: Guard<DifferentialStyle> = shapeOf({
  font: optional(isFontStyle),
  fill: optional(isFillStyle),
  border: optional(isBorderStyle),
  format: optional(isString),
});

const isThreshold: Guard<Threshold> = anyOf(
  shapeOf({
    kind: oneOf(ThresholdKind.Min, ThresholdKind.Max, ThresholdKind.AutoMin, ThresholdKind.AutoMax),
  }),
  shapeOf({
    kind: oneOf(
      ThresholdKind.Number,
      ThresholdKind.Percent,
      ThresholdKind.Percentile,
      ThresholdKind.Formula,
    ),
    value: isFormula,
  }),
);

const isRule: Guard<ConditionalRule> = anyOf(
  shapeOf({
    kind: oneOf(ConditionalRuleKind.CellIs),
    operator: oneOf(...Object.values(CellIsOperator)),
    formulas: listOf(isFormula),
    style: isDifferential,
  }),
  shapeOf({
    kind: oneOf(ConditionalRuleKind.Expression),
    formula: isFormula,
    style: isDifferential,
  }),
  shapeOf({
    kind: oneOf(ConditionalRuleKind.ColorScale),
    stops: listOf(shapeOf({ threshold: isThreshold, color: isStyleColor })),
  }),
  shapeOf({
    kind: oneOf(ConditionalRuleKind.DataBar),
    min: isThreshold,
    max: isThreshold,
    color: isStyleColor,
    showValue: isBoolean,
  }),
  shapeOf({
    kind: oneOf(ConditionalRuleKind.IconSet),
    set: isString,
    thresholds: listOf(isThreshold),
    reverse: isBoolean,
    showValue: isBoolean,
  }),
  shapeOf({
    kind: oneOf(ConditionalRuleKind.Top),
    rank: isNumber,
    percent: isBoolean,
    bottom: isBoolean,
    style: isDifferential,
  }),
  shapeOf({
    kind: oneOf(ConditionalRuleKind.AboveAverage),
    below: isBoolean,
    equal: isBoolean,
    deviations: isNumber,
    style: isDifferential,
  }),
  shapeOf({
    kind: oneOf(ConditionalRuleKind.Text),
    operator: oneOf(...Object.values(TextOperator)),
    text: isString,
    style: isDifferential,
  }),
  shapeOf({
    kind: oneOf(
      ConditionalRuleKind.Duplicates,
      ConditionalRuleKind.Uniques,
      ConditionalRuleKind.Blanks,
      ConditionalRuleKind.Filled,
      ConditionalRuleKind.Errors,
      ConditionalRuleKind.NoErrors,
    ),
    style: isDifferential,
  }),
  shapeOf({
    kind: oneOf(ConditionalRuleKind.TimePeriod),
    period: oneOf(...Object.values(TimePeriod)),
    style: isDifferential,
  }),
  shapeOf({
    kind: oneOf(ConditionalRuleKind.Foreign),
    xml: isString,
    formulas: optional(listOf(isFormula)),
  }),
);

const isEntry: Guard<ConditionalEntry> = shapeOf({
  rule: isRule,
  priority: isNumber,
  stopIfTrue: isBoolean,
  extra: optional(isString),
});

export const isConditionalFormat: Guard<ConditionalFormat> = shapeOf({
  ranges: listOf(isRange),
  rules: listOf(isEntry),
  extension: optional(isBoolean),
});

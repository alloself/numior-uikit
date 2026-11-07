import type { CellRange } from '../cell.types';
import type { BorderStyle, FillStyle, FontStyle, StyleColor } from '../decorations';
import type { FormulaNode } from '../formula/formula.types';

export interface DifferentialStyle {
  readonly font?: FontStyle | undefined;
  readonly fill?: FillStyle | undefined;
  readonly border?: BorderStyle | undefined;
  readonly format?: string | undefined;
}

export type Threshold =
  | {
      readonly kind:
        | typeof ThresholdKind.Min
        | typeof ThresholdKind.Max
        | typeof ThresholdKind.AutoMin
        | typeof ThresholdKind.AutoMax;
    }
  | {
      readonly kind:
        | typeof ThresholdKind.Number
        | typeof ThresholdKind.Percent
        | typeof ThresholdKind.Percentile
        | typeof ThresholdKind.Formula;
      readonly value: FormulaNode;
    };

export interface ScaleStop {
  readonly threshold: Threshold;
  readonly color: StyleColor;
}

export type CellIsOperator = (typeof CellIsOperator)[keyof typeof CellIsOperator];

export type TextOperator = (typeof TextOperator)[keyof typeof TextOperator];

export type TimePeriod = (typeof TimePeriod)[keyof typeof TimePeriod];

export type ConditionalRule =
  | {
      readonly kind: typeof ConditionalRuleKind.CellIs;
      readonly operator: CellIsOperator;
      readonly formulas: readonly FormulaNode[];
      readonly style: DifferentialStyle;
    }
  | {
      readonly kind: typeof ConditionalRuleKind.Expression;
      readonly formula: FormulaNode;
      readonly style: DifferentialStyle;
    }
  | { readonly kind: typeof ConditionalRuleKind.ColorScale; readonly stops: readonly ScaleStop[] }
  | {
      readonly kind: typeof ConditionalRuleKind.DataBar;
      readonly min: Threshold;
      readonly max: Threshold;
      readonly color: StyleColor;
      readonly showValue: boolean;
    }
  | {
      readonly kind: typeof ConditionalRuleKind.IconSet;
      readonly set: string;
      readonly thresholds: readonly Threshold[];
      readonly reverse: boolean;
      readonly showValue: boolean;
    }
  | {
      readonly kind: typeof ConditionalRuleKind.Top;
      readonly rank: number;
      readonly percent: boolean;
      readonly bottom: boolean;
      readonly style: DifferentialStyle;
    }
  | {
      readonly kind: typeof ConditionalRuleKind.AboveAverage;
      readonly below: boolean;
      readonly equal: boolean;
      readonly deviations: number;
      readonly style: DifferentialStyle;
    }
  | {
      readonly kind: typeof ConditionalRuleKind.Text;
      readonly operator: TextOperator;
      readonly text: string;
      readonly style: DifferentialStyle;
    }
  | {
      readonly kind:
        | typeof ConditionalRuleKind.Duplicates
        | typeof ConditionalRuleKind.Uniques
        | typeof ConditionalRuleKind.Blanks
        | typeof ConditionalRuleKind.Filled
        | typeof ConditionalRuleKind.Errors
        | typeof ConditionalRuleKind.NoErrors;
      readonly style: DifferentialStyle;
    }
  | {
      readonly kind: typeof ConditionalRuleKind.TimePeriod;
      readonly period: TimePeriod;
      readonly style: DifferentialStyle;
    }
  | {
      readonly kind: typeof ConditionalRuleKind.Foreign;
      readonly xml: string;
      readonly formulas?: readonly FormulaNode[] | undefined;
    };

export interface ConditionalEntry {
  readonly rule: ConditionalRule;
  readonly priority: number;
  readonly stopIfTrue: boolean;
  readonly extra?: string | undefined;
}

export interface ConditionalFormat {
  readonly ranges: readonly CellRange[];
  readonly rules: readonly ConditionalEntry[];
  readonly extension?: boolean | undefined;
}

export interface PlacedRule {
  readonly ranges: readonly CellRange[];
  readonly entry: ConditionalEntry;
}

export interface RuleDraft {
  readonly ranges: readonly CellRange[];
  readonly rule: ConditionalRule;
  readonly stopIfTrue: boolean;
}

export interface ConditionalPreset {
  readonly key: string;
  readonly style: DifferentialStyle;
}

export interface ScaleLook {
  readonly from: StyleColor;
  readonly to: StyleColor;
  readonly amount: number;
}

export interface BarLook {
  readonly length: number;
  readonly color: StyleColor;
}

export interface IconLook {
  readonly set: string;
  readonly index: number;
}

export interface ConditionalLook {
  readonly style?: DifferentialStyle | undefined;
  readonly scale?: ScaleLook | undefined;
  readonly bar?: BarLook | undefined;
  readonly icon?: IconLook | undefined;
  readonly hideValue?: boolean | undefined;
}

export const CellIsOperator = {
  Between: 'between',
  NotBetween: 'notBetween',
  Equal: 'equal',
  NotEqual: 'notEqual',
  GreaterThan: 'greaterThan',
  LessThan: 'lessThan',
  GreaterThanOrEqual: 'greaterThanOrEqual',
  LessThanOrEqual: 'lessThanOrEqual',
} as const;

export const TextOperator = {
  Contains: 'contains',
  NotContains: 'notContains',
  BeginsWith: 'beginsWith',
  EndsWith: 'endsWith',
} as const;

export const TimePeriod = {
  Today: 'today',
  Yesterday: 'yesterday',
  Tomorrow: 'tomorrow',
  Last7Days: 'last7Days',
  ThisWeek: 'thisWeek',
  LastWeek: 'lastWeek',
  NextWeek: 'nextWeek',
  ThisMonth: 'thisMonth',
  LastMonth: 'lastMonth',
  NextMonth: 'nextMonth',
} as const;

export const ThresholdKind = {
  Min: 'min',
  Max: 'max',
  AutoMin: 'autoMin',
  AutoMax: 'autoMax',
  Number: 'number',
  Percent: 'percent',
  Percentile: 'percentile',
  Formula: 'formula',
} as const;

export const ConditionalRuleKind = {
  CellIs: 'cellIs',
  Expression: 'expression',
  ColorScale: 'colorScale',
  DataBar: 'dataBar',
  IconSet: 'iconSet',
  Top: 'top',
  AboveAverage: 'aboveAverage',
  Text: 'text',
  Duplicates: 'duplicates',
  Uniques: 'uniques',
  Blanks: 'blanks',
  Filled: 'filled',
  Errors: 'errors',
  NoErrors: 'noErrors',
  TimePeriod: 'timePeriod',
  Foreign: 'foreign',
} as const;

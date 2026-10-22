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
  | { readonly kind: 'min' | 'max' | 'autoMin' | 'autoMax' }
  | {
      readonly kind: 'number' | 'percent' | 'percentile' | 'formula';
      readonly value: FormulaNode;
    };

export interface ScaleStop {
  readonly threshold: Threshold;
  readonly color: StyleColor;
}

export type CellIsOperator =
  | 'between'
  | 'notBetween'
  | 'equal'
  | 'notEqual'
  | 'greaterThan'
  | 'lessThan'
  | 'greaterThanOrEqual'
  | 'lessThanOrEqual';

export type TextOperator = 'contains' | 'notContains' | 'beginsWith' | 'endsWith';

export type TimePeriod =
  | 'today'
  | 'yesterday'
  | 'tomorrow'
  | 'last7Days'
  | 'thisWeek'
  | 'lastWeek'
  | 'nextWeek'
  | 'thisMonth'
  | 'lastMonth'
  | 'nextMonth';

export type ConditionalRule =
  | {
      readonly kind: 'cellIs';
      readonly operator: CellIsOperator;
      readonly formulas: readonly FormulaNode[];
      readonly style: DifferentialStyle;
    }
  | {
      readonly kind: 'expression';
      readonly formula: FormulaNode;
      readonly style: DifferentialStyle;
    }
  | { readonly kind: 'colorScale'; readonly stops: readonly ScaleStop[] }
  | {
      readonly kind: 'dataBar';
      readonly min: Threshold;
      readonly max: Threshold;
      readonly color: StyleColor;
      readonly showValue: boolean;
    }
  | {
      readonly kind: 'iconSet';
      readonly set: string;
      readonly thresholds: readonly Threshold[];
      readonly reverse: boolean;
      readonly showValue: boolean;
    }
  | {
      readonly kind: 'top';
      readonly rank: number;
      readonly percent: boolean;
      readonly bottom: boolean;
      readonly style: DifferentialStyle;
    }
  | {
      readonly kind: 'aboveAverage';
      readonly below: boolean;
      readonly equal: boolean;
      readonly deviations: number;
      readonly style: DifferentialStyle;
    }
  | {
      readonly kind: 'text';
      readonly operator: TextOperator;
      readonly text: string;
      readonly style: DifferentialStyle;
    }
  | {
      readonly kind: 'duplicates' | 'uniques' | 'blanks' | 'filled' | 'errors' | 'noErrors';
      readonly style: DifferentialStyle;
    }
  | { readonly kind: 'timePeriod'; readonly period: TimePeriod; readonly style: DifferentialStyle }
  | { readonly kind: 'foreign'; readonly xml: string };

export interface ConditionalEntry {
  readonly rule: ConditionalRule;
  readonly priority: number;
  readonly stopIfTrue: boolean;
  readonly extra?: string | undefined;
}

export interface ConditionalFormat {
  readonly ranges: readonly CellRange[];
  readonly rules: readonly ConditionalEntry[];
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

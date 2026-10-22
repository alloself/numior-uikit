import type { ErrorTexts } from '../error-texts';

export interface NumberLocale {
  readonly name: string;
  readonly decimal: string;
  readonly group: string;
  readonly months: readonly string[];
  readonly monthsGenitive: readonly string[];
  readonly monthsShort: readonly string[];
  readonly days: readonly string[];
  readonly daysShort: readonly string[];
  readonly am: string;
  readonly pm: string;
  readonly trueText: string;
  readonly falseText: string;
  readonly errors: ErrorTexts;
  readonly dateOrder: 'mdy' | 'dmy';
  readonly shortDate: string;
  readonly longDate: string;
  readonly shortTime: string;
  readonly longTime: string;
  readonly currencyPositive: string;
  readonly currencyNegative: string;
  readonly currencySymbols: readonly string[];
  readonly generalName: string;
}

export type FormatCondition = {
  readonly op: '<' | '<=' | '>' | '>=' | '=' | '<>';
  readonly value: number;
};

export type DateUnit =
  | 'year'
  | 'month'
  | 'day'
  | 'hour'
  | 'minute'
  | 'second'
  | 'subsecond'
  | 'ampm'
  | 'hours'
  | 'minutes'
  | 'seconds';

export type FormatToken =
  | { readonly kind: 'literal'; readonly text: string }
  | { readonly kind: 'digit'; readonly char: '0' | '#' | '?' }
  | { readonly kind: 'point' }
  | { readonly kind: 'comma' }
  | { readonly kind: 'percent' }
  | { readonly kind: 'exponent'; readonly plus: boolean }
  | { readonly kind: 'slash' }
  | { readonly kind: 'text' }
  | { readonly kind: 'fill'; readonly char: string }
  | { readonly kind: 'general' }
  | {
      readonly kind: 'date';
      readonly unit: DateUnit;
      readonly width: number;
      readonly code: string;
    };

export type SectionKind = 'number' | 'date' | 'text' | 'literal';

export interface FormatSection {
  readonly kind: SectionKind;
  readonly tokens: readonly FormatToken[];
  readonly condition: FormatCondition | undefined;
  readonly color: number | undefined;
  readonly locale: NumberLocale | undefined;
  readonly system: 'date' | 'time' | undefined;
}

export interface NumberFormat {
  readonly code: string;
  readonly sections: readonly FormatSection[];
}

export interface FormatFill {
  readonly char: string;
  readonly at: number;
}

export interface FormattedValue {
  readonly text: string;
  readonly color: number | undefined;
  readonly fill: FormatFill | undefined;
}

import type { ErrorTexts } from '../error-texts';

export type CommaRole = (typeof CommaRole)[keyof typeof CommaRole];

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
  readonly dateOrder: typeof DateOrder.Mdy | typeof DateOrder.Dmy;
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

export type DateUnit = (typeof DateUnit)[keyof typeof DateUnit];

export type FormatToken =
  | { readonly kind: typeof FormatTokenKind.Literal; readonly text: string }
  | { readonly kind: typeof FormatTokenKind.Digit; readonly char: '0' | '#' | '?' }
  | { readonly kind: typeof FormatTokenKind.Point }
  | { readonly kind: typeof FormatTokenKind.Comma }
  | { readonly kind: typeof FormatTokenKind.Percent }
  | { readonly kind: typeof FormatTokenKind.Exponent; readonly plus: boolean }
  | { readonly kind: typeof FormatTokenKind.Slash }
  | { readonly kind: typeof FormatTokenKind.Text }
  | { readonly kind: typeof FormatTokenKind.Fill; readonly char: string }
  | { readonly kind: typeof FormatTokenKind.General }
  | {
      readonly kind: typeof FormatTokenKind.Date;
      readonly unit: DateUnit;
      readonly width: number;
      readonly code: string;
    };

export type SectionKind = (typeof SectionKind)[keyof typeof SectionKind];

export interface FormatSection {
  readonly kind: SectionKind;
  readonly tokens: readonly FormatToken[];
  readonly condition: FormatCondition | undefined;
  readonly color: number | undefined;
  readonly locale: NumberLocale | undefined;
  readonly system: typeof SectionSystem.Date | typeof SectionSystem.Time | undefined;
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

export const FormatTokenKind = {
  Literal: 'literal',
  Digit: 'digit',
  Point: 'point',
  Comma: 'comma',
  Percent: 'percent',
  Exponent: 'exponent',
  Slash: 'slash',
  Text: 'text',
  Fill: 'fill',
  General: 'general',
  Date: 'date',
} as const;

export const DateUnit = {
  Year: 'year',
  Month: 'month',
  Day: 'day',
  Hour: 'hour',
  Minute: 'minute',
  Second: 'second',
  Subsecond: 'subsecond',
  Ampm: 'ampm',
  Hours: 'hours',
  Minutes: 'minutes',
  Seconds: 'seconds',
} as const;

export const SectionKind = {
  Number: 'number',
  Date: 'date',
  Text: 'text',
  Literal: 'literal',
} as const;

export const DateOrder = { Mdy: 'mdy', Dmy: 'dmy' } as const;

export const SectionSystem = { Date: 'date', Time: 'time' } as const;

export const FormatCode = { General: 'General' } as const;

export const CommaRole = { Group: 'group', Scale: 'scale', None: 'none' } as const;

export const FormatChar = {
  Backslash: '\\',
  Semicolon: ';',
  Quote: '"',
  OpenBracket: '[',
  CloseBracket: ']',
  ExponentUpper: 'E',
  ExponentLower: 'e',
  Underscore: '_',
  Asterisk: '*',
  Plus: '+',
  Minus: '-',
  Comma: ',',
  Point: '.',
  Zero: '0',
  Question: '?',
  Space: ' ',
} as const;

export const LanguageCode = { Ru: 'ru' } as const;

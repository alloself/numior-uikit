import { CellValueKind, type CellValue } from '../cell.types';
import { parseNumberFormat } from './format-code';
import { formatDateSection } from './format-date';
import { generalNumber } from './format-digits';
import { formatNumberSection } from './format-number';
import {
  FormatTokenKind,
  SectionKind,
  SectionSystem,
  type FormatCondition,
  type FormatSection,
  type FormattedValue,
  type NumberFormat,
  type NumberLocale,
} from './format.types';
import { createOutput, pushFill, pushText, type Output } from './output';
import { BinaryOperator } from '../formula/formula.types';

interface Choice {
  readonly section: FormatSection;
  readonly negative: boolean;
}

const GENERAL = 'General';

const CHOICES = 3;

const HASHES: FormattedValue = { text: '#', color: undefined, fill: { char: '#', at: 0 } };

const passes = (condition: FormatCondition, value: number): boolean => {
  switch (condition.op) {
    case BinaryOperator.Less:
      return value < condition.value;
    case BinaryOperator.LessOrEqual:
      return value <= condition.value;
    case BinaryOperator.Greater:
      return value > condition.value;
    case BinaryOperator.GreaterOrEqual:
      return value >= condition.value;
    case BinaryOperator.Equal:
      return value === condition.value;
    case BinaryOperator.NotEqual:
      return value !== condition.value;
  }
};

const negativeOnly = (condition: FormatCondition): boolean =>
  (condition.op === BinaryOperator.Less && condition.value <= 0) ||
  (condition.op === BinaryOperator.LessOrEqual && condition.value < 0);

const explicitChoice = (sections: readonly FormatSection[], value: number): Choice | undefined => {
  for (const section of sections.slice(0, CHOICES)) {
    const { condition } = section;

    if (condition === undefined || passes(condition, value)) {
      return {
        section,
        negative: value < 0 && (condition === undefined || !negativeOnly(condition)),
      };
    }
  }
  return undefined;
};

const implicitIndex = (count: number, value: number): number => {
  if (count === 1 || value > 0 || (count === 2 && value === 0)) {
    return 0;
  }
  return value < 0 ? 1 : 2;
};

const hasCondition = (sections: readonly FormatSection[]): boolean =>
  sections.some((section, index) => index < CHOICES && section.condition !== undefined);

const numberChoice = (format: NumberFormat, value: number): Choice | undefined => {
  const { sections } = format;

  if (hasCondition(sections)) {
    return explicitChoice(sections, value);
  }

  const index = implicitIndex(Math.min(sections.length, CHOICES), value);
  const section = sections[index];

  return section === undefined ? undefined : { section, negative: index === 0 && value < 0 };
};

const textOutput = (section: FormatSection, text: string): Output => {
  const output = createOutput();

  section.tokens.forEach((token) => {
    if (token.kind === FormatTokenKind.Text) {
      pushText(output, text);
    } else if (token.kind === FormatTokenKind.Literal) {
      pushText(output, token.text);
    } else if (token.kind === FormatTokenKind.Fill) {
      pushFill(output, token.char);
    }
  });

  return output;
};

const systemSection = (section: FormatSection, locale: NumberLocale): FormatSection => {
  const code = section.system === SectionSystem.Date ? locale.longDate : locale.longTime;

  return parseNumberFormat(code).sections[0] ?? section;
};

const dateOutput = (
  section: FormatSection,
  value: number,
  locale: NumberLocale,
): Output | undefined => {
  const shown = section.system === undefined ? section : systemSection(section, locale);

  return formatDateSection(shown.tokens, value, shown.locale ?? section.locale ?? locale);
};

const sectionOutput = (choice: Choice, value: number, locale: NumberLocale): Output | undefined => {
  const { section } = choice;
  const magnitude = Math.abs(value);

  switch (section.kind) {
    case SectionKind.Number:
      return formatNumberSection(section.tokens, magnitude, locale, choice.negative);
    case SectionKind.Date:
      return dateOutput(section, value, locale);
    case SectionKind.Text:
      return textOutput(section, generalNumber(value, locale.decimal));
    case SectionKind.Literal:
      return textOutput(section, '');
    case SectionKind.Invalid:
      return undefined;
  }
};

const result = (output: Output, color: number | undefined): FormattedValue => ({
  text: output.text,
  color,
  fill: output.filler,
});

const plain = (text: string): FormattedValue => ({ text, color: undefined, fill: undefined });

const formatNumber = (
  format: NumberFormat,
  value: number,
  locale: NumberLocale,
): FormattedValue | undefined => {
  const choice = numberChoice(format, value);
  const output = choice === undefined ? undefined : sectionOutput(choice, value, locale);

  return output === undefined || choice === undefined
    ? undefined
    : result(output, choice.section.color);
};

const formatString = (format: NumberFormat, text: string): FormattedValue => {
  const section =
    format.sections[3] ?? format.sections.find((candidate) => candidate.kind === SectionKind.Text);

  return section === undefined ? plain(text) : result(textOutput(section, text), section.color);
};

const valid = (format: NumberFormat): boolean =>
  format.sections.every((section) => section.kind !== SectionKind.Invalid);

export const renderValue = (
  value: CellValue,
  code: string,
  locale: NumberLocale,
): FormattedValue | undefined => {
  const format = parseNumberFormat(code === '' ? GENERAL : code);

  switch (value.kind) {
    case CellValueKind.Number:
      return valid(format) ? formatNumber(format, value.value, locale) : undefined;
    case CellValueKind.String:
      return valid(format) ? formatString(format, value.value) : undefined;
    case CellValueKind.Boolean:
      return plain(value.value ? locale.trueText : locale.falseText);
    case CellValueKind.Error:
      return plain(locale.errors[value.code]);
    case CellValueKind.Empty:
      return plain('');
  }
};

export const formatValue = (value: CellValue, code: string, locale: NumberLocale): FormattedValue =>
  renderValue(value, code, locale) ?? HASHES;

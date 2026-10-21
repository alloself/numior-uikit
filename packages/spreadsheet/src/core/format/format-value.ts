import type { CellValue } from '../cell.types';
import { parseNumberFormat } from './format-code';
import { formatDateSection } from './format-date';
import { generalNumber } from './format-digits';
import { formatNumberSection } from './format-number';
import type {
  FormatCondition,
  FormatSection,
  FormattedValue,
  NumberFormat,
  NumberLocale,
} from './format.types';
import { createOutput, type Output } from './output';

interface Choice {
  readonly section: FormatSection;
  readonly negative: boolean;
}

const GENERAL = 'General';

const HASHES: FormattedValue = { text: '#', color: undefined, fill: { char: '#', at: 0 } };

const passes = (condition: FormatCondition, value: number): boolean => {
  switch (condition.op) {
    case '<':
      return value < condition.value;
    case '<=':
      return value <= condition.value;
    case '>':
      return value > condition.value;
    case '>=':
      return value >= condition.value;
    case '=':
      return value === condition.value;
    case '<>':
      return value !== condition.value;
  }
};

const negativeOnly = (condition: FormatCondition): boolean =>
  (condition.op === '<' && condition.value <= 0) || (condition.op === '<=' && condition.value < 0);

const explicitChoice = (sections: readonly FormatSection[], value: number): Choice | undefined => {
  for (const section of sections.slice(0, 3)) {
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

const numberChoice = (format: NumberFormat, value: number): Choice | undefined => {
  const sections = format.sections.slice(0, 3);

  if (sections.some((section) => section.condition !== undefined)) {
    return explicitChoice(sections, value);
  }

  const index = implicitIndex(sections.length, value);
  const section = sections[index];

  return section === undefined ? undefined : { section, negative: index === 0 && value < 0 };
};

const textOutput = (section: FormatSection, text: string): Output => {
  const output = createOutput();

  section.tokens.forEach((token) => {
    if (token.kind === 'text') {
      output.push(text);
    } else if (token.kind === 'literal') {
      output.push(token.text);
    } else if (token.kind === 'fill') {
      output.fill(token.char);
    }
  });

  return output;
};

const systemSection = (section: FormatSection, locale: NumberLocale): FormatSection => {
  const code = section.system === 'date' ? locale.longDate : locale.longTime;

  return parseNumberFormat(code).sections[0] ?? section;
};

const sectionOutput = (choice: Choice, value: number, locale: NumberLocale): Output | undefined => {
  const { section } = choice;
  const magnitude = Math.abs(value);

  switch (section.kind) {
    case 'number':
      return formatNumberSection(section.tokens, magnitude, locale, choice.negative);
    case 'date':
      return formatDateSection(
        section.system === undefined ? section.tokens : systemSection(section, locale).tokens,
        value,
        section.locale ?? locale,
      );
    case 'text':
      return textOutput(section, generalNumber(value, locale.decimal));
    case 'literal':
      return textOutput(section, '');
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
    format.sections[3] ?? format.sections.find((candidate) => candidate.kind === 'text');

  return section === undefined ? plain(text) : result(textOutput(section, text), section.color);
};

export const renderValue = (
  value: CellValue,
  code: string,
  locale: NumberLocale,
): FormattedValue | undefined => {
  const format = parseNumberFormat(code === '' ? GENERAL : code);

  switch (value.kind) {
    case 'number':
      return formatNumber(format, value.value, locale);
    case 'string':
      return formatString(format, value.value);
    case 'boolean':
      return plain(value.value ? locale.trueText : locale.falseText);
    case 'error':
      return plain(value.code);
    case 'empty':
      return plain('');
  }
};

export const formatValue = (value: CellValue, code: string, locale: NumberLocale): FormattedValue =>
  renderValue(value, code, locale) ?? HASHES;

import type { NumberLocale } from './format.types';
import { readDateText } from './read-date';
import { readNumberText, type ReadNumber } from './read-number';

export const readValueText = (text: string, locale: NumberLocale): ReadNumber | undefined => {
  const number = readNumberText(text, locale);

  if (number !== undefined) {
    return number;
  }

  const date = readDateText(text, locale);

  return date === undefined
    ? undefined
    : { value: (date.date ?? 0) + (date.time ?? 0), format: date.format };
};

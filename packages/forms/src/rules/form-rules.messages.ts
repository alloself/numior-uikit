import { plural, type NuiMessageCatalog } from '@numior/primitives';

export interface NuiFormRulesMessages {
  readonly required: string;
  readonly minLength: (params: { readonly min: number }) => string;
  readonly maxLength: (params: { readonly max: number }) => string;
  readonly minValue: (params: { readonly min: number }) => string;
  readonly maxValue: (params: { readonly max: number }) => string;
  readonly minItems: (params: { readonly min: number }) => string;
  readonly maxItems: (params: { readonly max: number }) => string;
  readonly email: string;
  readonly pattern: string;
  readonly invalid: string;
}

const characters = (count: number): string =>
  plural('ru', count, { one: 'символа', few: 'символов', many: 'символов', other: 'символа' });

const items = (count: number): string =>
  plural('ru', count, { one: 'элемента', few: 'элементов', many: 'элементов', other: 'элемента' });

export const formRulesMessages: NuiMessageCatalog<NuiFormRulesMessages> = {
  namespace: 'formRules',
  en: {
    required: 'Fill in this field',
    minLength: ({ min }) =>
      `Enter at least ${min} ${plural('en', min, { one: 'character', other: 'characters' })}`,
    maxLength: ({ max }) =>
      `Enter at most ${max} ${plural('en', max, { one: 'character', other: 'characters' })}`,
    minValue: ({ min }) => `Enter ${min} or more`,
    maxValue: ({ max }) => `Enter ${max} or less`,
    minItems: ({ min }) =>
      `Add at least ${min} ${plural('en', min, { one: 'item', other: 'items' })}`,
    maxItems: ({ max }) =>
      `Keep at most ${max} ${plural('en', max, { one: 'item', other: 'items' })}`,
    email: 'Enter a valid email address',
    pattern: 'Use the expected format',
    invalid: 'Check this value',
  },
  ru: {
    required: 'Заполните поле',
    minLength: ({ min }) => `Введите не меньше ${min} ${characters(min)}`,
    maxLength: ({ max }) => `Введите не больше ${max} ${characters(max)}`,
    minValue: ({ min }) => `Введите число не меньше ${min}`,
    maxValue: ({ max }) => `Введите число не больше ${max}`,
    minItems: ({ min }) => `Добавьте не меньше ${min} ${items(min)}`,
    maxItems: ({ max }) => `Оставьте не больше ${max} ${items(max)}`,
    email: 'Введите корректный адрес электронной почты',
    pattern: 'Значение не соответствует формату',
    invalid: 'Проверьте значение',
  },
};

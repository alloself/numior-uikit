import { describe, expect, it } from 'vite-plus/test';
import { formRulesMessages, min, required } from '@numior/forms';
import type { NuiTableColumn } from '../src';
import { ruleFailure } from '../src/table/table-rules';

interface Item {
  readonly name: string;
}

const context = {
  name: 'field',
  label: 'Поле',
  values: { name: 'Первый' },
  messages: formRulesMessages.ru,
};

const INVALID = formRulesMessages.ru.invalid;

const TEXT: NuiTableColumn<Item> = {
  key: 'text',
  label: 'Текст',
  type: 'text',
  value: () => null,
  rules: [required()],
};

const NUMBER: NuiTableColumn<Item> = {
  key: 'number',
  label: 'Число',
  type: 'number',
  value: () => null,
  rules: [min(10)],
};

const DATE: NuiTableColumn<Item> = {
  key: 'date',
  label: 'Дата',
  type: 'date',
  value: () => null,
  rules: [required()],
};

const FLAG: NuiTableColumn<Item> = {
  key: 'flag',
  label: 'Флаг',
  type: 'boolean',
  value: () => null,
};

describe('table rules', () => {
  it('runs column rules on values of the column type and refuses values of another type', () => {
    expect(ruleFailure(TEXT, 'Москва', context)).toBeUndefined();
    expect(ruleFailure(TEXT, null, context)).toBe('Заполните поле');
    expect(ruleFailure(TEXT, 5, context)).toBe(INVALID);
    expect(ruleFailure(NUMBER, 12, context)).toBeUndefined();
    expect(ruleFailure(NUMBER, 3, context)).toBe('Введите число не меньше 10');
    expect(ruleFailure(NUMBER, 'три', context)).toBe(INVALID);
    expect(ruleFailure(DATE, new Date(0), context)).toBeUndefined();
    expect(ruleFailure(DATE, 0, context)).toBeUndefined();
    expect(ruleFailure(DATE, true, context)).toBe(INVALID);
    expect(ruleFailure(FLAG, false, context)).toBeUndefined();
    expect(ruleFailure(FLAG, 'да', context)).toBe(INVALID);
  });
});

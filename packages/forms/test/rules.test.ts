import { describe, expect, it } from 'vite-plus/test';
import { custom, email, max, min, pattern, required, type FieldRuleContext } from '../src';
import { formRulesMessages } from '../src/rules/form-rules.messages';
import { FormHarness } from './harness/form';

const english: FieldRuleContext = {
  name: 'field',
  label: undefined,
  values: {},
  messages: formRulesMessages.en,
};

const EMPTY = [undefined, null, '', '  ', [], false];

const shortCode = (value: unknown) =>
  typeof value === 'string' && value.length > 4 ? 'Too long' : undefined;

const evenNumber = (value: unknown) => typeof value === 'number' && value % 2 === 0;

const translateRequired = (key: string): string | undefined =>
  key === 'formRules.required' ? 'Custom required' : undefined;

describe('built-in rules', () => {
  it('counts undefined, null, blank text, empty lists and false as empty for required', () => {
    expect(EMPTY.map((value) => required()(value, english))).toEqual(
      EMPTY.map(() => 'Fill in this field'),
    );

    expect(required()(0, english)).toBe(true);
    expect(required()(true, english)).toBe(true);
  });

  it('lets every other rule skip empty values', () => {
    const rules = [min(3), max(1), email(), pattern(/x/)];

    expect(rules.flatMap((rule) => EMPTY.map((value) => rule(value, english)))).not.toContain(
      expect.any(String),
    );
  });

  it('measures text by characters, numbers by value and lists by length', () => {
    expect(min(3)('👍👍', english)).toBe('Enter at least 3 characters');
    expect(min(2)('👍👍', english)).toBe(true);
    expect(max(1)('ab', english)).toBe('Enter at most 1 character');
    expect(min(18)(17, english)).toBe('Enter 18 or more');
    expect(max(10)(11, english)).toBe('Enter 10 or less');
    expect(min(2)(['a'], english)).toBe('Add at least 2 items');
    expect(max(1)(['a', 'b'], english)).toBe('Keep at most 1 item');
    expect(min(1)({ a: 1 }, english)).toBe(true);
  });

  it('checks the email and pattern of text only', () => {
    expect(email()('ann@example.com', english)).toBe(true);
    expect(email()('ann@example', english)).toBe('Enter a valid email address');
    expect(pattern(/^\d+$/g)('123', english)).toBe(true);
    expect(pattern(/^\d+$/g)('12a', english)).toBe('Use the expected format');
    expect(pattern(/^\d+$/)(42, english)).toBe(true);
  });

  it('lets a custom check answer with a message, a verdict or nothing', () => {
    expect(custom(shortCode)('abcdef', english)).toBe('Too long');
    expect(custom(shortCode)('abc', english)).toBe(true);
    expect(custom(evenNumber)(3, english)).toBe('Check this value');
    expect(custom(evenNumber)(4, english)).toBe(true);
  });

  it('prefers an explicit message over the dictionary', () => {
    expect(required({ message: 'Name please' })('', english)).toBe('Name please');
    expect(min(3, { message: 'Longer' })('a', english)).toBe('Longer');
  });
});

describe('rule messages in a form', () => {
  it('speaks the configured language and an explicit message still wins', async () => {
    const form = FormHarness.mount({
      config: { locale: 'ru-RU' },
      initialValues: { name: '', bio: 'ab', code: '' },
      fields: [
        { path: 'name', rules: [required()] },
        { path: 'bio', rules: [min(3)] },
        { path: 'code', rules: [required({ message: 'Code please' })] },
      ],
    });

    await form.submit();
    expect(form.error('name')).toBe('Заполните поле');
    expect(form.error('bio')).toBe('Введите не меньше 3 символов');
    expect(form.error('code')).toBe('Code please');
  });

  it('asks the translate hook before the dictionary', async () => {
    const form = FormHarness.mount({
      config: { translate: translateRequired },
      initialValues: { name: '' },
      fields: [{ path: 'name', rules: [required()] }],
    });

    await form.submit();
    expect(form.error('name')).toBe('Custom required');
  });
});

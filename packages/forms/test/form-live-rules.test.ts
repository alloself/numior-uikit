import { describe, expect, it } from 'vite-plus/test';
import { custom, min, required, type FieldRule } from '../src';
import { FormDriver, type FormDriverOptions } from './drivers/form';

const counter = { calls: 0 };

const counted: FieldRule = () => {
  counter.calls += 1;
  return true;
};

const shortName = (value: unknown): boolean => typeof value === 'string' && value.length < 10;

const nameField = (rules: readonly FieldRule[]): FormDriverOptions<{ name: string }> => ({
  initialValues: { name: '' },
  fields: [{ path: 'name', label: 'Name', rules }],
});

describe('live field rules', () => {
  it('rechecks a field in the same render when its rules change after an attempt', async () => {
    const form = FormDriver.mount(nameField([required()]));

    await form.submit();
    expect(form.error('name')).toBe('Fill in this field');

    await form.setRules('name', []);
    expect(form.error('name')).toBeUndefined();

    await form.setRules('name', [required({ message: 'Name please' })]);
    expect(form.error('name')).toBe('Name please');
  });

  it('keeps quiet about new rules until the first attempt', async () => {
    const form = FormDriver.mount(nameField([]));

    await form.setRules('name', [required()]);
    expect(form.error('name')).toBeUndefined();

    await form.submit();
    expect(form.error('name')).toBe('Fill in this field');
  });

  it('treats a fresh list of the same rules as unchanged', async () => {
    const form = FormDriver.mount(nameField([counted, required(), min(3), custom(shortName)]));

    await form.submit();

    const checked = counter.calls;

    await form.setRules('name', [counted, required(), min(3), custom(shortName)]);
    expect(counter.calls).toBe(checked);

    await form.setRules('name', [counted, required(), min(4), custom(shortName)]);
    expect(counter.calls).toBeGreaterThan(checked);
  });

  it('follows a new validateOn', async () => {
    const form = FormDriver.mount(nameField([min(3)]));

    await form.type('name', 'An');
    await form.leave('name');
    expect(form.error('name')).toBeUndefined();

    await form.setValidateOn('name', 'blur');
    await form.leave('name');
    expect(form.error('name')).toBe('Enter at least 3 characters');
  });
});

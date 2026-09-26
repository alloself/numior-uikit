import { describe, expect, it } from 'vitest';
import { contextOutsideForm, fieldOutsideForm, TwoFormsHarness } from './harness/context';
import { FormHarness } from './harness/form';
import { issue, probeSchema, type SchemaValues } from './harness/schema';

const addressIssues = (values: SchemaValues) =>
  values.kind === 'company' ? [] : [issue('Pick a company address', 'address')];

describe('form context', () => {
  it('keeps two forms of one component apart and lets a subtree pick a form', async () => {
    const harness = TwoFormsHarness.mount({ name: 'first' }, { name: 'second' });
    const [first, second] = harness.forms;

    expect(harness.field('explicit').value.value).toBe('first');
    expect(harness.field('injected').value.value).toBe('second');
    expect(harness.field('provided').value.value).toBe('first');

    await harness.field('explicit').setValue('changed');
    expect(first.values).toEqual({ name: 'changed' });
    expect(second.values).toEqual({ name: 'second' });
  });

  it('has no context outside a form and refuses a field there', () => {
    expect(contextOutsideForm()).toBeNull();

    expect(fieldOutsideForm()).toEqual(
      new Error('useField needs a form: call useForm in an ancestor or pass the form option'),
    );
  });

  it('lets a declared owner take container issues and leaves its value out while inactive', async () => {
    const form = FormHarness.mount({
      initialValues: { kind: 'person', address: { city: 'Paris' }, vat: 'FR1' },
      schema: probeSchema(addressIssues),
      fields: ['kind', 'address.city'],
    });

    form.form.register('address');
    form.form.register('vat', { kind: 'field', active: false });

    const result = await form.submit();

    expect(result.status).toBe('invalid');
    expect(form.form.errorBag.value).toEqual({ address: ['Pick a company address'] });

    await form.type('kind', 'company');
    expect(await form.submit()).toMatchObject({ status: 'submitted' });
    expect(form.submissions).toEqual([{ kind: 'company', address: { city: 'Paris' } }]);
  });
});

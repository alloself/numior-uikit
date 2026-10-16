import { describe, expect, expectTypeOf, it } from 'vite-plus/test';
import { contextOutsideForm, TwoFormsHarness } from './harness/context';
import { FormHarness } from './harness/form';
import { issue, probeSchema, type SchemaValues } from './harness/schema';

const addressIssues = (values: SchemaValues) =>
  values.kind === 'company' ? [] : [issue('Pick a company address', 'address')];

describe('form context', () => {
  it('keeps two forms of one component apart and lets a subtree pick a form', async () => {
    const harness = TwoFormsHarness.mount({ name: 'first' }, { name: 'second' });
    const [first, second] = harness.forms;

    expectTypeOf(harness.field.value.value).toEqualTypeOf<string>();
    expectTypeOf(harness.field.binding['onUpdate:modelValue']).parameter(0).toEqualTypeOf<string>();
    expect(harness.field.value.value).toBe('first');
    expect(harness.context('injected')).toBe(second);
    expect(harness.context('provided')).toBe(first);

    await harness.field.setValue('changed');
    expect(first.values).toEqual({ name: 'changed' });
    expect(second.values).toEqual({ name: 'second' });
  });

  it('has no context outside a form', () => {
    expect(contextOutsideForm()).toBeNull();
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

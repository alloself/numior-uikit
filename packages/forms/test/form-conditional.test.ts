import { describe, expect, expectTypeOf, it } from 'vite-plus/test';
import { NuiFormError, custom, type KeepValue } from '../src';
import { FormHarness } from './harness/form';
import { companySchema } from './harness/schemas';

const takenCompany = (): never => {
  throw new NuiFormError({ company: 'Company is taken' });
};

const companyOf = (values: unknown): unknown =>
  typeof values === 'object' && values !== null && 'company' in values ? values.company : undefined;

const differsFromCompany = custom(
  (value, { values }) => value !== companyOf(values) || 'Pick a name that differs from the company',
);

const atLeastThree = custom(
  (value) => typeof value !== 'string' || value.length >= 3 || 'Too short',
);

const MANY_FIELDS = 1000;

const HIDE_BUDGET_MS = 100;

describe('conditional fields', () => {
  it('lets rules read every value while a hidden field stays out of the submission', async () => {
    const form = FormHarness.mount({
      initialValues: { name: 'Acme', company: 'Acme' },
      fields: [{ path: 'name', rules: [differsFromCompany] }, 'company'],
    });

    await form.hide('company');
    expect((await form.submit()).status).toBe('invalid');
    expect(form.error('name')).toBe('Pick a name that differs from the company');

    await form.type('name', 'Ann');
    expect((await form.submit()).status).toBe('submitted');
    expect(form.submissions).toEqual([{ name: 'Ann' }]);
  });

  it('allows clearing on hide only for a value type that admits undefined', () => {
    expectTypeOf<KeepValue<string>>().toEqualTypeOf<true>();
    expectTypeOf<KeepValue<string | undefined>>().toEqualTypeOf<boolean>();
    expectTypeOf<KeepValue<unknown>>().toEqualTypeOf<boolean>();
  });

  it('leaves a hidden field out of validation and submission but keeps its value', async () => {
    const form = FormHarness.mount({
      initialValues: { name: 'Ann', company: '' },
      schema: companySchema(),
      fields: ['name', 'company'],
    });

    await form.type('company', 'Acme');
    await form.hide('company');

    const result = await form.submit();

    expect(result.status).toBe('submitted');
    expect(form.submissions).toEqual([{ name: 'Ann' }]);
    expect(form.values).toEqual({ name: 'Ann', company: 'Acme' });

    await form.show('company');
    expect(form.shownValue('company')).toBe('Acme');
  });

  it('sends a value that no field ever showed as is and never blocks on it', async () => {
    const form = FormHarness.mount({
      initialValues: { name: 'Ann', company: '' },
      schema: companySchema(),
      fields: ['name', 'company'],
      hidden: ['company'],
    });

    expect((await form.submit()).status).toBe('submitted');
    expect(form.submissions).toEqual([{ name: 'Ann', company: '' }]);
  });

  it('clears the value of a keepValue: false field when it is hidden or switched off', async () => {
    const form = FormHarness.mount({
      initialValues: { name: 'Ann', company: 'Acme', note: 'Call back' },
      fields: ['name', { path: 'company', keepValue: false }, { path: 'note', keepValue: false }],
    });

    await form.hide('company');
    await form.deactivate('note');
    expect(form.values).toEqual({ name: 'Ann' });

    await form.show('company');
    await form.activate('note');
    expect(form.shownValue('company')).toBe('');
    expect(form.shownValue('note')).toBe('');
  });

  it('brings back the attempted state and the message of a field shown again', async () => {
    const form = FormHarness.mount({
      initialValues: { name: 'Ann', company: '' },
      schema: companySchema(),
      fields: ['name', 'company'],
    });

    await form.submit();
    await form.hide('company');
    expect(form.form.errorBag.value).toEqual({});

    await form.show('company');
    expect(form.error('company')).toBe('Enter a company');

    await form.type('company', 'Acme');
    expect(form.error('company')).toBeUndefined();
  });

  it('shows a field that dropped its value on hide again without its old message', async () => {
    const form = FormHarness.mount({
      initialValues: { note: 'ab' },
      fields: [{ path: 'note', keepValue: false, rules: [atLeastThree] }],
    });

    await form.submit();
    expect(form.error('note')).toBe('Too short');

    await form.hide('note');
    await form.show('note');

    expect(form.shownValue('note')).toBe('');
    expect(form.error('note')).toBeUndefined();
    expect(form.touched('note')).toBe(false);
  });

  it('drops the message of a hidden field whose value changed while it was away', async () => {
    const form = FormHarness.mount({
      initialValues: { note: 'ab' },
      fields: [{ path: 'note', rules: [atLeastThree] }],
    });

    await form.submit();
    await form.hide('note');
    await form.setValues({ note: 'abcd' });
    await form.show('note');

    expect(form.shownValue('note')).toBe('abcd');
    expect(form.error('note')).toBeUndefined();
  });

  it('keeps the value of a leaving field while another owner still holds its path', async () => {
    const form = FormHarness.mount({
      initialValues: { name: 'Ann', company: 'Acme' },
      fields: ['name', { path: 'company', keepValue: false }],
    });

    const release = form.hold('company');

    await form.hide('company');

    expect(form.values).toEqual({ name: 'Ann', company: 'Acme' });

    await form.show('company');
    release();
    await form.hide('company');

    expect(form.values).toEqual({ name: 'Ann' });
  });

  it('takes a thousand fields away within the budget of one action', async () => {
    const paths = Array.from({ length: MANY_FIELDS }, (_, index) => `field${index}`);

    const form = FormHarness.mount({
      initialValues: Object.fromEntries(paths.map((path) => [path, ''])),
      fields: paths,
    });

    const started = performance.now();

    await form.hideAll(paths);

    expect(performance.now() - started).toBeLessThan(HIDE_BUDGET_MS);
    expect(form.values).toEqual(Object.fromEntries(paths.map((path) => [path, ''])));
  });

  it('sends a disabled field without validating it', async () => {
    const form = FormHarness.mount({
      initialValues: { name: 'Ann', company: '' },
      schema: companySchema(),
      fields: ['name', 'company'],
    });

    await form.disable('company');
    expect((await form.submit()).status).toBe('submitted');
    expect(form.submissions).toEqual([{ name: 'Ann', company: '' }]);
  });

  it('shows a server error for a hidden field among the form errors', async () => {
    const form = FormHarness.mount({
      initialValues: { name: 'Ann', company: 'Acme' },
      fields: ['name', 'company'],
      hidden: ['company'],
      onSubmit: takenCompany,
    });

    expect((await form.submit()).status).toBe('rejected');
    expect(form.formErrors).toEqual([{ path: 'company', message: 'Company is taken' }]);
  });
});

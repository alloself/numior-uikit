import { describe, expect, it } from 'vitest';
import { NuiFormError } from '../src';
import { FormHarness } from './harness/form';
import { companySchema } from './harness/schemas';

const takenCompany = (): never => {
  throw new NuiFormError({ company: 'Company is taken' });
};

describe('conditional fields', () => {
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

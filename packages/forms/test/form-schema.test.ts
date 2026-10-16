import { describe, expect, it } from 'vite-plus/test';
import type { FieldRule } from '../src';
import { FormHarness } from './harness/form';
import { routingSchema } from './harness/schemas';

const shortList: FieldRule = (value) =>
  (Array.isArray(value) && value.length <= 2) || 'Keep at most two tags';

const knownCity: FieldRule = (value) => value !== '' || 'Enter a city';

const noLetters: FieldRule = (value) =>
  (typeof value === 'string' && !/[a-z]/i.test(value)) || 'Letters are not allowed';

const noDigits: FieldRule = (value) =>
  (typeof value === 'string' && !/\d/.test(value)) || 'Digits are not allowed';

const values = { name: '', address: { city: '', zip: '' }, tags: ['news'], secret: 'x' };

const mountRouting = (options: { readonly async?: boolean } = {}) =>
  FormHarness.mount({
    initialValues: values,
    schema: routingSchema(options),
    fields: ['name', 'address.city', 'address.zip', 'tags'],
  });

describe('schema issue routing', () => {
  it('maps key segments to the field and drops issues on paths nobody shows', async () => {
    const form = mountRouting();
    const summary = await form.validate();

    expect(form.error('address.city')).toBe('Enter a city');
    expect(summary.ignored).toEqual(['secret']);
    expect(summary.valid).toBe(false);
  });

  it('lifts an item issue to the field that owns the list', async () => {
    const form = mountRouting();

    await form.change('tags', ['news', '']);
    await form.submit();
    expect(form.error('tags')).toBe('Tags cannot be empty');
  });

  it('puts path-less issues and issues on containers without an owner into form errors', async () => {
    const form = mountRouting();

    await form.type('name', 'reject');
    await form.type('address.city', 'Nowhere');

    const result = await form.submit();

    expect(result.status).toBe('invalid');
    expect(result.invalid).toEqual([]);

    expect(form.formErrors).toEqual([
      { path: 'address', message: 'Cities must exist' },
      { path: undefined, message: 'The form is broken' },
    ]);
  });

  it('keeps form errors hidden until the first full attempt', async () => {
    const form = mountRouting();

    await form.type('name', 'reject');
    await form.validate({ paths: ['name'] });
    expect(form.formErrors).toEqual([]);

    await form.validate();
    expect(form.formErrors).toEqual([{ path: undefined, message: 'The form is broken' }]);
  });

  it('never blocks the submit with an issue on a path nobody shows', async () => {
    const form = mountRouting();

    await form.type('address.city', 'Paris');

    const result = await form.submit();

    expect(result.status).toBe('submitted');
    expect(form.submissions).toEqual([{ ...values, address: { city: 'Paris', zip: '' } }]);
  });

  it('adds form rules by pattern and field rules after the schema without repeating messages', async () => {
    const form = FormHarness.mount({
      initialValues: values,
      schema: routingSchema(),
      rules: { tags: [shortList], 'address.zip': [noDigits] },
      fields: ['name', { path: 'address.city', rules: [knownCity] }, 'address.zip', 'tags'],
    });

    await form.change('tags', ['a', 'b', 'c']);
    await form.type('address.zip', '75001');
    await form.submit();
    expect(form.errors('address.city')).toEqual(['Enter a city']);
    expect(form.errors('tags')).toEqual(['Keep at most two tags']);
    expect(form.errors('address.zip')).toEqual(['Digits are not allowed']);
  });

  it('matches every row of a list with a star in the rule path', async () => {
    const form = FormHarness.mount({
      initialValues: { contacts: [{ phone: '1' }, { phone: 'x' }] },
      rules: { 'contacts.*.phone': [noLetters] },
      fields: ['contacts.0.phone', 'contacts.1.phone'],
    });

    expect((await form.submit()).invalid).toEqual(['contacts.1.phone']);
    expect(form.error('contacts.1.phone')).toBe('Letters are not allowed');
  });

  it('waits for an asynchronous schema before deciding', async () => {
    const form = mountRouting({ async: true });

    expect((await form.submit()).status).toBe('invalid');
    expect(form.error('address.city')).toBe('Enter a city');
  });
});

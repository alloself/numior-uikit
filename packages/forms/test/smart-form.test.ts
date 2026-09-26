import { NuiInput } from '@numior/vue';
import { describe, expect, it } from 'vitest';
import { h } from 'vue';
import { formConfig } from '../src';
import { SmartFormDriver } from './drivers/smart-form';

interface Contact {
  email: string;
  phone?: string;
}

interface Account {
  kind: string;
  name: string;
  email: string;
  company?: string;
  vat?: string;
  bio: string;
  address: { city: string; zip: string };
  contacts: Contact[];
}

const { field, section, array } = formConfig<Account>();
const contact = formConfig<Contact>();

const blank: Account = {
  kind: 'person',
  name: '',
  email: '',
  company: 'Acme',
  vat: 'FR1',
  bio: '',
  address: { city: '', zip: '' },
  contacts: [{ email: 'ann@example.com' }],
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const customEmail = (props: Record<string, unknown>) =>
  h('input', { ...(isRecord(props.field) ? props.field : {}), class: 'custom' });

const markdownHint = () => h('p', { class: 'hint' }, 'Markdown works');

const rowHint = () => h('p', { class: 'row-hint' }, 'Work address');

const actionState = (props: Record<string, unknown>) =>
  h('span', { class: 'state' }, `${String(props.pending)}/${String(props.dirty)}`);

const isCompany = (values: Account): boolean => values.kind === 'company';

const isRussian = (row: Contact): boolean => row.email.endsWith('.ru');

const COMPANY = [
  field(NuiInput, { name: 'kind', label: 'Kind' }),
  field(NuiInput, { name: 'company', label: 'Company', when: isCompany }),
  field(NuiInput, { name: 'vat', label: 'VAT', when: isCompany }),
];

describe('NuiSmartForm', () => {
  it('renders config fields with typed props, a replacing slot and an after slot', () => {
    const form = SmartFormDriver.mount({
      initialValues: blank,
      fields: [
        field(NuiInput, { name: 'name', label: 'Name', props: { placeholder: 'Ann Lee' } }),
        field(NuiInput, { name: 'email', label: 'Email' }),
        field(NuiInput, { name: 'bio', label: 'Bio' }),
      ],
      slots: { email: customEmail, 'bio:after': markdownHint },
    });

    expect(form.attribute('name', 'placeholder')).toBe('Ann Lee');
    expect(form.has('input.custom[name="email"]')).toBe(true);
    expect(form.cellText('bio')).toContain('Markdown works');
  });

  it('places cells by the layout and renders them in reading order', () => {
    const form = SmartFormDriver.mount({
      initialValues: blank,
      layout: '"email name" "bio bio"',
      fields: [
        field(NuiInput, { name: 'name', label: 'Name' }),
        field(NuiInput, { name: 'email', label: 'Email' }),
        field(NuiInput, { name: 'bio', label: 'Bio' }),
      ],
    });

    expect(form.topCells).toEqual(['email', 'name', 'bio']);
    expect(form.areas).toBe('"email name" "bio bio"');
    expect(form.columns).toBe('2');
    expect(form.area('bio')).toBe('bio');
  });

  it('leaves cells without a place in the layout to automatic placement', () => {
    const plain = SmartFormDriver.mount({
      initialValues: blank,
      fields: [
        field(NuiInput, { name: 'name', label: 'Name' }),
        field(NuiInput, { name: 'bio', label: 'Bio' }),
      ],
    });

    const partial = SmartFormDriver.mount({
      initialValues: blank,
      layout: '"email name"',
      fields: [
        field(NuiInput, { name: 'name', label: 'Name' }),
        field(NuiInput, { name: 'email', label: 'Email' }),
        field(NuiInput, { name: 'bio', label: 'Bio' }),
      ],
    });

    expect([plain.area('name'), plain.area('bio')]).toEqual(['auto', 'auto']);

    expect([partial.area('email'), partial.area('name'), partial.area('bio')]).toEqual([
      'email',
      'name',
      'auto',
    ]);
  });

  it('drops a layout row whose fields are hidden and brings it back in one tick', async () => {
    const form = SmartFormDriver.mount({
      initialValues: blank,
      layout: '"kind kind" "company vat"',
      fields: COMPANY,
    });

    expect(form.areas).toBe('"kind kind"');
    expect(form.fields).toEqual(['kind']);

    await form.type('kind', 'company');
    expect(form.areas).toBe('"kind kind" "company vat"');
    expect(form.fields).toEqual(['kind', 'company', 'vat']);
  });

  it('leaves hidden fields out of the submission, even the ones never shown', async () => {
    const form = SmartFormDriver.mount({ initialValues: blank, fields: COMPANY });

    await form.submit();
    expect(form.submissions[0]).not.toHaveProperty('company');
    expect(form.submissions[0]).not.toHaveProperty('vat');
    expect(form.form.values).toMatchObject({ company: 'Acme', vat: 'FR1' });
  });

  it('renders sections as fieldsets with a legend, a description and their own layout', () => {
    const form = SmartFormDriver.mount({
      initialValues: blank,
      fields: [
        section({
          title: 'Address',
          description: 'Where we ship',
          layout: '"zip city"',
          fields: [
            field(NuiInput, { name: 'address.city', label: 'City', area: 'city' }),
            field(NuiInput, { name: 'address.zip', label: 'ZIP', area: 'zip' }),
          ],
        }),
      ],
    });

    expect(form.legends).toEqual(['Address']);
    expect(form.sectionDescriptions).toEqual(['Where we ship']);
    expect(form.fields).toEqual(['address.zip', 'address.city']);
    expect(form.topCells).toEqual(['section:Address']);
  });

  it('renders a config array with row fields, row conditions and row slots', async () => {
    const form = SmartFormDriver.mount({
      initialValues: blank,
      fields: [
        array({
          name: 'contacts',
          label: 'Contacts',
          newRow: () => ({ email: '' }),
          fields: [
            contact.field(NuiInput, { name: 'email', label: 'Email' }),
            contact.field(NuiInput, { name: 'phone', label: 'Phone', when: isRussian }),
          ],
        }),
      ],
      slots: { 'contacts.email:after': rowHint },
    });

    expect(form.fields).toEqual(['contacts.0.email']);
    expect(form.cellText('contacts.0.email')).toContain('Work address');

    await form.type('contacts.0.email', 'ann@example.ru');
    await form.click('.nui-field-array__add');
    expect(form.fields).toEqual(['contacts.0.email', 'contacts.0.phone', 'contacts.1.email']);
  });

  it('marks inline and growing forms', () => {
    const form = SmartFormDriver.mount({
      initialValues: blank,
      inline: 'grow',
      fields: [field(NuiInput, { name: 'name', label: 'Name' })],
    });

    expect([form.hasModifier('inline'), form.hasModifier('grow')]).toEqual([true, true]);
  });

  it('hands pending and dirty to a custom actions slot', async () => {
    const form = SmartFormDriver.mount({
      initialValues: blank,
      fields: [field(NuiInput, { name: 'name', label: 'Name' })],
      slots: { actions: actionState },
    });

    expect(form.text('.state')).toBe('false/false');

    await form.type('name', 'Ann');
    expect(form.text('.state')).toBe('false/true');
  });
});

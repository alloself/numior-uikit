import { NuiInput, NuiList, NuiRadioGroup } from '@numior/vue';
import { describe, expect, expectTypeOf, it } from 'vite-plus/test';
import { custom, formConfig, required, type ControlProps, type ControlValue } from '../src';
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

interface Preferences {
  topics: string[];
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

const isCompany = (values: Account): boolean => values.kind === 'company';

const isRussian = (row: Contact): boolean => row.email.endsWith('.ru');

const COMPANY = [
  field(NuiInput, (values) => values.kind, { label: 'Kind' }),
  field(NuiInput, (values) => values.company, { label: 'Company', when: isCompany }),
  field(NuiInput, (values) => values.vat, { label: 'VAT', when: isCompany }),
];

const preferences = formConfig<Preferences>();

const TOPICS = [
  { value: 'vue', label: 'Vue' },
  { value: 'nuxt', label: 'Nuxt' },
  { value: 'vite', label: 'Vite' },
];

describe('NuiSmartForm', () => {
  it('binds a control through a named model: a multiple list shows the initial picks and writes new ones back', async () => {
    const smart = SmartFormDriver.mount<Preferences>({
      initialValues: { topics: ['vue'] },
      fields: [
        preferences.field(NuiList, (values) => values.topics, {
          model: 'values',
          label: 'Topics',
          props: { selectable: 'multiple', items: TOPICS, label: 'Topics' },
        }),
      ],
    });

    expect(smart.selectedOptions).toEqual(['Vue']);

    await smart.pickOption('Vite');

    expect(smart.selectedOptions).toEqual(['Vue', 'Vite']);
    expect(smart.form.values.topics).toEqual(['vue', 'vite']);
  });

  it('reserves the error line of every field when asked, and an error takes that line', async () => {
    const smart = SmartFormDriver.mount<Account>({
      initialValues: blank,
      reserveError: true,
      fields: [
        field(NuiInput, (values) => values.name, { label: 'Name', rules: [required()] }),
        field(NuiInput, (values) => values.email, { label: 'Email' }),
      ],
    });

    expect(smart.reservedLines).toBe(2);

    await smart.submit();

    expect(smart.error('name')).toBe('Fill in this field');
    expect(smart.reservedLines).toBe(1);
  });

  it('types a named model by its own prop', () => {
    expectTypeOf<ControlValue<typeof NuiInput>>().toEqualTypeOf<string | undefined>();
    expectTypeOf<ControlValue<typeof NuiList, 'values'>>().toEqualTypeOf<unknown[] | undefined>();
    expectTypeOf<ControlProps<typeof NuiList, 'values'>>().toHaveProperty('selectable');
  });

  it('renders config fields with typed props, slot content inside the control and an after slot', () => {
    const form = SmartFormDriver.mount({
      initialValues: blank,
      fields: [
        field(NuiInput, (values) => values.name, {
          label: 'Name',
          props: { placeholder: 'Ann Lee' },
        }),
        field(NuiRadioGroup, (values) => values.kind, { label: 'Kind', group: true }),
        field(NuiInput, (values) => values.bio, { label: 'Bio' }),
      ],
      parts: ['kind-options', 'bio-hint'],
    });

    expect(form.attribute('name', 'placeholder')).toBe('Ann Lee');
    expect(form.has('[role="radiogroup"] input[type="radio"][value="company"]')).toBe(true);
    expect(form.cellText('bio')).toContain('Markdown works');
  });

  it('places cells by the layout and renders them in reading order', () => {
    const form = SmartFormDriver.mount({
      initialValues: blank,
      layout: '"email name" "bio bio"',
      fields: [
        field(NuiInput, (values) => values.name, { label: 'Name' }),
        field(NuiInput, (values) => values.email, { label: 'Email' }),
        field(NuiInput, (values) => values.bio, { label: 'Bio' }),
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
        field(NuiInput, (values) => values.name, { label: 'Name' }),
        field(NuiInput, (values) => values.bio, { label: 'Bio' }),
      ],
    });

    const partial = SmartFormDriver.mount({
      initialValues: blank,
      layout: '"email name"',
      fields: [
        field(NuiInput, (values) => values.name, { label: 'Name' }),
        field(NuiInput, (values) => values.email, { label: 'Email' }),
        field(NuiInput, (values) => values.bio, { label: 'Bio' }),
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
            field(NuiInput, (values) => values.address.city, { label: 'City', area: 'city' }),
            field(NuiInput, (values) => values.address.zip, { label: 'ZIP', area: 'zip' }),
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
        array((values) => values.contacts, {
          label: 'Contacts',
          newRow: () => ({ email: '' }),
          fields: [
            contact.field(NuiInput, (row) => row.email, { label: 'Email' }),
            contact.field(NuiInput, (row) => row.phone, { label: 'Phone', when: isRussian }),
          ],
        }),
      ],
      parts: ['row-hint'],
    });

    expect(form.fields).toEqual(['contacts.0.email']);
    expect(form.cellText('contacts.0.email')).toContain('Work address');

    await form.type('contacts.0.email', 'ann@example.ru');
    await form.click('.nui-field-array__add');
    expect(form.fields).toEqual(['contacts.0.email', 'contacts.0.phone', 'contacts.1.email']);
  });

  it('keeps the messages of the rows that follow a removed row', async () => {
    const form = SmartFormDriver.mount({
      initialValues: {
        ...blank,
        contacts: [{ email: 'ann@example.com' }, { email: '' }, { email: '' }],
      },
      fields: [
        array((values) => values.contacts, {
          label: 'Contacts',
          newRow: () => ({ email: '' }),
          fields: [
            contact.field(NuiInput, (row) => row.email, {
              label: 'Email',
              rules: [required({ message: 'Enter an email' })],
            }),
          ],
        }),
      ],
    });

    await form.submit();
    await form.click('.nui-field-array__remove > button');

    expect(form.fields).toEqual(['contacts.0.email', 'contacts.1.email']);

    expect([form.error('contacts.0.email'), form.error('contacts.1.email')]).toEqual([
      'Enter an email',
      'Enter an email',
    ]);
  });

  it('types config rules by the field value and gives row rules their row as values', async () => {
    const form = SmartFormDriver.mount({
      initialValues: { ...blank, name: 'A' },
      fields: [
        field(NuiInput, (values) => values.name, {
          label: 'Name',
          rules: [
            custom((value, { values }) => {
              expectTypeOf(value).toEqualTypeOf<string>();
              expectTypeOf(values).toEqualTypeOf<Account>();
              return value.length > 1 || 'Too short';
            }),
          ],
        }),
        array((values) => values.contacts, {
          label: 'Contacts',
          newRow: () => ({ email: '' }),
          fields: [
            contact.field(NuiInput, (row) => row.email, { label: 'Email' }),
            contact.field(NuiInput, (row) => row.phone, {
              label: 'Phone',
              rules: [
                custom((value, { values }) => {
                  expectTypeOf(value).toEqualTypeOf<string | undefined>();
                  expectTypeOf(values).toEqualTypeOf<Contact>();
                  return (
                    values.email === '' || (value !== undefined && value !== '') || 'Phone please'
                  );
                }),
              ],
            }),
          ],
        }),
      ],
    });

    await form.submit();
    expect(form.error('name')).toBe('Too short');
    expect(form.error('contacts.0.phone')).toBe('Phone please');
  });

  it.each([
    ['fit', [true, false]],
    ['grow', [true, true]],
  ] as const)('marks a form put in one row with %s', (inline, modifiers) => {
    const form = SmartFormDriver.mount({
      initialValues: blank,
      inline,
      fields: [field(NuiInput, (values) => values.name, { label: 'Name' })],
    });

    expect([form.hasModifier('inline'), form.hasModifier('grow')]).toEqual(modifiers);
  });

  it('hands pending and dirty to a custom actions slot', async () => {
    const form = SmartFormDriver.mount({
      initialValues: blank,
      fields: [field(NuiInput, (values) => values.name, { label: 'Name' })],
      parts: ['action-state'],
    });

    expect(form.text('.state')).toBe('false/false');

    await form.type('name', 'Ann');
    expect(form.text('.state')).toBe('false/true');
  });

  it('puts every field into read mode and disables saving when readonly', () => {
    const smart = SmartFormDriver.mount({ initialValues: blank, fields: COMPANY, readonly: true });

    expect(smart.attribute('kind', 'readonly')).toBe('');
    expect(smart.attribute('kind', 'disabled')).toBeUndefined();
    expect(smart.submitDisabled).toBe(true);
  });
});

import { kitControls } from '@numior/vue/controls';
import { describe, expect, it } from 'vite-plus/test';
import { parseFormConfig, type FormJsonEntry } from '../src';
import { SmartFormDriver } from './drivers/smart-form';

interface Signup {
  kind: string;
  name: string;
  company: string;
  seats: number | null;
  contacts: { email: string }[];
}

const blank: Signup = { kind: 'person', name: '', company: '', seats: null, contacts: [] };

const CONFIG: readonly FormJsonEntry[] = [
  {
    kind: 'section',
    title: 'Account',
    layout: '"kind kind" "name company"',
    fields: [
      {
        kind: 'field',
        type: 'radio',
        name: 'kind',
        label: 'Kind',
        group: true,
        props: {
          options: [
            { value: 'person', label: 'Person' },
            { value: 'company', label: 'Company' },
          ],
        },
      },
      {
        kind: 'field',
        type: 'text',
        name: 'name',
        label: 'Name',
        required: true,
        rules: [{ rule: 'required' }, { rule: 'min', limit: 2, message: 'Too short' }],
      },
      {
        kind: 'field',
        type: 'text',
        name: 'company',
        label: 'Company',
        when: { path: 'kind', equals: 'company' },
      },
      { kind: 'field', type: 'number', name: 'seats', label: 'Seats', props: { min: 1 } },
    ],
  },
  {
    kind: 'array',
    name: 'contacts',
    label: 'Contacts',
    newRow: { email: '' },
    fields: [
      { kind: 'field', type: 'text', name: 'email', label: 'Email', props: { type: 'email' } },
    ],
  },
];

describe('parseFormConfig', () => {
  it('builds smart form entries from JSON with kit controls, conditions and rules', async () => {
    const parsed = parseFormConfig<Signup>(CONFIG, { controls: kitControls });

    if (parsed.kind !== 'ok') {
      throw new Error(JSON.stringify(parsed.issues));
    }
    const smart = SmartFormDriver.mount({ initialValues: blank, fields: parsed.fields });

    expect(smart.fields).toEqual(expect.arrayContaining(['name', 'seats']));
    expect(smart.fields).not.toContain('company');
    expect(smart.legends).toEqual(['Account']);
    expect(smart.has('.nui-field-array')).toBe(true);
    await smart.click('input[value="company"]');
    expect(smart.fields).toContain('company');
    await smart.type('name', 'A');
    await smart.submit();
    expect(smart.error('name')).toBe('Too short');
  });

  it('reports unknown control types, rejected props and malformed entries with their paths', () => {
    const rejected = parseFormConfig<Signup>(
      [
        { kind: 'field', type: 'rating', name: 'seats' },
        { kind: 'field', type: 'text', name: 'name', props: { bogus: true } },
        { kind: 'section', title: 'Contacts', fields: [{ kind: 'field', type: 'text' }] },
      ],
      { controls: kitControls },
    );

    expect(rejected).toEqual({
      kind: 'error',
      issues: [{ path: 'fields.2', code: 'invalid-entry' }],
    });

    const typed = parseFormConfig<Signup>(
      [
        { kind: 'field', type: 'rating', name: 'seats' },
        { kind: 'field', type: 'text', name: 'name', props: { bogus: true } },
      ],
      { controls: kitControls },
    );

    expect(typed).toEqual({
      kind: 'error',
      issues: [
        { path: 'fields.0.type', code: 'unknown-type', type: 'rating' },
        { path: 'fields.1.props', code: 'rejected-props', type: 'text' },
      ],
    });

    expect(parseFormConfig<Signup>({ kind: 'field' }, { controls: kitControls })).toEqual({
      kind: 'error',
      issues: [{ path: 'fields', code: 'not-a-list' }],
    });
  });
});

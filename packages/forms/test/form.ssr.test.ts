// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSSRApp, defineComponent, h } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { NuiInput } from '@numior/vue';
import {
  NuiFieldArray,
  NuiForm,
  NuiFormField,
  useField,
  useFieldArray,
  useForm,
  type FieldArrayRow,
} from '../src';

const noop = (): void => undefined;

const input = (path: string) =>
  defineComponent({
    setup: () => {
      const field = useField<string>(path);
      return () => h('input', { name: field.path.value, value: field.value.value });
    },
  });

const Profile = defineComponent({
  setup: () => {
    useForm({
      initialValues: { email: 'ann@example.com', address: { city: 'Paris' } },
      onSubmit: noop,
    });

    return () => h('form', [h(input('email')), h(input('address.city'))]);
  },
});

const Contacts = defineComponent({
  setup: () => {
    useForm({ initialValues: { contacts: [{ name: 'Ann' }, { name: 'Bob' }] }, onSubmit: noop });
    return () => h(ContactList);
  },
});

const ContactList = defineComponent({
  setup: () => {
    const list = useFieldArray<{ name: string }>('contacts');
    return () =>
      h(
        'ol',
        list.fields.value.map((row) => h('li', { key: row.key }, row.value.name)),
      );
  },
});

const Signup = defineComponent({
  setup: () => {
    const form = useForm({ initialValues: { email: 'ann@example.com' }, onSubmit: noop });

    return () =>
      h(NuiForm, { form }, () =>
        h(
          NuiFormField,
          { name: 'email', label: 'Email' },
          { default: (scope: { field: object }) => h(NuiInput, { ...scope.field }) },
        ),
      );
  },
});

const newContact = () => ({ name: '' });

const contactField = ({ row }: { readonly row: FieldArrayRow<{ name: string }> }) =>
  h(
    NuiFormField,
    { name: `${row.path}.name`, label: 'Name' },
    { default: (scope: { field: object }) => h(NuiInput, { ...scope.field }) },
  );

const Team = defineComponent({
  setup: () => {
    const form = useForm({
      initialValues: { contacts: [{ name: 'Ann' }, { name: 'Bob' }] },
      onSubmit: noop,
    });

    return () =>
      h(NuiForm, { form }, () =>
        h(
          NuiFieldArray<{ name: string }>,
          { name: 'contacts', label: 'Contacts', newRow: newContact, reorderable: true },
          { default: contactField },
        ),
      );
  },
});

const labelTarget = (html: string): string | undefined =>
  /<label[^>]* for="([^"]+)"/.exec(html)?.[1];

describe('forms on the server', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders field values the same way twice and schedules no timers', async () => {
    vi.useFakeTimers();

    const first = await renderToString(createSSRApp(Profile));
    const second = await renderToString(createSSRApp(Profile));

    expect(first).toBe(second);

    expect(first).toBe(
      '<form><input name="email" value="ann@example.com"><input name="address.city" value="Paris"></form>',
    );

    expect(vi.getTimerCount()).toBe(0);
  });

  it('renders a form with labelled fields and values and no pending or error state', async () => {
    const first = await renderToString(createSSRApp(Signup));
    const second = await renderToString(createSSRApp(Signup));
    const target = labelTarget(first);

    expect(first).toBe(second);
    expect(first).toContain('novalidate');
    expect(first).toContain('value="ann@example.com"');
    expect(target).toBeTruthy();
    expect(first).toContain(`id="${target}"`);
    expect(first).not.toContain('aria-busy');
    expect(first).not.toContain('nui-form__errors');
    expect(first).not.toContain('undefined');
  });

  it('renders field array rows with their controls the same way twice', async () => {
    const first = await renderToString(createSSRApp(Team));

    expect(first).toBe(await renderToString(createSSRApp(Team)));
    expect(first).toContain('value="Ann"');
    expect(first).toContain('value="Bob"');
    expect(first).toContain('aria-label="Remove row 2"');
    expect(first).not.toContain('undefined');
    expect(first).not.toContain('nui-field-array__ghost');
  });

  it('renders the rows of a field array', async () => {
    expect(await renderToString(createSSRApp(Contacts))).toBe('<ol><li>Ann</li><li>Bob</li></ol>');
  });
});

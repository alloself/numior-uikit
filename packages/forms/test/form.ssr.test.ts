// @vitest-environment node
import { NuiInput } from '@numior/vue';
import { renderToString } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { formConfig } from '../src';
import ContactNames from './fixtures/ContactNames.vue';
import ContactsArrayForm from './fixtures/ContactsArrayForm.vue';
import ProfileFields from './fixtures/ProfileFields.vue';
import SignupForm from './fixtures/SignupForm.vue';
import SmartFormScene from './fixtures/SmartFormScene.vue';

interface Signup {
  kind: string;
  name: string;
  email: string;
  company: string;
}

const noop = (): void => undefined;

const signup = formConfig<Signup>();

const isCompany = (values: Signup): boolean => values.kind === 'company';

const SIGNUP_FIELDS = [
  signup.field(NuiInput, (values) => values.name, { label: 'Name' }),
  signup.field(NuiInput, (values) => values.email, { label: 'Email' }),
  signup.field(NuiInput, (values) => values.company, { label: 'Company', when: isCompany }),
];

const renderSmart = () =>
  renderToString(SmartFormScene<Signup>, {
    props: {
      options: {
        initialValues: { kind: 'person', name: 'Ann', email: 'ann@example.com', company: 'Acme' },
        onSubmit: noop,
      },
      layout: '"email name" "company company"',
      fields: SIGNUP_FIELDS,
    },
  });

const WIZARD_STEPS = [
  {
    value: 'who',
    label: 'Who',
    fields: [signup.field(NuiInput, (values) => values.name, { label: 'Name' })],
  },
  {
    value: 'reach',
    label: 'Reach',
    fields: [signup.field(NuiInput, (values) => values.email, { label: 'Email' })],
  },
];

const renderWizard = () =>
  renderToString(SmartFormScene<Signup>, {
    props: {
      options: {
        initialValues: { kind: 'person', name: 'Ann', email: 'ann@example.com', company: '' },
        onSubmit: noop,
      },
      steps: WIZARD_STEPS,
    },
  });

const renderTeam = () =>
  renderToString(ContactsArrayForm, { props: { names: ['Ann', 'Bob'], reorderable: true } });

const labelTarget = (html: string): string | undefined =>
  /<label[^>]* for="([^"]+)"/.exec(html)?.[1];

describe('forms on the server', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders field values the same way twice and schedules no timers', async () => {
    vi.useFakeTimers();

    const first = await renderToString(ProfileFields);
    const second = await renderToString(ProfileFields);

    expect(first).toBe(second);

    expect(first).toBe(
      '<form><input name="email" value="ann@example.com"><input name="address.city" value="Paris"></form>',
    );

    expect(vi.getTimerCount()).toBe(0);
  });

  it('renders a form with labelled fields and values and no pending or error state', async () => {
    const first = await renderToString(SignupForm);
    const second = await renderToString(SignupForm);
    const target = labelTarget(first);

    expect(first).toBe(second);
    expect(first).toContain('novalidate');
    expect(first).toContain('value="ann@example.com"');
    expect(target).toBeTruthy();
    expect(first).toContain(`id="${target}"`);
    expect(first).not.toContain('aria-busy');
    expect(first).not.toContain('nui-form__errors');
    expect(first).not.toContain('undefined');

    const readonly = await renderToString(SignupForm, { props: { readonly: true } });
    expect(readonly).toContain('nui-form--readonly');
    expect(readonly).toContain(' readonly');
    expect(readonly).toMatch(/type="submit"[^>]*disabled/);
  });

  it('renders field array rows with their controls the same way twice', async () => {
    const first = await renderTeam();

    expect(first).toBe(await renderTeam());
    expect(first).toContain('value="Ann"');
    expect(first).toContain('value="Bob"');
    expect(first).toContain('aria-label="Remove row 2"');
    expect(first).not.toContain('undefined');
    expect(first).not.toContain('nui-field-array__ghost');
  });

  it('renders a smart form in layout order with areas and without hidden fields', async () => {
    const first = await renderSmart();

    expect(first).toBe(await renderSmart());
    expect(first).toContain('--_areas:&quot;email name&quot;');
    expect(first).toContain('--_area:email');
    expect(first.indexOf('value="ann@example.com"')).toBeLessThan(first.indexOf('value="Ann"'));
    expect(first).not.toContain('Acme');
    expect(first).not.toContain('undefined');
  });

  it('renders every step panel of a wizard and hides all but the current one', async () => {
    const html = await renderWizard();

    expect(html).toBe(await renderWizard());
    expect(html).toContain('aria-current="step"');
    expect(html).toContain('value="Ann"');
    expect(html).toContain('value="ann@example.com"');
    expect(html.match(/<div(?=[^>]*nui-smart-form__step)(?=[^>]*\shidden)[^>]*>/g)).toHaveLength(1);
    expect(html).toContain('Step 1 of 2: Who');
  });

  it('renders the rows of a field array', async () => {
    expect(await renderToString(ContactNames)).toBe(
      '<ol><!--[--><li>Ann</li><li>Bob</li><!--]--></ol>',
    );
  });
});

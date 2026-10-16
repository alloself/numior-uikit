import { NuiCheckbox, NuiInput } from '@numior/vue';
import { describe, expect, it } from 'vite-plus/test';
import { h } from 'vue';
import { NuiFormError, formConfig, required } from '../src';
import { SmartFormDriver } from './drivers/smart-form';

interface Signup {
  email: string;
  password: string;
  name: string;
  terms: boolean;
}

const { field } = formConfig<Signup>();

const blank: Signup = { email: '', password: '', name: '', terms: false };

const STEPS = [
  {
    value: 'account',
    label: 'Account',
    fields: [
      field(NuiInput, (values) => values.email, { label: 'Email', rules: [required()] }),
      field(NuiInput, (values) => values.password, { label: 'Password', rules: [required()] }),
    ],
  },
  {
    value: 'profile',
    label: 'Profile',
    fields: [field(NuiInput, (values) => values.name, { label: 'Name', rules: [required()] })],
  },
  {
    value: 'confirm',
    label: 'Confirm',
    fields: [field(NuiCheckbox, (values) => values.terms, { label: 'I accept the terms' })],
  },
];

const emailTaken = (): never => {
  throw new NuiFormError({ email: 'This email is taken' });
};

const stepState = (props: Record<string, unknown>) =>
  h(
    'span',
    { class: 'state' },
    `${String(props.step)}:${String(props.first)}:${String(props.last)}`,
  );

const mountWizard = (options: { readonly step?: string } = {}) =>
  SmartFormDriver.mount({ initialValues: blank, steps: STEPS, onSubmit: emailTaken, ...options });

const fillAccount = async (form: SmartFormDriver<Signup>): Promise<void> => {
  await form.type('email', 'ann@example.com');
  await form.type('password', 'secret');
};

describe('NuiSmartForm steps', () => {
  it('checks only the current step on Next and moves focus into the next step', async () => {
    const form = mountWizard();

    await fillAccount(form);
    await form.submit();
    expect(form.currentStep).toBe('Profile');
    expect(form.focused).toBe('name');
    expect(form.live).toBe('Step 2 of 3: Profile');
    expect(form.error('name')).toBeUndefined();
    expect(form.stepStatuses).toEqual(['complete', 'upcoming', 'upcoming']);
  });

  it('stays on a step that fails and focuses its first invalid field', async () => {
    const form = mountWizard();

    await form.type('password', 'secret');
    await form.requestSubmit();
    expect(form.currentStep).toBe('Account');
    expect(form.error('email')).toBe('Fill in this field');
    expect(form.focused).toBe('email');
    expect(form.stepStatuses[0]).toBe('error');
  });

  it('goes back without checking, also through a click on a previous step', async () => {
    const form = mountWizard();

    await fillAccount(form);
    await form.submit();
    await form.back();
    expect(form.currentStep).toBe('Account');
    expect(form.focused).toBe('email');

    await form.submit();
    await form.pickStep(0);
    expect(form.currentStep).toBe('Account');
    expect(form.stepStatuses).toEqual(['upcoming', 'upcoming', 'upcoming']);
  });

  it('jumps to the step of the first error after the final submit', async () => {
    const form = mountWizard();

    await fillAccount(form);
    await form.submit();
    await form.type('name', 'Ann');
    await form.submit();
    expect(form.actions).toEqual(['Back', 'Submit']);

    await form.submit();
    expect(form.currentStep).toBe('Account');
    expect(form.error('email')).toBe('This email is taken');
    expect(form.focused).toBe('email');
    expect(form.stepStatuses[0]).toBe('error');
  });

  it('follows an outside step and returns to the first step on reset', async () => {
    const form = mountWizard({ step: 'profile' });

    expect(form.currentStep).toBe('Profile');
    expect(form.actions).toEqual(['Back', 'Next']);

    await form.reset();
    expect(form.currentStep).toBe('Account');
    expect(form.actions).toEqual(['Next']);
  });

  it('hands the step state to a custom actions slot', () => {
    const form = SmartFormDriver.mount({
      initialValues: blank,
      steps: STEPS,
      step: 'confirm',
      slots: { actions: stepState },
    });

    expect(form.text('.state')).toBe('confirm:false:true');
  });
});

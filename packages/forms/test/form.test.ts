import { describe, expect, it } from 'vitest';
import { NuiFormError, required, type FieldRule } from '../src';
import { FormDriver, type FormFieldConfig } from './drivers/form';
import { SubmitGate } from './harness/gate';
import { LoginCheck } from './harness/login';

const acceptTerms: FieldRule = (value) => value === true || 'Accept the terms';

const validEmail: FieldRule = (value) =>
  (typeof value === 'string' && value.includes('@')) || 'Enter an email';

const FIELDS: readonly FormFieldConfig[] = [
  { path: 'email', label: 'Email', rules: [validEmail] },
  { path: 'plan', label: 'Plan', control: 'select' },
  { path: 'terms', label: 'I accept the terms', control: 'checkbox', rules: [acceptTerms] },
];

const blank = { email: '', plan: 'free', terms: false };

const rejectWith = (failure: Error) => () => Promise.reject(failure);

describe('NuiForm and NuiFormField', () => {
  it('submits valid values once and turns them into the new baseline', async () => {
    const form = FormDriver.mount({ initialValues: { ...blank, terms: true }, fields: FIELDS });

    await form.type('email', 'ann@example.com');
    await form.submit();
    expect(form.submissions).toEqual([{ email: 'ann@example.com', plan: 'free', terms: true }]);
    expect(form.form.meta.value).toMatchObject({ submitted: true, dirty: false });
  });

  it('stays quiet until the first submit, then marks fields and focuses the first invalid one', async () => {
    const form = FormDriver.mount({ initialValues: blank, fields: FIELDS });

    await form.type('email', 'ann');
    await form.leave('email');
    expect(form.error('email')).toBeUndefined();

    await form.submit();
    expect(form.error('email')).toBe('Enter an email');
    expect(form.error('terms')).toBe('Accept the terms');
    expect(form.invalid('email')).toBe(true);
    expect(form.describes('email', 'Enter an email')).toBe(true);
    expect(form.focused).toBe('email');
  });

  it('clears an error while the user types after an attempt', async () => {
    const form = FormDriver.mount({ initialValues: blank, fields: FIELDS });

    await form.submit();
    await form.type('email', 'ann@example.com');
    expect(form.error('email')).toBeUndefined();
    expect(form.invalid('email')).toBe(false);
  });

  it('checks a blur field when focus leaves it and shows the check as pending', async () => {
    const check = new LoginCheck(['ann'], 5);

    const form = FormDriver.mount({
      initialValues: { login: '' },
      fields: [
        { path: 'login', label: 'Login', validateOn: 'blur', rules: [required(), check.rule] },
      ],
    });

    await form.type('login', 'ann');
    await form.leaveNow('login');
    expect(form.pending('login')).toBe(true);

    await form.settle();
    expect(form.pending('login')).toBe(false);
    expect(form.error('login')).toBe('This login is taken');
  });

  it('puts server errors on their fields and the rest into an announced alert', async () => {
    const form = FormDriver.mount({
      initialValues: { ...blank, terms: true },
      fields: FIELDS,
      onSubmit: rejectWith(
        new NuiFormError({ email: 'Taken', 'profile.vat': 'Check the VAT number' }, 'Try later'),
      ),
    });

    await form.type('email', 'ann@example.com');
    await form.submit();
    expect(form.error('email')).toBe('Taken');
    expect(form.alert.attributes('role')).toBe('alert');
    expect(form.alertItems).toEqual(['Check the VAT number', 'Try later']);
    expect(form.focused).toBe('email');
  });

  it('focuses the alert when only form errors come back and renders it anew on every attempt', async () => {
    const form = FormDriver.mount({
      initialValues: { ...blank, email: 'ann@example.com', terms: true },
      fields: FIELDS,
      onSubmit: rejectWith(new NuiFormError({}, 'Try later')),
    });

    await form.submit();

    const first = form.alertElement;

    expect(form.focused).toBe('form-errors');
    expect(form.alertItems).toEqual(['Try later']);

    await form.submit();
    expect(form.alertElement).not.toBe(first);
    expect(form.focused).toBe('form-errors');
  });

  it('shows pending, ignores a second submit and keeps fields editable', async () => {
    const gate = new SubmitGate();

    const form = FormDriver.mount({
      initialValues: { ...blank, email: 'ann@example.com', terms: true },
      fields: FIELDS,
      onSubmit: gate.handler,
    });

    await form.pressSubmit();
    expect([form.busy, form.submitLoading]).toEqual([true, true]);

    await form.pressSubmit();
    await gate.entered();
    await form.edit('email', 'bob@example.com');
    gate.open();
    await form.settle();
    expect(gate.calls).toEqual([{ email: 'ann@example.com', plan: 'free', terms: true }]);
    expect([form.busy, form.submitLoading]).toEqual([false, false]);
    expect(form.shownValue('email')).toBe('bob@example.com');
  });

  it('resets values, errors and the alert through a native reset', async () => {
    const form = FormDriver.mount({
      initialValues: blank,
      fields: FIELDS,
      onSubmit: rejectWith(new NuiFormError({}, 'Try later')),
    });

    await form.type('email', 'ann');
    await form.submit();
    await form.reset();
    expect(form.values).toEqual(blank);
    expect(form.error('email')).toBeUndefined();
    expect(form.alertElement).toBeUndefined();
  });

  it('disables every control and the submit button of a disabled form', () => {
    const form = FormDriver.mount({ initialValues: blank, fields: FIELDS, disabled: true });

    expect([form.disabled('email'), form.disabled('terms'), form.submitDisabled]).toEqual([
      true,
      true,
      true,
    ]);
  });

  it('marks a field touched when focus leaves it, not when it moves inside it', async () => {
    const form = FormDriver.mount({ initialValues: blank, fields: FIELDS });

    await form.moveWithin('plan', '.nui-select__listbox');
    expect(form.touched('plan')).toBe(false);

    await form.leave('email', 'plan');
    expect(form.touched('email')).toBe(true);
  });

  it('leaves a field removed with v-if out of the submission and brings its value back', async () => {
    const form = FormDriver.mount({ initialValues: { ...blank, terms: true }, fields: FIELDS });

    await form.type('email', 'ann@example.com');
    await form.hide('plan');
    await form.submit();
    expect(form.submissions).toEqual([{ email: 'ann@example.com', terms: true }]);

    await form.show('plan');
    expect(form.values).toMatchObject({ plan: 'free' });
  });

  it('speaks the configured language and a prop still wins', async () => {
    const russian = FormDriver.mount({
      initialValues: { ...blank, terms: true },
      fields: FIELDS,
      config: { locale: 'ru-RU' },
      onSubmit: rejectWith(new NuiFormError({}, 'Сервер недоступен')),
    });

    expect(russian.submitText).toBe('Отправить');

    await russian.type('email', 'ann@example.com');
    await russian.submit();
    expect(russian.alertTitle).toBe('Не удалось отправить форму');

    const labelled = FormDriver.mount({
      initialValues: blank,
      fields: FIELDS,
      config: { locale: 'ru-RU' },
      submitLabel: 'Создать аккаунт',
    });

    expect(labelled.submitText).toBe('Создать аккаунт');
  });
});

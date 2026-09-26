import { describe, expect, it } from 'vitest';
import { FormHarness } from './harness/form';
import { wizardSchema } from './harness/schemas';

const blank = { account: { email: '', password: '' }, profile: { name: '' } };

const mountWizard = () =>
  FormHarness.mount({
    initialValues: blank,
    schema: wizardSchema(),
    fields: ['account.email', 'account.password', 'profile.name'],
  });

describe('steps', () => {
  it('attempts only the fields of the current step on Next', async () => {
    const form = mountWizard();
    const summary = await form.validate({ paths: ['account'] });

    expect(summary.valid).toBe(false);

    expect(summary.errors).toEqual({
      'account.email': ['Enter an email'],
      'account.password': ['Use at least 8 characters'],
    });

    expect(form.error('account.email')).toBe('Enter an email');
    expect(form.error('profile.name')).toBeUndefined();
    expect(form.form.hasErrors('account')).toBe(true);
    expect(form.form.hasErrors('profile')).toBe(false);
  });

  it('keeps later steps quiet while the attempted step revalidates on change', async () => {
    const form = mountWizard();

    await form.validate({ paths: ['account'] });
    await form.type('profile.name', '');
    await form.type('account.email', 'ann@example.com');
    expect(form.error('profile.name')).toBeUndefined();
    expect(form.error('account.email')).toBeUndefined();
    expect(form.error('account.password')).toBe('Use at least 8 characters');
  });

  it('passes Next once the step is valid, whatever the later steps hold', async () => {
    const form = mountWizard();

    await form.type('account.email', 'ann@example.com');
    await form.type('account.password', 'long enough');
    expect((await form.validate({ paths: ['account'] })).valid).toBe(true);
    expect(form.form.firstInvalidPath()).toBeUndefined();
  });

  it('attempts every step on the final submit and lists problems in page order', async () => {
    const form = mountWizard();

    await form.type('account.email', 'ann@example.com');

    const result = await form.submit();

    expect(result.invalid).toEqual(['account.password', 'profile.name']);
    expect(form.form.firstInvalidPath('profile')).toBe('profile.name');
    expect(form.error('profile.name')).toBe('Enter a name');
  });

  it('answers a silent check without showing anything', async () => {
    const form = mountWizard();
    const summary = await form.validate({ paths: ['profile'], silent: true });

    expect(summary.errors).toEqual({ 'profile.name': ['Enter a name'] });
    expect(form.error('profile.name')).toBeUndefined();
    expect(form.form.hasErrors()).toBe(false);
  });
});

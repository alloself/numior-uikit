import { describe, expect, it } from 'vite-plus/test';
import { FormHarness } from './harness/form';
import { signupSchema } from './harness/schemas';

interface Account {
  email: string;
  password: string;
  nickname?: string;
}

const blank: Account = { email: '', password: '' };

const annie: Account = { email: 'ann@example.com', password: '', nickname: 'annie' };

describe('reset', () => {
  it('returns to the initial values and forgets touched fields, errors and attempts', async () => {
    const form = FormHarness.mount({
      initialValues: blank,
      schema: signupSchema(),
      fields: ['email', 'password'],
    });

    await form.type('email', 'ann');
    await form.blur('email');
    await form.submit();
    await form.reset();
    expect(form.values).toEqual(blank);
    expect(form.touched('email')).toBe(false);
    expect(form.error('email')).toBeUndefined();
    expect(form.meta).toMatchObject({ submitCount: 0, dirty: false, touched: false, valid: true });
  });

  it('makes new values the baseline and drops keys the new document does not have', async () => {
    const form = FormHarness.mount({
      initialValues: annie,
      fields: ['email', 'password'],
    });

    await form.reset({ values: { email: 'bob@example.com', password: 'secret123' } });
    expect(form.values).toEqual({ email: 'bob@example.com', password: 'secret123' });
    expect(form.shownValue('email')).toBe('bob@example.com');
    expect(form.meta.dirty).toBe(false);
  });

  it('keeps shown errors when asked to', async () => {
    const form = FormHarness.mount({
      initialValues: blank,
      schema: signupSchema(),
      fields: ['email', 'password'],
    });

    await form.submit();
    await form.reset({ keepErrors: true });
    expect(form.error('email')).toBe('Enter an email');

    await form.type('email', 'ann@example.com');
    expect(form.error('email')).toBeUndefined();
  });

  it('ignores a check that finishes after the reset', async () => {
    const form = FormHarness.mount({
      initialValues: blank,
      schema: signupSchema({ async: true }),
      fields: ['email', 'password'],
    });

    await form.submit();

    const typing = form.field('email').setValue('ann');

    await form.reset();
    await typing;
    await form.settle();
    expect(form.error('email')).toBeUndefined();
    expect(form.error('password')).toBeUndefined();
  });
});

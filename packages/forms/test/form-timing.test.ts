import { describe, expect, it } from 'vitest';
import { FormHarness } from './harness/form';
import { signupSchema } from './harness/schemas';

const blank = { email: '', password: '' };

describe('validation timing', () => {
  it('stays quiet while the user types and leaves fields until the first submit attempt', async () => {
    const form = FormHarness.mount({
      initialValues: blank,
      schema: signupSchema(),
      fields: ['email', 'password'],
    });

    await form.type('email', 'ann');
    await form.blur('email');
    expect(form.error('email')).toBeUndefined();
    expect(form.touched('email')).toBe(true);

    const result = await form.submit();

    expect(result.status).toBe('invalid');
    expect(result.invalid).toEqual(['email', 'password']);
    expect(form.error('email')).toBe('Enter an email');
    expect(form.error('password')).toBe('Use at least 8 characters');
    expect(form.submissions).toEqual([]);
  });

  it('revalidates on every change after an attempt, in both directions', async () => {
    const form = FormHarness.mount({
      initialValues: blank,
      schema: signupSchema(),
      fields: ['email', 'password'],
    });

    await form.submit();
    await form.type('email', 'ann@example.com');
    expect(form.error('email')).toBeUndefined();
    expect(form.error('password')).toBe('Use at least 8 characters');

    await form.type('email', 'ann');
    expect(form.error('email')).toBe('Enter an email');
  });

  it('checks a blur field when it is left and keeps checking it on every change', async () => {
    const form = FormHarness.mount({
      initialValues: blank,
      schema: signupSchema(),
      fields: [{ path: 'email', validateOn: 'blur' }, 'password'],
    });

    await form.type('email', 'ann');
    expect(form.error('email')).toBeUndefined();

    await form.blur('email');
    expect(form.error('email')).toBe('Enter an email');
    expect(form.error('password')).toBeUndefined();

    await form.type('email', 'ann@example.com');
    expect(form.error('email')).toBeUndefined();
  });

  it('checks a change field on every change from the start', async () => {
    const form = FormHarness.mount({
      initialValues: blank,
      schema: signupSchema(),
      fields: ['email', { path: 'password', validateOn: 'change' }],
    });

    await form.type('password', 'short');
    expect(form.error('password')).toBe('Use at least 8 characters');
    expect(form.error('email')).toBeUndefined();
  });

  it('takes the form-wide timing unless a field sets its own', async () => {
    const form = FormHarness.mount({
      initialValues: blank,
      schema: signupSchema(),
      validateOn: 'blur',
      fields: ['email', { path: 'password', validateOn: 'submit' }],
    });

    await form.blur('email');
    await form.blur('password');
    expect(form.error('email')).toBe('Enter an email');
    expect(form.error('password')).toBeUndefined();
  });

  it('marks a field pending while its asynchronous check runs', async () => {
    const form = FormHarness.mount({
      initialValues: blank,
      schema: signupSchema({ async: true }),
      fields: ['email', { path: 'password', validateOn: 'change' }],
    });

    const typing = form.field('password').setValue('short');

    expect(form.pending('password')).toBe(true);
    expect(form.pending('email')).toBe(false);

    await typing;
    await form.settle();
    expect(form.pending('password')).toBe(false);
    expect(form.error('password')).toBe('Use at least 8 characters');
  });

  it('goes quiet again after a reset', async () => {
    const form = FormHarness.mount({
      initialValues: blank,
      schema: signupSchema(),
      fields: ['email', 'password'],
    });

    await form.submit();
    await form.reset();
    expect(form.error('email')).toBeUndefined();
    expect(form.meta.submitCount).toBe(0);

    await form.type('email', 'ann');
    expect(form.error('email')).toBeUndefined();
  });
});

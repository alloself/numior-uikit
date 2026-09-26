import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { required } from '../src';
import { FormHarness, type FieldSpec } from './harness/form';
import { LoginCheck } from './harness/login';

const mountLogin = (
  check: LoginCheck,
  field: Partial<FieldSpec> = {},
): FormHarness<{ login: string }> =>
  FormHarness.mount({
    initialValues: { login: '' },
    fields: [{ path: 'login', rules: [required(), check.rule], ...field }],
  });

describe('asynchronous checks', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('leaves the network alone while the form is quiet', async () => {
    const check = new LoginCheck(['ann']);
    const form = mountLogin(check);

    await form.type('login', 'ann');
    await form.wait(1000);
    expect(check.calls).toEqual([]);
  });

  it('waits for the check at submit without debouncing and blocks on its message', async () => {
    const check = new LoginCheck(['ann']);
    const form = mountLogin(check);

    await form.type('login', 'ann');

    const submitting = form.startSubmit();

    await form.wait(100);
    expect((await submitting).status).toBe('invalid');
    expect(form.error('login')).toBe('This login is taken');
    expect(check.calls).toEqual(['ann']);
  });

  it('debounces checks after an attempt and aborts a check that lost the race', async () => {
    const check = new LoginCheck(['ann']);
    const form = mountLogin(check);

    await form.type('login', 'bob');

    const submitting = form.startSubmit();

    await form.wait(100);
    await submitting;
    await form.type('login', 'bo');
    await form.wait(299);
    await form.type('login', 'ann');
    await form.wait(299);
    expect(check.calls).toEqual(['bob']);

    await form.wait(1);
    expect(check.calls).toEqual(['bob', 'ann']);

    await form.type('login', 'bob');
    await form.wait(300);
    expect(check.signals[1]?.aborted).toBe(true);

    await form.wait(100);
    await form.settle();
    expect(form.error('login')).toBeUndefined();
  });

  it('marks the field pending until the check answers', async () => {
    const check = new LoginCheck(['ann']);
    const form = mountLogin(check, { validateOn: 'change' });

    await form.type('login', 'ann');
    expect(form.pending('login')).toBe(true);

    await form.wait(400);
    await form.settle();
    expect(form.pending('login')).toBe(false);
    expect(form.error('login')).toBe('This login is taken');
  });

  it('throws away a check that answers after a reset', async () => {
    const check = new LoginCheck(['ann']);
    const form = mountLogin(check, { validateOn: 'change' });

    await form.type('login', 'ann');
    await form.wait(300);
    await form.reset();
    await form.wait(100);
    await form.settle();
    expect(form.error('login')).toBeUndefined();
    expect(form.pending('login')).toBe(false);
  });

  it('skips the network while the field fails its own rules', async () => {
    const check = new LoginCheck(['ann']);
    const form = mountLogin(check);

    expect((await form.submit()).status).toBe('invalid');
    expect(form.error('login')).toBe('Fill in this field');
    expect(check.calls).toEqual([]);
  });

  it('reuses the answer for a value it has already checked', async () => {
    const check = new LoginCheck(['ann']);
    const form = mountLogin(check);

    await form.type('login', 'ann');

    const first = form.startSubmit();

    await form.wait(100);
    await first;
    expect((await form.submit()).status).toBe('invalid');
    expect(check.calls).toEqual(['ann']);
  });

  it('checks right away when a blur field is left', async () => {
    const check = new LoginCheck(['ann']);
    const form = mountLogin(check, { validateOn: 'blur' });

    await form.type('login', 'ann');
    expect(check.calls).toEqual([]);

    await form.blur('login');
    await form.wait(100);
    await form.settle();
    expect(form.error('login')).toBe('This login is taken');
  });
});

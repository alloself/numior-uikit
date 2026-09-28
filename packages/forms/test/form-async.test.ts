import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { customAsync, required } from '../src';
import { CodeCheck } from './harness/code-check';
import { DocumentCheck } from './harness/document';
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

const PASSPORTS: ReadonlyMap<string, readonly string[]> = new Map([
  ['fr', ['A123']],
  ['de', ['B456']],
]);

const mountDocument = (
  check: DocumentCheck,
  document: Partial<FieldSpec> = {},
): FormHarness<{ country: string; document: string }> =>
  FormHarness.mount({
    initialValues: { country: 'fr', document: '' },
    fields: ['country', { path: 'document', rules: [check.rule], ...document }],
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

  it('asks again at submit when a value the check read has changed since its answer', async () => {
    const check = new DocumentCheck(PASSPORTS);
    const form = mountDocument(check, { validateOn: 'blur' });

    await form.type('document', 'A123');
    await form.blur('document');
    await form.wait(100);
    await form.settle();
    expect(form.error('document')).toBeUndefined();

    await form.type('country', 'de');

    const submitting = form.startSubmit();

    await form.wait(100);
    expect((await submitting).status).toBe('invalid');
    expect(form.error('document')).toBe('Unknown document for this country');
    expect(check.calls).toEqual(['fr:A123', 'de:A123']);
  });

  it('rechecks an attempted field when a value its check read changes, and reuses that answer', async () => {
    const check = new DocumentCheck(PASSPORTS);
    const form = mountDocument(check);

    await form.type('document', 'A123');

    const first = form.startSubmit();

    await form.wait(100);
    expect((await first).status).toBe('submitted');

    await form.type('country', 'de');
    await form.wait(300);
    expect(check.calls).toEqual(['fr:A123', 'de:A123']);

    await form.wait(100);
    await form.settle();
    expect(form.error('document')).toBe('Unknown document for this country');
    expect((await form.submit()).status).toBe('invalid');
    expect(check.calls).toEqual(['fr:A123', 'de:A123']);
  });

  it('checks a value that changed while its submit check ran before delivering it', async () => {
    const check = new CodeCheck();

    const form = FormHarness.mount({
      initialValues: { code: 'good' },
      fields: [{ path: 'code', rules: [check.rule] }],
    });

    const submitting = form.startSubmit();

    await check.entered();
    await form.change('code', 'bad');
    check.open();
    expect((await submitting).status).toBe('invalid');
    expect(form.submissions).toEqual([]);
    expect(form.error('code')).toBe('Unknown code');
    expect(check.calls).toEqual(['good', 'bad']);
  });

  it('runs an asynchronous rule on a list-valued field', async () => {
    const seen: unknown[] = [];

    const form = FormHarness.mount({
      initialValues: { tags: ['a'] },
      fields: [
        {
          path: 'tags',
          rules: [
            customAsync(async (value) => {
              seen.push(value);
              return undefined;
            }),
          ],
        },
      ],
    });

    expect((await form.validate()).valid).toBe(true);
    expect((await form.submit()).status).toBe('submitted');
    expect(form.submissions).toEqual([{ tags: ['a'] }]);
    expect(seen).toEqual([['a']]);
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

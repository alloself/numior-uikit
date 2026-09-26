import { describe, expect, it } from 'vitest';
import { NuiFormError, type FieldFlush, type SubmitHelpers } from '../src';
import { Deferred } from './harness/deferred';
import { FormHarness } from './harness/form';
import { transformSchema, type SchemaValues } from './harness/schema';
import { signupSchema } from './harness/schemas';

type Values = { email: string; password: string };

const filled: Values = { email: 'ann@example.com', password: 'long enough' };

const waitFor = (gate: Deferred, entered?: Deferred) => () => {
  entered?.resolve();
  return gate.promise;
};

const rejectWith = (failure: Error) => () => Promise.reject(failure);

const keepHelpers =
  (sink: SubmitHelpers<Values, unknown>[], gate?: Deferred, entered?: Deferred) =>
  (_values: Values, helpers: SubmitHelpers<Values, unknown>) => {
    sink.push(helpers);
    entered?.resolve();
    return gate?.promise;
  };

const commitNow =
  (value: string): FieldFlush =>
  (commit) => {
    commit(value);
  };

const commitLater =
  (value: string, gate: Deferred, outcome: boolean[]): FieldFlush =>
  async (commit) => {
    await gate.promise;
    outcome.push(commit(value));
  };

const trimmed = (values: SchemaValues) => ({ email: String(values.email).trim() });

describe('submit', () => {
  it('ignores a second submit while the first is pending and keeps fields editable', async () => {
    const gate = new Deferred();

    const form = FormHarness.mount({
      initialValues: filled,
      fields: ['email', 'password'],
      onSubmit: waitFor(gate),
    });

    const first = form.startSubmit();

    expect((await form.submit()).status).toBe('ignored');
    expect(form.meta.pending).toBe(true);

    await form.type('email', 'bob@example.com');
    gate.resolve();
    expect((await first).status).toBe('submitted');
    expect(form.submissions).toEqual([filled]);
    expect(form.meta.pending).toBe(false);
  });

  it('turns the submitted snapshot into the new baseline and keeps edits made meanwhile dirty', async () => {
    const gate = new Deferred();
    const entered = new Deferred();

    const form = FormHarness.mount({
      initialValues: filled,
      fields: ['email', 'password'],
      onSubmit: waitFor(gate, entered),
    });

    await form.type('password', 'even longer');

    const pending = form.startSubmit();

    await entered.promise;
    await form.type('email', 'bob@example.com');
    gate.resolve();
    await pending;
    await form.settle();
    expect(form.meta.submitted).toBe(true);
    expect(form.dirty('password')).toBe(false);
    expect(form.dirty('email')).toBe(true);
    expect(form.meta.dirty).toBe(true);
  });

  it('shows rejected fields in page order and the rest among form errors', async () => {
    const form = FormHarness.mount({
      initialValues: filled,
      fields: ['email', 'password'],
      onSubmit: rejectWith(
        new NuiFormError({ password: 'Too weak', email: ['Taken'], '': 'Nope' }, 'Try again'),
      ),
    });

    const result = await form.submit();

    expect(result.status).toBe('rejected');
    expect(result.invalid).toEqual(['email', 'password']);
    expect(form.error('email')).toBe('Taken');

    expect(result.formErrors).toEqual([
      { path: undefined, message: 'Nope' },
      { path: undefined, message: 'Try again' },
    ]);
  });

  it('keeps a server error while its value stays the same', async () => {
    const form = FormHarness.mount({
      initialValues: filled,
      schema: signupSchema(),
      fields: ['email', 'password'],
      onSubmit: rejectWith(new NuiFormError({ email: 'Taken' })),
    });

    await form.submit();
    await form.type('password', 'another long one');
    expect(form.error('email')).toBe('Taken');

    await form.type('email', 'bob@example.com');
    expect(form.error('email')).toBeUndefined();
  });

  it('rethrows other errors and lets the user try again', async () => {
    const form = FormHarness.mount({
      initialValues: filled,
      fields: ['email', 'password'],
      onSubmit: rejectWith(new Error('Network down')),
    });

    await expect(form.submit()).rejects.toThrow('Network down');
    expect(form.meta.pending).toBe(false);
    await expect(form.submit()).rejects.toThrow('Network down');
    expect(form.meta.submitCount).toBe(2);
  });

  it('counts every attempt and remembers whether the last one went through', async () => {
    const form = FormHarness.mount({
      initialValues: { email: '', password: '' },
      schema: signupSchema(),
      fields: ['email', 'password'],
    });

    await form.submit();
    expect(form.meta).toMatchObject({ submitCount: 1, submitted: false, valid: false });

    await form.type('email', filled.email);
    await form.type('password', filled.password);
    await form.submit();
    expect(form.meta).toMatchObject({ submitCount: 2, submitted: true, valid: true });
  });

  it('waits for flush hooks and submits the flushed value', async () => {
    const form = FormHarness.mount({
      initialValues: { ...filled, bio: '' },
      fields: ['email', 'password', { path: 'bio', flush: commitNow('<p>Hi</p>') }],
    });

    await form.submit();
    expect(form.submissions).toEqual([{ ...filled, bio: '<p>Hi</p>' }]);
  });

  it('drops a flush that finishes after a reset and aborts that submit', async () => {
    const gate = new Deferred();
    const outcome: boolean[] = [];

    const form = FormHarness.mount({
      initialValues: { ...filled, bio: '' },
      fields: ['email', 'password', { path: 'bio', flush: commitLater('stale', gate, outcome) }],
    });

    const pending = form.startSubmit();

    await form.reset({ values: { ...filled, bio: 'fresh' } });
    gate.resolve();
    expect((await pending).status).toBe('aborted');
    expect(outcome).toEqual([false]);
    expect(form.values).toEqual({ ...filled, bio: 'fresh' });
    expect(form.submissions).toEqual([]);
  });

  it('refuses a guarded commit after an external write to the same field', async () => {
    const form = FormHarness.mount({ initialValues: { ...filled, bio: '' }, fields: ['bio'] });
    const commit = form.field('bio').guard();

    await form.form.setFieldValue('bio', 'external');
    expect(commit('stale')).toBe(false);
    expect(form.values).toMatchObject({ bio: 'external' });
  });

  it('passes the schema output only when nothing failed', async () => {
    const helpers: SubmitHelpers<Values, unknown>[] = [];

    const form = FormHarness.mount({
      initialValues: { ...filled, email: ' ann@example.com ' },
      schema: transformSchema(() => [], trimmed),
      fields: ['email', 'password'],
      onSubmit: keepHelpers(helpers),
    });

    await form.submit();
    expect(helpers[0]?.output).toEqual({ email: 'ann@example.com' });
    expect(form.submissions).toEqual([{ ...filled, email: ' ann@example.com ' }]);
  });

  it('aborts the signal of a pending submit on reset', async () => {
    const gate = new Deferred();
    const entered = new Deferred();
    const helpers: SubmitHelpers<Values, unknown>[] = [];

    const form = FormHarness.mount({
      initialValues: filled,
      fields: ['email', 'password'],
      onSubmit: keepHelpers(helpers, gate, entered),
    });

    const pending = form.startSubmit();

    await entered.promise;
    await form.reset();
    gate.resolve();
    expect(helpers[0]?.signal.aborted).toBe(true);
    expect((await pending).status).toBe('aborted');
    expect(form.meta.pending).toBe(false);
  });

  it('moves focus to a field by its path', async () => {
    const form = FormHarness.mount({ initialValues: filled, fields: ['email', 'password'] });

    expect(form.form.focusField('password')).toBe(true);
    expect(form.focusedPath).toBe('password');
    expect(form.form.focusField('missing')).toBe(false);
    form.unmount();
  });
});

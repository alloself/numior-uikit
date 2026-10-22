import { describe, expect, it } from 'vite-plus/test';
import { z } from 'zod';
import type { SubmitHelpers, SubmittedValues } from '../src';
import { FormHarness } from './harness/form';

interface Signup {
  email: string;
  age: string;
  tags: string[];
}

type SignupOutput = z.output<typeof signup>;

const signup = z.object({
  email: z.email('Enter an email'),
  age: z.coerce.number().min(18, 'Adults only'),
  tags: z.array(z.string().min(1, 'Tags cannot be empty')),
});

const blank: Signup = { email: '', age: '', tags: [] };

const collectOutput =
  (sink: (SignupOutput | undefined)[]) =>
  (_values: SubmittedValues<Signup>, helpers: SubmitHelpers<Signup, SignupOutput>) => {
    sink.push(helpers.output);
  };

describe('zod through Standard Schema', () => {
  it('routes zod issues to the fields that own their paths', async () => {
    const form = FormHarness.mount({
      initialValues: blank,
      schema: signup,
      fields: ['email', 'age', 'tags'],
    });

    await form.type('email', 'ann');
    await form.type('age', '12');
    await form.change('tags', ['', 'news']);

    const result = await form.submit();

    expect(result.invalid).toEqual(['email', 'age', 'tags']);
    expect(form.error('email')).toBe('Enter an email');
    expect(form.error('age')).toBe('Adults only');
    expect(form.error('tags')).toBe('Tags cannot be empty');
  });

  it('submits what the user typed and hands over the parsed output', async () => {
    const outputs: (SignupOutput | undefined)[] = [];

    const form = FormHarness.mount({
      initialValues: blank,
      schema: signup,
      fields: ['email', 'age', 'tags'],
      onSubmit: collectOutput(outputs),
    });

    await form.type('email', 'ann@example.com');
    await form.type('age', '21');
    expect((await form.submit()).status).toBe('submitted');
    expect(form.submissions).toEqual([{ email: 'ann@example.com', age: '21', tags: [] }]);
    expect(outputs).toEqual([{ email: 'ann@example.com', age: 21, tags: [] }]);
  });
});

import tsParser from '@typescript-eslint/parser';
import { RuleTester } from 'eslint';
import { afterAll, describe, it } from 'vite-plus/test';
import { testPhases } from './test-phases.mjs';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const tester = new RuleTester({ languageOptions: { parser: tsParser } });

const error = { messageId: 'phase' };

tester.run('test-phases', testPhases, {
  valid: [
    `test('a', async () => {
  await open();
  await expect(a).toBeVisible();

  await press();
  expect(b).toBe(1);
});`,
    `it('a', () => {
  act();
  expect(a).toBe(1);
  return;
});`,
    `describe('group', () => {
  const value = 1;
  act(value);
  expect(value).toBe(1);
  act(value);
});`,
    `test.describe('group', () => {
  expect(1).toBe(1);
  act();
});`,
    `helper(() => {
  expect(1).toBe(1);
  act();
});`,
    `test('a', () => {
  expect(1).toBe(1);
  throw new Error('x');
});`,
  ],
  invalid: [
    {
      code: `test('a', async () => {
  await expect(a).toBeVisible();
  await press();
});`,
      output: `test('a', async () => {
  await expect(a).toBeVisible();

  await press();
});`,
      errors: [error],
    },
    {
      code: `it.each([1])('a %s', (value) => {
  act(value);
  if (value) {
    act();
  }
  expectRgb(value);
});`,
      output: `it.each([1])('a %s', (value) => {
  act(value);

  if (value) {
    act();
  }

  expectRgb(value);
});`,
      errors: [error, error],
    },
    {
      code: `test.beforeEach(async () => {
  for (const item of items) {
    expect(item).toBe(1);
    act(item);
  }
  while (more()) {
    act();
  }
  do {
    act();
  } while (more());
});`,
      output: `test.beforeEach(async () => {
  for (const item of items) {
    expect(item).toBe(1);

    act(item);
  }

  while (more()) {
    act();
  }

  do {
    act();
  } while (more());
});`,
      errors: [error, error, error],
    },
    {
      code: `test('a', function () {
  if (a) {
    act();
  } else if (b) {
    expect(b).toBe(1);
    act();
  } else {
    act();
  }
  try {
    expect(a).toBe(1);
    act();
  } catch {
    expect(a).toBe(2);
    act();
  } finally {
    expect(a).toBe(3);
    act();
  }
  {
    act();
  }
  switch (a) {
    default:
  }
  for (let index = 0; index < 1; index += 1) {}
  for (const key in a) {}
});`,
      output: `test('a', function () {
  if (a) {
    act();
  } else if (b) {
    expect(b).toBe(1);

    act();
  } else {
    act();
  }

  try {
    expect(a).toBe(1);

    act();
  } catch {
    expect(a).toBe(2);

    act();
  } finally {
    expect(a).toBe(3);

    act();
  }

  {
    act();
  }

  switch (a) {
    default:
  }

  for (let index = 0; index < 1; index += 1) {}

  for (const key in a) {}
});`,
      errors: [error, error, error, error, error, error, error, error, error],
    },
  ],
});

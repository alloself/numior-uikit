import tsParser from '@typescript-eslint/parser';
import { RuleTester } from 'eslint';
import { afterAll, describe, it } from 'vite-plus/test';
import { budgetTags } from './budget-tags.mjs';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const tester = new RuleTester({ languageOptions: { parser: tsParser } });

const error = { messageId: 'untagged' };

tester.run('budget-tags', budgetTags, {
  valid: [
    `const BUDGET_MS = 100;

it('sorts within the budget', { tags: ['budget'] }, () => {
  expect(spent).toBeLessThan(BUDGET_MS);
});`,
    `describe('sorting', { tags: 'budget' }, () => {
  it('sorts within the budget', () => {
    expect(performance.now() - started).toBeLessThan(100);
  });
});`,
    `it('finishes in one call', () => {
  expect(job.work(performance.now() + 5)).toBe(true);
});`,
    `const settle = (job) => {
  while (!job.work(performance.now() - 1)) {
    continue;
  }
};

it('sorts', () => {
  settle(job);
  expect(order).toEqual([1, 2]);
});`,
  ],
  invalid: [
    {
      code: `const BUDGET_MS = 100;

it('sorts within the budget', () => {
  expect(spent).toBeLessThan(BUDGET_MS);
  expect(other).toBeLessThan(BUDGET_MS);
});`,
      errors: [error],
    },
    {
      code: `it('moves a block within the latency budget', () => {
  expect(performance.now() - started).toBeLessThan(100);
});`,
      errors: [error],
    },
    {
      code: `it('compares a document within the budget of a keystroke', { timeout: 30_000 }, () => {
  const spent = laps.map(() => {
    const started = performance.now();

    compare();
    return performance.now() - started;
  });

  expect(Math.min(...spent)).toBeLessThan(16);
});`,
      errors: [error],
    },
    {
      code: `it('counts only the time it computed', () => {
  expect(run.busyMs).toBeLessThanOrEqual(performance.now() - started);
});`,
      errors: [error],
    },
    {
      code: `describe('budgets', () => {
  it('reads a screen', () => {
    expect(screen()).toBeLessThan(limits.LOOKS_BUDGET_MS);
  });
});`,
      errors: [error],
    },
  ],
});

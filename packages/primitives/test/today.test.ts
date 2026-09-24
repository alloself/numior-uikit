import { describe, expect, it } from 'vitest';
import { createNuiConfig, localToday, provideToday, useToday } from '../src';
import { captureSetup, providing } from './harness/capture';

describe('today provider', () => {
  it('falls back to the local calendar date in ISO form', () => {
    const today = captureSetup(() => useToday()).value;
    expect(today()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(today()).toBe(localToday());
  });

  it('takes an injected date from the plugin or a provider', () => {
    const fromPlugin = captureSetup(() => useToday(), {
      plugins: [createNuiConfig({ today: () => '2026-09-24' })],
    }).value;
    expect(fromPlugin()).toBe('2026-09-24');
    const fromProvider = captureSetup(() => useToday(), {
      wrap: providing(() => provideToday(() => '2000-01-01')),
    }).value;
    expect(fromProvider()).toBe('2000-01-01');
  });
});

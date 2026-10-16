import { describe, expect, it } from 'vite-plus/test';
import { NuiFormError } from '../src';

describe('NuiFormError', () => {
  it('carries field messages and an optional form message for a rejected submission', () => {
    const rejected = new NuiFormError(
      { email: 'Taken', 'items.0.name': ['Too short'] },
      'Try later',
    );

    expect(rejected).toBeInstanceOf(Error);
    expect(rejected.name).toBe('NuiFormError');
    expect(rejected.message).toBe('Try later');
    expect(rejected.errors).toEqual({ email: 'Taken', 'items.0.name': ['Too short'] });
    expect(new NuiFormError({}).message).toBe('');
  });
});

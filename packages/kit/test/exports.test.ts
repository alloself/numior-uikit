import { describe, expect, it } from 'vitest';
import { composableNames } from '../src/nuxt/exports';

const functional = (): null => null;

functional.props = ['field'];

class Failure extends Error {}

const namespace = {
  NuiButton: { setup: (): null => null },
  NuiTable: { render: (): null => null },
  NuiFieldFrame: functional,
  NuiFormError: Failure,
  NuiSize: 'md',
  useToast: (): null => null,
  useForm: (): null => null,
  usefulness: (): null => null,
  required: (): null => null,
  createNuiConfig: (): null => null,
};

describe('exports', () => {
  it('lists use-prefixed functions as composables and leaves components and helpers out', () => {
    expect(composableNames(namespace)).toEqual(['useForm', 'useToast']);
  });
});

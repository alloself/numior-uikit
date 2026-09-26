import { NuiInput } from '@numior/vue';
import { describe, expect, it } from 'vitest';
import { formConfig } from '../src';
import { areaOf, orderEntries, parseLayout, planLayout } from '../src/components/smart-form/layout';

interface Profile {
  name: string;
  email: string;
  bio: string;
  address: { city: string };
}

const { field } = formConfig<Profile>();

const ENTRIES = [
  field(NuiInput, { name: 'bio' }),
  field(NuiInput, { name: 'email' }),
  field(NuiInput, { name: 'address.city' }),
  field(NuiInput, { name: 'name' }),
];

const names = (entries: readonly { readonly name?: string | undefined }[]) =>
  entries.map((entry) => entry.name);

describe('smart form layout', () => {
  it('reads quoted rows into cells', () => {
    expect(parseLayout('"name email" "bio  bio"')).toEqual([
      ['name', 'email'],
      ['bio', 'bio'],
    ]);
  });

  it('drops rows of hidden fields, blanks hidden cells and pads short rows', () => {
    const plan = planLayout('"name email" "vat vat" "bio"', new Set(['name', 'bio']));

    expect(plan).toEqual({ areas: '"name ." "bio ."', columns: 2, order: ['name', 'bio'] });

    expect(planLayout(undefined, new Set(['name']))).toEqual({
      areas: undefined,
      columns: 1,
      order: [],
    });
  });

  it('renders fields in the reading order of the layout and unplaced fields last', () => {
    const plan = planLayout('"name email" "bio bio"', new Set(['name', 'email', 'bio']));

    expect(names(orderEntries(ENTRIES, plan.order))).toEqual([
      'name',
      'email',
      'bio',
      'address.city',
    ]);
  });

  it('turns a nested name into a valid area name unless an area is given', () => {
    expect(areaOf(field(NuiInput, { name: 'address.city' }))).toBe('address-city');
    expect(areaOf(field(NuiInput, { name: 'address.city', area: 'city' }))).toBe('city');
  });
});

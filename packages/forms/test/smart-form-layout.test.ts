import { NuiInput } from '@numior/vue';
import { describe, expect, it } from 'vite-plus/test';
import { formConfig } from '../src';
import { itemOf } from '../src/components/smart-form/items';
import { orderByArea, parseLayout, planLayout } from '../src/components/smart-form/layout';

interface Profile {
  name: string;
  email: string;
  bio: string;
  address: { city: string };
}

const PROFILE: Profile = { name: '', email: '', bio: '', address: { city: '' } };

const { field } = formConfig<Profile>();

const ENTRIES = [
  field(NuiInput, (values) => values.bio),
  field(NuiInput, (values) => values.email),
  field(NuiInput, (values) => values.address.city),
  field(NuiInput, (values) => values.name),
];

const items = ENTRIES.map((entry) => itemOf(PROFILE, entry, ''));

const city = (values: Profile) => values.address.city;

const paths = (list: readonly { readonly key: string }[]) => list.map((item) => item.key);

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

    expect(paths(orderByArea(items, plan.order))).toEqual([
      'field:name',
      'field:email',
      'field:bio',
      'field:address.city',
    ]);
  });

  it('turns a nested path into a valid area name unless an area is given', () => {
    expect(itemOf(PROFILE, field(NuiInput, city), '').area).toBe('address-city');
    expect(itemOf(PROFILE, field(NuiInput, city, { area: 'city' }), '').area).toBe('city');
  });

  it('names row fields by their place inside the row', () => {
    const row = itemOf(
      { contacts: [{ phone: '' }] },
      formConfig<{ contacts: { phone: string }[] }>().field(
        NuiInput,
        (values) => values.contacts[0]?.phone,
      ),
      'contacts.0',
    );

    expect([row.key, row.area]).toEqual(['field:contacts.0.phone', 'phone']);
  });
});

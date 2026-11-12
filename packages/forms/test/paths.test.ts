import { describe, expect, expectTypeOf, it } from 'vite-plus/test';
import type { DeepPartial, FormAfterSlotPath, FormPath, FormPathValue, FormSlotPath } from '../src';
import { isUnder, joinPath, matchesPattern, normalizePath, patternOf } from '../src/paths/paths';

interface Team {
  name: string;
  owner: { email: string };
  members: { email: string; tags: string[] }[];
}

interface Route {
  stops: [from: string, to: { city: string }];
  seen: Set<string>;
  prices: Map<string, number>;
}

type Payment = { card: { number: string } } | { iban: string };

describe('paths', () => {
  it('accepts bracket indexes from servers and keeps dots as the canonical form', () => {
    expect(normalizePath('items[0].name')).toBe('items.0.name');
    expect(normalizePath('[2].name')).toBe('2.name');
    expect(normalizePath('items.0.name')).toBe('items.0.name');
    expect(joinPath('items', 0, '', 'name')).toBe('items.0.name');
  });

  it('respects segment boundaries when checking a prefix', () => {
    expect(isUnder('name', 'name')).toBe(true);
    expect(isUnder('name.first', 'name')).toBe(true);
    expect(isUnder('nameSuffix', 'name')).toBe(false);
    expect(isUnder('anything', '')).toBe(true);
  });

  it('turns row indexes into stars and matches rows against them', () => {
    expect(patternOf('items.12.tags.0')).toBe('items.*.tags.*');
    expect(matchesPattern('items.3.name', 'items.*.name')).toBe(true);
    expect(matchesPattern('items.x.name', 'items.*.name')).toBe(false);
    expect(matchesPattern('items.3', 'items.*.name')).toBe(false);
  });

  it('types the paths and values of tuples, collections and unions without a shared key', () => {
    expectTypeOf<FormPath<Route>>().toEqualTypeOf<
      'stops' | 'stops.0' | 'stops.1' | 'stops.1.city' | 'seen' | 'prices'
    >();

    expectTypeOf<FormPathValue<Route, 'stops.0'>>().toEqualTypeOf<string>();
    expectTypeOf<FormPathValue<Route, 'stops.1.city'>>().toEqualTypeOf<string>();
    expectTypeOf<FormPath<Payment>>().toEqualTypeOf<'card' | 'card.number' | 'iban'>();
    expectTypeOf<FormPathValue<Payment, 'iban'>>().toEqualTypeOf<string>();
    expectTypeOf<DeepPartial<Route>['prices']>().toEqualTypeOf<Map<string, number> | undefined>();
  });

  it('names smart form slots by the paths of a row, without row indexes', () => {
    expectTypeOf<FormSlotPath<Team>>().toEqualTypeOf<
      'name' | 'owner' | 'owner.email' | 'members' | 'members.email' | 'members.tags'
    >();

    expectTypeOf<FormAfterSlotPath<Pick<Team, 'owner'>>>().toEqualTypeOf<
      'owner:after' | 'owner.email:after'
    >();

    expectTypeOf<'members.0.email'>().toMatchTypeOf<FormPath<Team>>();
    expectTypeOf<FormSlotPath<Record<string, unknown>>>().toEqualTypeOf<string>();
  });
});

import { describe, expect, it } from 'vite-plus/test';
import { createFormEngine } from '../src/engine/form-engine';
import { EngineHarness } from './harness/engine';

const marked = ['Taken'];

interface Draft {
  name: string;
  stale?: boolean;
}

const stale: Draft = { name: 'Ann', stale: true };

const factory = createFormEngine;

describe('form engine contract', () => {
  it('seeds the store from a copy and exposes it read-only', () => {
    const initial = { name: 'Ann', tags: ['a'] };
    const harness = EngineHarness.mount(factory, initial, ['name']);

    initial.tags.push('b');
    expect(harness.engine.values).toEqual({ name: 'Ann', tags: ['a'] });
    expect(harness.valueAt('name')).toBe('Ann');
  });

  it('writes a copy of a value and never touches the field state while doing so', async () => {
    const harness = EngineHarness.mount(factory, { name: 'Ann', tags: ['a'] }, ['name']);
    const tags = ['x'];
    const name = harness.field('name');

    name.setErrors(marked);
    name.setAttempted(true);
    harness.engine.setValue('name', 'Bob');
    harness.engine.setValue('tags', tags);
    tags.push('y');
    await harness.tick();
    expect(harness.engine.values).toEqual({ name: 'Bob', tags: ['x'] });
    expect(name.errors.value).toEqual(marked);
    expect(name.attempted.value).toBe(true);
  });

  it('keeps our field state through its own background runs on mount and unmount', async () => {
    const harness = EngineHarness.mount(factory, { name: 'Ann', email: '' }, ['name', 'email']);
    const name = harness.field('name');

    name.setErrors(marked);
    name.setTouched(true);
    await harness.toggle('email');
    await harness.toggle('email');
    await harness.tick();
    expect(name.errors.value).toEqual(marked);
    expect(name.touched.value).toBe(true);
  });

  it('replaces the values on reset and clears field state and the submit count', async () => {
    const harness = EngineHarness.mount(factory, stale, ['name']);
    const name = harness.field('name');

    name.setErrors(marked);
    name.setTouched(true);
    name.setAttempted(true);
    harness.engine.countSubmit();
    harness.engine.reset({ name: 'Bob' });
    await harness.tick();
    expect(harness.engine.values).toEqual({ name: 'Bob' });

    expect([name.errors.value, name.touched.value, name.attempted.value]).toEqual([
      [],
      false,
      false,
    ]);

    expect(harness.engine.submitCount.value).toBe(0);
  });

  it('unsets object keys and leaves array positions in place', () => {
    const harness = EngineHarness.mount(
      factory,
      { address: { city: 'Paris' }, tags: ['a', 'b'] },
      [],
    );

    harness.engine.unsetValue('address.city');
    harness.engine.unsetValue('tags.1');
    harness.engine.unsetValue('tags.5');
    expect(harness.engine.values).toEqual({ address: {}, tags: ['a', undefined] });
  });

  it('merges partial values into the store', () => {
    const harness = EngineHarness.mount(
      factory,
      { name: 'Ann', address: { city: 'Paris', zip: '75' } },
      [],
    );

    harness.engine.mergeValues({ address: { city: 'Lyon' } });
    expect(harness.engine.values).toEqual({ name: 'Ann', address: { city: 'Lyon', zip: '75' } });
  });

  it('carries field state along when the field path changes', async () => {
    const harness = EngineHarness.mount(factory, { rows: [{ name: 'a' }, { name: 'b' }] }, [
      'rows.1.name',
    ]);

    const row = harness.field('rows.1.name');

    row.setErrors(marked);
    await harness.move('rows.1.name', 'rows.0.name');
    expect(row.errors.value).toEqual(marked);
  });

  it('keeps row keys through inserts, moves, swaps and removals and copies new rows', async () => {
    const harness = EngineHarness.mount(factory, { rows: ['a', 'b', 'c'] }, [], ['rows']);
    const list = harness.array('rows');
    const values = () => harness.valueAt('rows');
    const keys = () => list.keys.value;
    const [a, b, c] = keys();
    const added = { name: 'x' };

    list.move(0, 2);
    await harness.tick();

    expect([values(), keys()]).toEqual([
      ['b', 'c', 'a'],
      [b, c, a],
    ]);

    list.remove(1);
    list.swap(0, 1);
    await harness.tick();

    expect([values(), keys()]).toEqual([
      ['a', 'b'],
      [a, b],
    ]);

    list.insert(1, added);
    added.name = 'changed';
    await harness.tick();
    expect(values()).toEqual(['a', { name: 'x' }, 'b']);
    expect(new Set(keys()).size).toBe(3);
    expect(keys()).not.toContain(c);
  });
});

import { describe, expect, it } from 'vite-plus/test';
import { customAsync, min, required } from '../src';
import { ArrayHarness, type ArrayHarnessOptions } from './harness/array';

const named = (...names: string[]) => names.map((name) => ({ name }));

const needsName = [required({ message: 'Enter a name' })];

const mountContacts = (
  names: readonly string[],
  options: Partial<ArrayHarnessOptions> = {},
): ArrayHarness =>
  ArrayHarness.mount({
    initialValues: { title: 'Team', contacts: named(...names) },
    ...options,
  });

describe('field arrays', () => {
  it('runs an asynchronous rule on the whole list', async () => {
    const seen: number[] = [];

    const list = mountContacts(['a', 'b'], {
      listRules: [
        customAsync(async (contacts) => {
          seen.push(contacts.length);
          return contacts.length > 2 ? 'Too many contacts' : undefined;
        }),
      ],
    });

    expect((await list.form.validate()).valid).toBe(true);
    await list.push({ name: 'c' });
    expect((await list.form.validate()).valid).toBe(false);
    expect(seen).toEqual([2, 3]);
  });

  it('keeps row keys unique and stable through every operation', async () => {
    const list = mountContacts(['a', 'b', 'c']);
    const [a, b, c] = list.keys;

    await list.push({ name: 'd' });

    const d = list.keys[3];

    await list.move(0, 2);
    expect(list.keys).toEqual([b, c, a, d]);

    await list.swap(0, 3);
    await list.remove(1);
    await list.insert(1, { name: 'e' });
    await list.prepend({ name: 'f' });
    expect(list.keys.slice(1)).toEqual([d, list.keys[2], a, b]);
    expect(new Set(list.keys).size).toBe(5);
    expect(list.values).toEqual({ title: 'Team', contacts: named('f', 'd', 'e', 'a', 'b') });

    await list.replace(named('x', 'y'));
    expect(list.keys).toHaveLength(2);
    expect(list.values).toEqual({ title: 'Team', contacts: named('x', 'y') });
  });

  it('moves touched state and messages along with their rows', async () => {
    const list = mountContacts(['', 'b', ''], { rowRules: needsName });

    await list.blur(1);
    await list.move(1, 0);
    expect([list.row(0).meta.touched, list.row(1).meta.touched]).toEqual([true, false]);

    await list.move(0, 1);
    await list.submit();
    await list.move(0, 1);

    expect([list.rowError(0), list.rowError(1), list.rowError(2)]).toEqual([
      undefined,
      'Enter a name',
      'Enter a name',
    ]);

    await list.remove(1);
    await list.swap(0, 1);
    expect([list.rowError(0), list.rowError(1)]).toEqual(['Enter a name', undefined]);
    expect(list.row(1).meta.touched).toBe(true);
  });

  it('shows a list rule on the list and clears it once a row is added', async () => {
    const list = mountContacts(['a'], { listRules: [min(2)] });

    expect((await list.submit()).invalid).toEqual(['contacts']);
    expect(list.listError).toBe('Add at least 2 items');

    await list.push({ name: 'b' });
    expect(list.listError).toBeUndefined();
  });

  it('updates a row without clearing the messages of other rows', async () => {
    const list = mountContacts(['', ''], { rowRules: needsName });

    await list.submit();
    await list.update(0, { name: 'Ann' });
    expect(list.rowError(0)).toBeUndefined();
    expect(list.rowError(1)).toBe('Enter a name');
  });

  it('keeps messages on rows past the tenth after an earlier row goes away', async () => {
    const list = mountContacts(
      Array.from({ length: 12 }, () => ''),
      { rowRules: needsName },
    );

    await list.submit();
    await list.remove(1);
    expect(list.rowError(10)).toBe('Enter a name');

    await list.type(10, 'Ann');
    expect(list.rowError(10)).toBeUndefined();
  });

  it('does not hand the state of a removed row to a row added later', async () => {
    const list = mountContacts(['', ''], { rowRules: needsName });

    await list.submit();
    await list.remove(1);
    await list.push({ name: '' });
    expect(list.rowError(1)).toBeUndefined();
    expect(list.row(1).meta.touched).toBe(false);
  });

  it('leaves an inactive list out of the submission', async () => {
    const list = mountContacts(['a']);

    await list.deactivate();
    await list.submit();
    expect(list.submissions).toEqual([{ title: 'Team' }]);
  });
});

import { describe, expect, it } from 'vite-plus/test';
import { DraftsDriver } from './drivers/drafts';

describe('control drafts on a form flush', () => {
  it('commits the text of a lazy input and a lazy textarea', async () => {
    const input = DraftsDriver.mount('input');

    const textarea = DraftsDriver.mount('textarea');

    await input.type('input', 'Ann');
    await textarea.type('textarea', 'Hello');
    expect([input.emitted, textarea.emitted]).toEqual([[], []]);

    await input.flush();
    await textarea.flush();
    expect([input.emitted, textarea.emitted]).toEqual([['Ann'], ['Hello']]);
  });

  it('commits the number typed into a number field', async () => {
    const field = DraftsDriver.mount('number');

    await field.type('input', '42');
    expect(field.emitted).toEqual([]);

    await field.flush();
    expect(field.emitted).toEqual([42]);
  });

  it('commits a custom combobox value and clamps a time field', async () => {
    const combobox = DraftsDriver.mount('combobox');

    const time = DraftsDriver.mount('time');

    await combobox.type('input', 'Mango');
    await combobox.flush();
    await time.flush();
    expect(combobox.emitted).toEqual(['Mango']);
    expect(time.emitted).toEqual(['22:00']);
  });
});

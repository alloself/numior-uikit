import { describe, expect, it } from 'vite-plus/test';
import { h } from 'vue';
import { NuiCombobox, NuiInput, NuiNumberField, NuiTextarea, NuiTimeField } from '../src';
import { DraftsDriver } from './drivers/drafts';
import { FRUITS } from './support/options';

const asText = (text: string): string => text;

describe('control drafts on a form flush', () => {
  it('commits the text of a lazy input and a lazy textarea', async () => {
    const input = DraftsDriver.mount((record) =>
      h(NuiInput, {
        modelValue: '',
        modelModifiers: { lazy: true },
        'onUpdate:modelValue': record,
      }),
    );

    const textarea = DraftsDriver.mount((record) =>
      h(NuiTextarea, {
        modelValue: '',
        modelModifiers: { lazy: true },
        'onUpdate:modelValue': record,
      }),
    );

    await input.type('input', 'Ann');
    await textarea.type('textarea', 'Hello');
    expect([input.emitted, textarea.emitted]).toEqual([[], []]);

    await input.flush();
    await textarea.flush();
    expect([input.emitted, textarea.emitted]).toEqual([['Ann'], ['Hello']]);
  });

  it('commits the number typed into a number field', async () => {
    const field = DraftsDriver.mount((record) =>
      h(NuiNumberField, { modelValue: null, 'onUpdate:modelValue': record }),
    );

    await field.type('input', '42');
    expect(field.emitted).toEqual([]);

    await field.flush();
    expect(field.emitted).toEqual([42]);
  });

  it('commits a custom combobox value and clamps a time field', async () => {
    const combobox = DraftsDriver.mount((record) =>
      h(NuiCombobox, {
        options: FRUITS,
        customValue: asText,
        modelValue: undefined,
        'onUpdate:modelValue': record,
      }),
    );

    const time = DraftsDriver.mount((record) =>
      h(NuiTimeField, { modelValue: '23:30', max: '22:00', 'onUpdate:modelValue': record }),
    );

    await combobox.type('input', 'Mango');
    await combobox.flush();
    await time.flush();
    expect(combobox.emitted).toEqual(['Mango']);
    expect(time.emitted).toEqual(['22:00']);
  });
});

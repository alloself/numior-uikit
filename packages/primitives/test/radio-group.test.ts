import { describe, expect, it } from 'vite-plus/test';
import { computed, ref } from 'vue';
import { provideRadioGroup, useRadioGroup } from '../src';
import { captureSetup } from './harness/capture';

describe('radio group context', () => {
  it('is null outside a group', () => {
    expect(captureSetup(() => useRadioGroup()).value).toBeNull();
  });

  it('shares name and selection with the radios inside', () => {
    const model = ref<string | undefined>('a');

    const group = captureSetup(() => useRadioGroup(), {
      layers: [
        () =>
          provideRadioGroup<string>({
            name: computed(() => 'plan'),
            modelValue: model,
            disabled: computed(() => false),
            readonly: computed(() => false),
            invalid: computed(() => false),
            select: (value) => {
              model.value = value;
            },
          }),
      ],
    }).value;

    expect(group?.name.value).toBe('plan');
    expect(group?.modelValue.value).toBe('a');
    group?.select('b');
    expect(model.value).toBe('b');
  });
});

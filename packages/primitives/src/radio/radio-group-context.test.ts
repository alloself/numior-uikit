import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { computed, defineComponent, h, ref } from 'vue';
import { provideRadioGroup, useRadioGroup, type RadioGroupContext } from './radio-group-context';

describe('radio group context', () => {
  it('is null outside a group and round-trips inside one', () => {
    const seen: Array<RadioGroupContext<string> | null> = [];
    const Radio = defineComponent({
      setup() {
        seen.push(useRadioGroup<string>());
        return () => h('input', { type: 'radio' });
      },
    });
    mount(Radio);
    const model = ref<string | undefined>('a');
    mount(
      defineComponent({
        setup() {
          provideRadioGroup<string>({
            name: computed(() => 'plan'),
            modelValue: model,
            disabled: computed(() => false),
            invalid: computed(() => false),
            select: (value) => {
              model.value = value;
            },
          });
          return () => h(Radio);
        },
      }),
    );
    expect(seen[0]).toBeNull();
    expect(seen[1]?.name.value).toBe('plan');
    seen[1]?.select('b');
    expect(model.value).toBe('b');
  });
});

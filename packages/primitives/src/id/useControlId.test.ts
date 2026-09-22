import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';
import { useControlId } from './useControlId';

describe('useControlId', () => {
  it('generates a stable id and prefers an explicit one', async () => {
    const explicit = ref<string | undefined>(undefined);
    const wrapper = mount(
      defineComponent({
        setup() {
          const id = useControlId(explicit);
          return () => h('input', { id: id.value });
        },
      }),
    );
    const generated = wrapper.attributes('id');
    expect(generated).toBeTruthy();
    wrapper.vm.$forceUpdate();
    await nextTick();
    expect(wrapper.attributes('id')).toBe(generated);
    explicit.value = 'custom';
    await nextTick();
    expect(wrapper.attributes('id')).toBe('custom');
  });
});

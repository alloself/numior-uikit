import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';
import { useSplitAttrs } from './useSplitAttrs';

const Split = defineComponent({
  inheritAttrs: false,
  setup() {
    const split = useSplitAttrs();
    return () => h('div', split.rootAttrs(), [h('input', split.controlAttrs())]);
  },
});

describe('useSplitAttrs', () => {
  it('routes class and style to the wrapper and the rest to the control', async () => {
    let focused = 0;
    const placeholder = ref('Name');
    const wrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h(Split, {
              class: 'wide',
              style: 'color: red',
              placeholder: placeholder.value,
              'aria-label': 'Name',
              onFocus: () => focused++,
            });
        },
      }),
    );
    const root = wrapper.find('div');
    expect(root.classes()).toContain('wide');
    expect(root.attributes('style')).toContain('color: red');
    const input = wrapper.find('input');
    expect(input.attributes('placeholder')).toBe('Name');
    expect(input.attributes('aria-label')).toBe('Name');
    expect(input.attributes('class')).toBeUndefined();
    await input.trigger('focus');
    expect(focused).toBe(1);
    placeholder.value = 'Full name';
    await nextTick();
    expect(input.attributes('placeholder')).toBe('Full name');
  });
});

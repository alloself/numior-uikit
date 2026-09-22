import { mount, type DOMWrapper, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, nextTick, ref } from 'vue';
import { useSplitAttrs } from '../../src';

const Split = defineComponent({
  inheritAttrs: false,
  setup() {
    const split = useSplitAttrs();
    return () => h('div', split.rootAttrs(), [h('input', split.controlAttrs())]);
  },
});

export class SplitAttrsHarness {
  readonly focusCount = { value: 0 };
  private readonly placeholder = ref('Name');
  private readonly wrapper: VueWrapper;

  constructor() {
    const placeholder = this.placeholder;
    const focusCount = this.focusCount;
    this.wrapper = mount(
      defineComponent({
        setup: () => () =>
          h(Split, {
            class: 'wide',
            style: 'color: red',
            placeholder: placeholder.value,
            'aria-label': 'Name',
            onFocus: () => {
              focusCount.value += 1;
            },
          }),
      }),
    );
  }

  get root(): DOMWrapper<HTMLDivElement> {
    return this.wrapper.find<HTMLDivElement>('div');
  }

  get control(): DOMWrapper<HTMLInputElement> {
    return this.wrapper.find<HTMLInputElement>('input');
  }

  async focusControl(): Promise<void> {
    await this.control.trigger('focus');
  }

  async renamePlaceholder(next: string): Promise<void> {
    this.placeholder.value = next;
    await nextTick();
  }
}

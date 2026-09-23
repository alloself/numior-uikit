import { mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, shallowRef, type Ref } from 'vue';

type Outcome<T> = { readonly ran: true; readonly value: T } | { readonly ran: false };

export interface ElementsCapture<T> {
  readonly value: T;
  readonly wrapper: VueWrapper;
  readonly first: HTMLElement;
  readonly second: HTMLElement;
  unmount(): void;
}

export function captureWithElements<T>(
  setup: (first: Ref<HTMLElement | null>, second: Ref<HTMLElement | null>) => T,
  tags: readonly [string, string] = ['button', 'div'],
): ElementsCapture<T> {
  const outcome: { current: Outcome<T> } = { current: { ran: false } };
  const Host = defineComponent({
    setup() {
      const first = shallowRef<HTMLElement | null>(null);
      const second = shallowRef<HTMLElement | null>(null);
      outcome.current = { ran: true, value: setup(first, second) };
      return () => [h(tags[0], { ref: first }), h(tags[1], { ref: second })];
    },
  });
  const wrapper = mount(Host, { attachTo: document.body });
  if (!outcome.current.ran) throw new Error('setup did not run');
  return {
    value: outcome.current.value,
    wrapper,
    first: wrapper.find<HTMLElement>(tags[0]).element,
    second: wrapper.find<HTMLElement>(tags[1]).element,
    unmount: () => wrapper.unmount(),
  };
}

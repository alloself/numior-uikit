import { mount, type VueWrapper } from '@vue/test-utils';
import type { Ref } from 'vue';
import ElementsProbe from '../fixtures/ElementsProbe.vue';

type Outcome<T> = { readonly ran: true; readonly value: T } | { readonly ran: false };

export interface ElementsCapture<T> {
  readonly value: T;
  readonly wrapper: VueWrapper;
  readonly first: HTMLElement;
  readonly second: HTMLElement;
  unmount(): void;
}

export const captureWithElements = <T>(
  setup: (first: Ref<HTMLElement | null>, second: Ref<HTMLElement | null>) => T,
  tags: readonly [string, string] = ['button', 'div'],
): ElementsCapture<T> => {
  const outcome: { current: Outcome<T> } = { current: { ran: false } };

  const wrapper = mount(ElementsProbe, {
    props: {
      tags,
      run: (first: Ref<HTMLElement | null>, second: Ref<HTMLElement | null>) => {
        outcome.current = { ran: true, value: setup(first, second) };
      },
    },
    attachTo: document.body,
  });

  if (!outcome.current.ran) {
    throw new Error('setup did not run');
  }
  return {
    value: outcome.current.value,
    wrapper,
    first: wrapper.find<HTMLElement>(tags[0]).element,
    second: wrapper.find<HTMLElement>(tags[1]).element,
    unmount: () => wrapper.unmount(),
  };
};

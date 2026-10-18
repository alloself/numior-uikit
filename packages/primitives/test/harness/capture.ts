import { mount, type VueWrapper } from '@vue/test-utils';
import type { Plugin } from 'vue';
import SetupProbe from '../fixtures/SetupProbe.vue';

type Outcome<T> = { readonly ran: true; readonly value: T } | { readonly ran: false };

export interface CaptureOptions {
  readonly layers?: readonly (() => void)[];
  readonly plugins?: Plugin[];
}

export class Capture<T> {
  constructor(
    readonly value: T,
    readonly wrapper: VueWrapper,
  ) {}
}

export const captureSetup = <T>(setup: () => T, options: CaptureOptions = {}): Capture<T> => {
  const outcome: { current: Outcome<T> } = { current: { ran: false } };

  const wrapper = mount(SetupProbe, {
    props: {
      layers: options.layers ?? [],
      run: () => {
        outcome.current = { ran: true, value: setup() };
      },
    },
    global: { plugins: options.plugins ?? [] },
  });

  if (!outcome.current.ran) {
    throw new Error('setup did not run');
  }
  return new Capture(outcome.current.value, wrapper);
};

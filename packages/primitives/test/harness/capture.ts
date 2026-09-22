import { mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, type Component, type Plugin } from 'vue';

type Outcome<T> = { readonly ran: true; readonly value: T } | { readonly ran: false };

export interface CaptureOptions {
  readonly wrap?: (child: Component) => Component;
  readonly plugins?: Plugin[];
}

export class Capture<T> {
  constructor(
    readonly value: T,
    readonly wrapper: VueWrapper,
  ) {}
}

export function captureSetup<T>(setup: () => T, options: CaptureOptions = {}): Capture<T> {
  const outcome: { current: Outcome<T> } = { current: { ran: false } };
  const Probe = defineComponent({
    setup() {
      outcome.current = { ran: true, value: setup() };
      return () => h('i');
    },
  });
  const wrapper = mount(options.wrap ? options.wrap(Probe) : Probe, {
    global: { plugins: options.plugins ?? [] },
  });
  if (!outcome.current.ran) throw new Error('setup did not run');
  return new Capture(outcome.current.value, wrapper);
}

export const providing =
  (provide: () => void) =>
  (child: Component): Component =>
    defineComponent({
      setup() {
        provide();
        return () => h(child);
      },
    });

export const nest = (...layers: Array<(child: Component) => Component>) =>
  layers.reduceRight<(child: Component) => Component>(
    (inner, outer) => (child) => outer(inner(child)),
    (child) => child,
  );

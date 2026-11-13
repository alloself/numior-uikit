import { mount, type VueWrapper } from '@vue/test-utils';
import PressTargetsHost from '../fixtures/PressTargetsHost.vue';

export interface PressTargetsHarnessOptions {
  readonly shown?: boolean;
  readonly stops?: boolean;
}

type HostWrapper = VueWrapper<InstanceType<typeof PressTargetsHost>>;

export class PressTargetsHarness {
  static mount(options: PressTargetsHarnessOptions = {}): PressTargetsHarness {
    return new PressTargetsHarness(
      mount(PressTargetsHost, {
        props: { shown: options.shown ?? true, stops: options.stops ?? false },
        attachTo: document.body,
      }),
    );
  }

  private constructor(private readonly wrapper: HostWrapper) {}

  get presses(): readonly string[] {
    return (this.wrapper.emitted('press') ?? []).map(([part]) => String(part));
  }

  async show(): Promise<void> {
    await this.wrapper.setProps({ shown: true });
  }

  pressMark(): void {
    this.wrapper
      .get('.mark')
      .element.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
  }

  pressOuter(): void {
    this.wrapper
      .get('.outer')
      .element.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
  }

  unmount(): void {
    this.wrapper.unmount();
  }
}

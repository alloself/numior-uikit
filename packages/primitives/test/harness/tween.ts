import { mount, type VueWrapper } from '@vue/test-utils';
import BlockSizeTweenHost from '../fixtures/BlockSizeTweenHost.vue';

export interface TweenHarnessOptions {
  readonly duration?: string;
}

interface Tween {
  readonly keyframes: unknown;
  readonly options: unknown;
}

type HostWrapper = VueWrapper<InstanceType<typeof BlockSizeTweenHost>>;

export class TweenHarness {
  static mount({ duration = '200ms' }: TweenHarnessOptions = {}): TweenHarness {
    const tweens: Tween[] = [];

    const wrapper = mount(BlockSizeTweenHost, {
      props: {
        rows: 1,
        duration,
        onTween: (keyframes: unknown, options: unknown) => {
          tweens.push({ keyframes, options });
        },
      },
    });

    return new TweenHarness(wrapper, tweens);
  }

  private constructor(
    private readonly wrapper: HostWrapper,
    readonly tweens: readonly Tween[],
  ) {}

  async render(rows: number): Promise<void> {
    await this.wrapper.setProps({ rows });
  }

  unmount(): void {
    this.wrapper.unmount();
  }
}

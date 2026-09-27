import { mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, nextTick, ref, shallowRef } from 'vue';
import { useBlockSizeTween } from '../../src';

export interface TweenHarnessOptions {
  readonly duration?: string;
}

const ROW_HEIGHT = 40;

interface Tween {
  readonly keyframes: unknown;
  readonly options: unknown;
}

export class TweenHarness {
  static mount({ duration = '200ms' }: TweenHarnessOptions = {}): TweenHarness {
    const rows = ref(1);
    const tweens: Tween[] = [];

    const Host = defineComponent({
      setup() {
        const box = shallowRef<HTMLElement | null>(null);

        const setBox = (element: unknown): void => {
          if (!(element instanceof HTMLElement)) {
            box.value = null;
            return;
          }

          element.getBoundingClientRect = () =>
            new DOMRect(0, 0, 200, element.children.length * ROW_HEIGHT);

          Object.defineProperty(element, 'animate', {
            configurable: true,
            value: (keyframes: unknown, options: unknown) => {
              tweens.push({ keyframes, options });
            },
          });

          box.value = element;
        };

        useBlockSizeTween(box);

        return () =>
          h(
            'div',
            {
              ref: setBox,
              style: { '--nui-duration-normal': duration, '--nui-easing': 'linear' },
            },
            Array.from({ length: rows.value }, (_, index) =>
              h('p', { key: index }, `Row ${index}`),
            ),
          );
      },
    });

    return new TweenHarness(mount(Host), rows, tweens);
  }

  private constructor(
    private readonly wrapper: VueWrapper,
    private readonly rows: { value: number },
    readonly tweens: readonly Tween[],
  ) {}

  async render(rows: number): Promise<void> {
    this.rows.value = rows;
    await nextTick();
  }

  unmount(): void {
    this.wrapper.unmount();
  }
}

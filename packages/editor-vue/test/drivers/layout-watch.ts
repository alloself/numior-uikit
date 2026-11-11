import { promiseTimeout } from '@vueuse/core';
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import LayoutScene from '../fixtures/LayoutScene.vue';

interface Motion {
  frames: number;
  iterations: number;
}

const nextPaint = async (): Promise<void> => {
  await new Promise((resolve) => {
    requestAnimationFrame(resolve);
  });

  await promiseTimeout(0);
};

export class LayoutWatchDriver {
  private heard = 0;
  private stop: (() => void) | undefined;

  private constructor(
    private readonly wrapper: VueWrapper<InstanceType<typeof LayoutScene>>,
    private readonly motion: Motion,
  ) {}

  static async mount(): Promise<LayoutWatchDriver> {
    const motion: Motion = { frames: 0, iterations: 1 };
    const wrapper = mount(LayoutScene, { attachTo: document.body });

    Object.defineProperty(wrapper.get('.layout-scene__content').element, 'getAnimations', {
      configurable: true,
      value: () => {
        if (motion.frames === 0) {
          return [];
        }

        motion.frames -= 1;

        return [
          {
            playState: 'running',
            effect: { getComputedTiming: () => ({ iterations: motion.iterations }) },
          },
        ];
      },
    });

    await nextTick();

    return new LayoutWatchDriver(wrapper, motion);
  }

  private get line(): Element {
    return this.wrapper.get('.layout-scene__line').element;
  }

  get calls(): number {
    return this.heard;
  }

  listen(): void {
    this.stop = this.wrapper.vm.watchLayout(() => {
      this.heard += 1;
    });
  }

  leave(): void {
    this.stop?.();
  }

  async shiftLine(): Promise<void> {
    this.line.classList.toggle('layout-scene__line--pushed');
    await nextPaint();
  }

  async retype(text: string): Promise<void> {
    const [first] = this.line.childNodes;

    if (first instanceof Text) {
      first.data = text;
    }

    await nextPaint();
  }

  async addBar(): Promise<void> {
    this.wrapper.element.prepend(document.createElement('div'));
    await nextPaint();
  }

  async startTransition(): Promise<void> {
    this.line.dispatchEvent(new Event('transitionrun', { bubbles: true }));
    await nextPaint();
  }

  async loadPicture(): Promise<void> {
    this.wrapper.get('.layout-scene__picture').element.dispatchEvent(new Event('load'));
    await nextPaint();
  }

  async glideLine(frames: number, iterations = 1): Promise<void> {
    this.motion.frames = frames;
    this.motion.iterations = iterations;
    this.line.classList.toggle('layout-scene__line--gliding');
    await nextPaint();
  }

  async paint(): Promise<void> {
    await nextPaint();
  }

  unmount(): void {
    this.wrapper.unmount();
  }
}

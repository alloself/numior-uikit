import type { NuiEditorApi } from '@numior/editor-vue';
import { promiseTimeout } from '@vueuse/core';
import { mount, type VueWrapper } from '@vue/test-utils';
import { vi } from 'vite-plus/test';
import type { RemotePeer } from '../../src';
import CaretsHost from './CaretsHost.vue';

interface Scene {
  left: number;
  measured: number;
  path: number[];
  iterations: number;
}

const BOX = new DOMRect(0, 0, 400, 100);

const TOP = 30;

const LINE = 18;

const START = 40;

const BOB: RemotePeer = {
  clientId: 'bob',
  user: { id: 'bob', name: 'Bob' },
  colour: 2,
  anchor: 3,
  head: 3,
};

const editorOf = (scene: Scene): NuiEditorApi => ({
  state: () => undefined,
  run: () => false,
  focus: () => undefined,
  flush: () => undefined,
  coordsAt: () => {
    scene.measured += 1;

    return { left: scene.left, right: scene.left, top: TOP, bottom: TOP + LINE };
  },
  posAt: () => undefined,
  contentBox: () => BOX,
  revealNode: () => undefined,
});

const nextPaint = async (): Promise<void> => {
  await new Promise((resolve) => {
    requestAnimationFrame(resolve);
  });

  await promiseTimeout(0);
};

export class CaretsDriver {
  private constructor(
    private readonly wrapper: VueWrapper,
    private readonly scene: Scene,
  ) {}

  static async mount(): Promise<CaretsDriver> {
    const scene: Scene = { left: START, measured: 0, path: [], iterations: 1 };

    const wrapper = mount(CaretsHost, {
      attachTo: document.body,
      props: { peers: [], editor: editorOf(scene) },
    });

    vi.stubGlobal('KeyframeEffect', EventTarget);

    Object.defineProperty(wrapper.element, 'getAnimations', {
      configurable: true,
      value: () => {
        const left = scene.path.shift();

        if (left === undefined) {
          return [];
        }

        scene.left = left;

        return [
          {
            playState: 'running',
            effect: { getComputedTiming: () => ({ iterations: scene.iterations }) },
          },
        ];
      },
    });

    await wrapper.setProps({ peers: [BOB] });

    return new CaretsDriver(wrapper, scene);
  }

  private get line(): Element {
    return this.wrapper.get('.carets-host__line').element;
  }

  get caret(): string {
    return this.wrapper.get<HTMLElement>('.nui-collab-carets__caret').element.style.transform;
  }

  get measurements(): number {
    return this.scene.measured;
  }

  async pushLine(by: number): Promise<void> {
    this.scene.left += by;
    this.line.classList.add('carets-host__line--pushed');
    await nextPaint();
  }

  async startTransition(by: number): Promise<void> {
    this.scene.left += by;
    this.line.dispatchEvent(new Event('transitionrun', { bubbles: true }));
    await nextPaint();
  }

  async loadPicture(by: number): Promise<void> {
    this.scene.left += by;
    this.wrapper.get('.carets-host__picture').element.dispatchEvent(new Event('load'));
    await nextPaint();
  }

  async glideLine(path: readonly number[], iterations = 1): Promise<void> {
    this.scene.path = [...path];
    this.scene.iterations = iterations;
    this.line.classList.toggle('carets-host__line--gliding');
    await nextPaint();
  }

  async paint(): Promise<void> {
    await nextPaint();
  }

  unmount(): void {
    this.wrapper.unmount();
    vi.unstubAllGlobals();
  }
}

import type { NuiEditorApi } from '@numior/editor-vue';
import { mount, type VueWrapper } from '@vue/test-utils';
import type { RemotePeer } from '../../src';
import { NuiCollabCarets } from '../../src/vue';

interface Scene {
  left: number;
  readonly listeners: Set<() => void>;
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
  coordsAt: () => ({ left: scene.left, right: scene.left, top: TOP, bottom: TOP + LINE }),
  posAt: () => undefined,
  contentBox: () => BOX,
  revealNode: () => undefined,
  watchLayout: (listener) => {
    scene.listeners.add(listener);

    return () => {
      scene.listeners.delete(listener);
    };
  },
});

export class CaretsDriver {
  private constructor(
    private readonly wrapper: VueWrapper,
    private readonly scene: Scene,
  ) {}

  static async mount(): Promise<CaretsDriver> {
    const scene: Scene = { left: START, listeners: new Set() };

    const wrapper = mount(NuiCollabCarets, {
      attachTo: document.body,
      props: { peers: [], editor: editorOf(scene) },
    });

    await wrapper.setProps({ peers: [BOB] });

    return new CaretsDriver(wrapper, scene);
  }

  get caret(): string {
    return this.wrapper.get<HTMLElement>('.nui-collab-carets__caret').element.style.transform;
  }

  get listening(): boolean {
    return this.scene.listeners.size > 0;
  }

  shiftText(by: number): void {
    this.scene.left += by;

    this.scene.listeners.forEach((listener) => {
      listener();
    });
  }

  unmount(): void {
    this.wrapper.unmount();
  }
}

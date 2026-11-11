import { mount, type VueWrapper } from '@vue/test-utils';
import RevealScene from '../fixtures/RevealScene.vue';

const ROW = 40;
const FRAME = 200;
const LINKS = Array.from({ length: 20 }, (_, index) => `/page-${index + 1}`);

const rect = (top: number, height: number): DOMRect => new DOMRect(0, top, 240, height);

export class RevealDriver {
  constructor(
    readonly wrapper: VueWrapper<InstanceType<typeof RevealScene>>,
    private readonly scroller: HTMLElement,
  ) {}

  static mount(current: string, scrollable = true): RevealDriver {
    const wrapper = mount(RevealScene, {
      props: { links: LINKS, current },
      attachTo: document.body,
    });

    const scroller = wrapper.find<HTMLElement>('.scroller').element;

    Object.defineProperty(scroller, 'clientHeight', { value: FRAME });

    Object.defineProperty(scroller, 'scrollHeight', {
      value: scrollable ? ROW * LINKS.length : FRAME,
    });

    scroller.getBoundingClientRect = () => rect(0, FRAME);

    wrapper.findAll<HTMLElement>('a').forEach((link, index) => {
      link.element.getBoundingClientRect = () => rect(index * ROW - scroller.scrollTop, ROW);
    });

    return new RevealDriver(wrapper, scroller);
  }

  get scrollTop(): number {
    return this.scroller.scrollTop;
  }

  scrollTo(top: number): void {
    this.scroller.scrollTop = top;
  }

  reveal(): void {
    this.wrapper.vm.reveal();
  }

  unmount(): void {
    this.wrapper.unmount();
  }
}

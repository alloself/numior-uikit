import { mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, nextTick, ref, shallowRef } from 'vue';
import { useVirtualList, type VirtualAlign, type VirtualList } from '../../src';

export interface VirtualHarnessOptions {
  readonly count?: number;
  readonly itemSize?: number | ((index: number) => number);
  readonly overscan?: number;
  readonly height?: number;
  readonly initialCount?: number;
  readonly pinned?: number;
  readonly enabled?: boolean;
}

type Outcome = { readonly ran: true; readonly value: VirtualList } | { readonly ran: false };

const defineSize = (element: HTMLElement, name: string, value: number): void => {
  Object.defineProperty(element, name, { value, configurable: true, writable: true });
};

export class VirtualHarness {
  static mount(options: VirtualHarnessOptions = {}): VirtualHarness {
    const count = ref(options.count ?? 1000);
    const pinned = ref(options.pinned);
    const height = options.height ?? 200;
    const outcome: { current: Outcome } = { current: { ran: false } };
    const Host = defineComponent({
      setup() {
        const container = shallowRef<HTMLElement | null>(null);
        const virtual = useVirtualList(container, {
          count,
          itemSize: () => options.itemSize ?? 20,
          overscan: () => options.overscan,
          initialCount: () => options.initialCount,
          enabled: () => options.enabled,
          pinned,
        });
        outcome.current = { ran: true, value: virtual };
        const setContainer = (element: unknown): void => {
          if (element instanceof HTMLElement) {
            defineSize(element, 'clientHeight', height);
            container.value = element;
          } else {
            container.value = null;
          }
        };
        return () =>
          h('div', { ref: setContainer, class: 'viewport' }, [
            h(
              'div',
              { class: 'body', style: { height: `${virtual.totalSize.value}px` } },
              virtual.items.value.map((item) =>
                h(
                  'div',
                  {
                    key: item.index,
                    class: 'row',
                    'data-index': item.index,
                    style: { transform: `translateY(${item.start}px)` },
                  },
                  `Row ${item.index}`,
                ),
              ),
            ),
          ]);
      },
    });
    const wrapper = mount(Host, { attachTo: document.body });
    if (!outcome.current.ran) {
      throw new Error('useVirtualList did not run');
    }
    return new VirtualHarness(wrapper, outcome.current.value, count, pinned);
  }

  async settle(): Promise<void> {
    await nextTick();
  }

  private constructor(
    private readonly wrapper: VueWrapper,
    private readonly list: VirtualList,
    private readonly count: { value: number },
    private readonly pinned: { value: number | undefined },
  ) {}

  private get element(): HTMLElement {
    return this.wrapper.find<HTMLElement>('.viewport').element;
  }

  get range(): { readonly start: number; readonly end: number } {
    return this.list.range.value;
  }

  get renderedIndices(): number[] {
    return this.wrapper.findAll('.row').map((row) => Number(row.attributes('data-index')));
  }

  get totalSize(): number {
    return this.list.totalSize.value;
  }

  get spacers(): { readonly start: number; readonly end: number } {
    return { start: this.list.startSize.value, end: this.list.endSize.value };
  }

  get scrollTop(): number {
    return this.list.scrollTop.value;
  }

  get viewport(): number {
    return this.list.viewport.value;
  }

  offsetOf(index: number): number {
    return this.list.offsetOf(index);
  }

  rowTransform(index: number): string {
    return this.wrapper.find<HTMLElement>(`.row[data-index="${index}"]`).element.style.transform;
  }

  async scroll(px: number): Promise<void> {
    defineSize(this.element, 'scrollTop', px);
    this.element.dispatchEvent(new Event('scroll'));
    await nextTick();
  }

  async scrollToIndex(index: number, align?: VirtualAlign): Promise<void> {
    this.list.scrollTo(index, { align });
    await nextTick();
  }

  async resize(height: number): Promise<void> {
    defineSize(this.element, 'clientHeight', height);
    this.list.measure();
    await nextTick();
  }

  async setCount(count: number): Promise<void> {
    this.count.value = count;
    await nextTick();
  }

  async pin(index: number | undefined): Promise<void> {
    this.pinned.value = index;
    await nextTick();
  }

  unmount(): void {
    this.wrapper.unmount();
  }
}

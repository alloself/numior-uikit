import { mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, nextTick, ref, shallowRef, type VNode } from 'vue';
import {
  useVirtualFrame,
  useVirtualList,
  type ItemSize,
  type VirtualAlign,
  type VirtualAxis,
  type VirtualFrame,
  type VirtualItem,
  type VirtualList,
} from '../../src';

export interface VirtualHarnessOptions {
  readonly count?: number;
  readonly itemSize?: ItemSize;
  readonly overscan?: number;
  readonly height?: number;
  readonly initialCount?: number;
  readonly pinned?: number;
  readonly enabled?: boolean;
  readonly axis?: VirtualAxis;
  readonly maxSize?: number;
  readonly inset?: number;
  readonly dir?: 'ltr' | 'rtl';
  readonly listen?: boolean;
}

type Outcome = { readonly ran: true; readonly value: VirtualList } | { readonly ran: false };

interface SpacerStyles {
  readonly lead: string;
  readonly rest: string;
}

const rowOf = (item: VirtualItem, axis: VirtualAxis): VNode =>
  h(
    'div',
    {
      key: item.index,
      class: 'row',
      'data-index': item.index,
      style: {
        transform: axis === 'x' ? `translateX(${item.offset}px)` : `translateY(${item.offset}px)`,
      },
    },
    `Row ${item.index}`,
  );

const spacersOf = (element: HTMLElement): SpacerStyles => ({
  lead: element.style.getPropertyValue('--_window-lead'),
  rest: element.style.getPropertyValue('--_window-rest'),
});

const defineSize = (element: HTMLElement, name: string, value: number): void => {
  Object.defineProperty(element, name, { value, configurable: true, writable: true });
};

export class VirtualHarness {
  static mount(options: VirtualHarnessOptions = {}): VirtualHarness {
    const count = ref(options.count ?? 1000);
    const pinned = ref(options.pinned);
    const height = options.height ?? 200;
    const axis = options.axis ?? 'y';
    const outcome: { current: Outcome } = { current: { ran: false } };
    const renders: SpacerStyles[] = [];

    const Host = defineComponent({
      setup() {
        const container = shallowRef<HTMLElement | null>(null);

        const virtual = useVirtualList(container, {
          count,
          itemSize: () => options.itemSize ?? 20,
          axis,
          overscan: () => options.overscan,
          initialCount: () => options.initialCount,
          enabled: () => options.enabled,
          pinned,
          maxSize: () => options.maxSize,
          inset: () => options.inset,
          listen: () => options.listen,
        });

        const framed = useVirtualFrame(container, virtual.frame);

        outcome.current = { ran: true, value: virtual };

        const setContainer = (element: unknown): void => {
          if (element instanceof HTMLElement) {
            defineSize(element, axis === 'x' ? 'clientWidth' : 'clientHeight', height);
            container.value = element;
          } else {
            container.value = null;
          }
        };

        return () => {
          if (container.value !== null) {
            renders.push(spacersOf(container.value));
          }
          return h(
            'div',
            {
              ref: setContainer,
              class: 'viewport',
              dir: options.dir,
              style: framed.canvasStyle.value,
            },
            [
              h(
                'div',
                {
                  class: 'body',
                  style: { height: `${virtual.canvasSize.value}px`, ...framed.windowStyle.value },
                },
                virtual.items.value.map((item) => rowOf(item, axis)),
              ),
            ],
          );
        };
      },
    });

    const wrapper = mount(Host, { attachTo: document.body });
    if (!outcome.current.ran) {
      throw new Error('useVirtualList did not run');
    }
    return new VirtualHarness(wrapper, outcome.current.value, count, pinned, axis, renders);
  }

  async settle(): Promise<void> {
    await nextTick();
  }

  private constructor(
    private readonly wrapper: VueWrapper,
    private readonly list: VirtualList,
    private readonly count: { value: number },
    private readonly pinned: { value: number | undefined },
    private readonly axis: VirtualAxis,
    private readonly renders: readonly SpacerStyles[],
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

  get canvasSize(): number {
    return this.list.canvasSize.value;
  }

  get shift(): number {
    return this.list.shift.value;
  }

  get windowOffset(): number {
    return this.list.windowOffset.value;
  }

  get frame(): VirtualFrame {
    return this.list.frame.value;
  }

  get spacerStyles(): SpacerStyles {
    return spacersOf(this.element);
  }

  get spacerStylesAtRender(): SpacerStyles | undefined {
    return this.renders.at(-1);
  }

  get clampStyles(): { readonly start: string; readonly end: string } {
    const body = this.wrapper.find<HTMLElement>('.body').element;

    return {
      start: body.style.getPropertyValue('--_window-clamp-start'),
      end: body.style.getPropertyValue('--_window-clamp-end'),
    };
  }

  get slots(): ReadonlyMap<number, number> {
    return new Map(this.list.items.value.map((item) => [item.index, item.slot]));
  }

  get elementScroll(): number {
    return this.axis === 'x' ? this.element.scrollLeft : this.element.scrollTop;
  }

  get items(): readonly {
    readonly index: number;
    readonly start: number;
    readonly offset: number;
  }[] {
    return this.list.items.value;
  }

  offsetOf(index: number): number {
    return this.list.offsetOf(index);
  }

  rowTransform(index: number): string {
    return this.wrapper.find<HTMLElement>(`.row[data-index="${index}"]`).element.style.transform;
  }

  async scroll(px: number): Promise<void> {
    defineSize(this.element, this.axis === 'x' ? 'scrollLeft' : 'scrollTop', px);
    this.element.dispatchEvent(new Event('scroll'));
    await nextTick();
  }

  async scrollToIndex(index: number, align?: VirtualAlign): Promise<void> {
    this.list.scrollTo(index, { align });
    await nextTick();
  }

  async measure(): Promise<void> {
    this.list.measure();
    await nextTick();
  }

  async resize(height: number): Promise<void> {
    defineSize(this.element, this.axis === 'x' ? 'clientWidth' : 'clientHeight', height);
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

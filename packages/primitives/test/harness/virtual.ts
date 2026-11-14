import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import {
  type ItemSize,
  type VirtualAlign,
  type VirtualAnchor,
  type VirtualAxis,
  type VirtualFrame,
  type VirtualList,
  type VirtualSize,
} from '../../src';
import VirtualListHost from '../fixtures/VirtualListHost.vue';

export interface VirtualHarnessOptions {
  readonly count?: number;
  readonly itemSize?: ItemSize;
  readonly overscan?: number;
  readonly height?: number;
  readonly initialCount?: number;
  readonly pinned?: number;
  readonly frozen?: number;
  readonly enabled?: boolean;
  readonly axis?: VirtualAxis;
  readonly maxSize?: number;
  readonly inset?: number;
  readonly dir?: 'ltr' | 'rtl';
  readonly listen?: boolean;
}

type HostWrapper = VueWrapper<InstanceType<typeof VirtualListHost>>;

interface SpacerStyles {
  readonly lead: string;
  readonly rest: string;
}

interface HarnessView {
  readonly axis: VirtualAxis;
  readonly renders: readonly SpacerStyles[];
}

const spacersOf = (element: HTMLElement): SpacerStyles => ({
  lead: element.style.getPropertyValue('--_window-lead'),
  rest: element.style.getPropertyValue('--_window-rest'),
});

const defineSize = (element: HTMLElement, name: string, value: number): void => {
  Object.defineProperty(element, name, { value, configurable: true, writable: true });
};

export class VirtualHarness {
  static mount({ height = 200, ...options }: VirtualHarnessOptions = {}): VirtualHarness {
    const axis = options.axis ?? 'y';
    const renders: SpacerStyles[] = [];

    const wrapper = mount(VirtualListHost, {
      props: {
        ...options,
        count: options.count ?? 1000,
        itemSize: options.itemSize ?? 20,
        axis,
        onAttach: (element: HTMLElement) => {
          defineSize(element, axis === 'x' ? 'clientWidth' : 'clientHeight', height);
        },
        onRender: (element: HTMLElement) => {
          renders.push(spacersOf(element));
        },
      },
      attachTo: document.body,
    });

    return new VirtualHarness(wrapper, { axis, renders });
  }

  async settle(): Promise<void> {
    await nextTick();
  }

  private constructor(
    private readonly wrapper: HostWrapper,
    private readonly view: HarnessView,
  ) {}

  private get list(): VirtualList {
    return this.wrapper.vm.virtual;
  }

  private get axis(): VirtualAxis {
    return this.view.axis;
  }

  private get renders(): readonly SpacerStyles[] {
    return this.view.renders;
  }

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

  get windowOrigin(): number {
    return this.list.windowOrigin.value;
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

  indexAt(position: number): number {
    return this.list.indexAt(position);
  }

  rowTransform(index: number): string {
    return this.wrapper.find<HTMLElement>(`.row[data-index="${index}"]`).element.style.transform;
  }

  async scroll(px: number): Promise<void> {
    defineSize(this.element, this.axis === 'x' ? 'scrollLeft' : 'scrollTop', px);
    this.element.dispatchEvent(new Event('scroll'));
    await nextTick();
  }

  async wheel(delta: number, steps: number): Promise<void> {
    const end = Math.max(0, this.list.canvasSize.value - this.list.viewport.value);

    for (let step = 0; step < steps; step += 1) {
      await this.scroll(Math.min(end, Math.max(0, this.elementScroll + delta)));
    }
  }

  async scrollToIndex(index: number, align?: VirtualAlign): Promise<void> {
    this.list.scrollTo(index, { align });
    await nextTick();
  }

  get anchor(): VirtualAnchor {
    return this.list.anchor();
  }

  async scrollToAnchor(anchor: VirtualAnchor, itemSize?: ItemSize): Promise<void> {
    this.list.scrollToAnchor(anchor);

    if (itemSize === undefined) {
      await nextTick();
      return;
    }

    await this.wrapper.setProps({ itemSize });
  }

  async measure(): Promise<void> {
    this.list.measure();
    await nextTick();
  }

  async resizeRows(sizes: readonly VirtualSize[]): Promise<boolean> {
    const changed = this.list.resize(sizes);

    await nextTick();
    return changed;
  }

  async resize(height: number): Promise<void> {
    defineSize(this.element, this.axis === 'x' ? 'clientWidth' : 'clientHeight', height);
    this.list.measure();
    await nextTick();
  }

  async setCount(count: number): Promise<void> {
    await this.wrapper.setProps({ count });
  }

  async setItemSize(size: ItemSize): Promise<void> {
    await this.wrapper.setProps({ itemSize: size });
  }

  async pin(index: number | undefined): Promise<void> {
    await this.wrapper.setProps({ pinned: index });
  }

  async freeze(count: number | undefined): Promise<void> {
    await this.wrapper.setProps({ frozen: count });
  }

  unmount(): void {
    this.wrapper.unmount();
  }
}

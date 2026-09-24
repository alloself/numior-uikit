import { mount, type DOMWrapper, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, ref, type Ref } from 'vue';
import { NuiPagination, type NuiPaginationProps } from '../../src';
import { choosePageSize } from '../support/page-size';
import { TopLayerStubs } from '../support/top-layer';
import { ComponentDriver } from './component';

export interface PaginationMountOptions {
  readonly props: NuiPaginationProps;
  readonly page?: number;
  readonly pageSize?: number;
}

export class PaginationDriver extends ComponentDriver {
  protected readonly block = 'nui-pagination';

  static mount({ props, page = 1, pageSize = 20 }: PaginationMountOptions) {
    const stubs = new TopLayerStubs();
    const pageModel = ref(page);
    const sizeModel = ref(pageSize);

    const Host = defineComponent({
      setup: () => () =>
        h(NuiPagination, {
          ...props,
          page: pageModel.value,
          pageSize: sizeModel.value,
          'onUpdate:page': (value: number) => {
            pageModel.value = value;
          },
          'onUpdate:pageSize': (value: number) => {
            sizeModel.value = value;
          },
        }),
    });

    return new PaginationDriver(
      mount(Host, { attachTo: document.body }),
      stubs,
      pageModel,
      sizeModel,
    );
  }

  private constructor(
    wrapper: VueWrapper,
    private readonly stubs: TopLayerStubs,
    private readonly pageModel: Ref<number>,
    private readonly sizeModel: Ref<number>,
  ) {
    super(wrapper);
  }

  get nav(): DOMWrapper<HTMLElement> {
    return this.wrapper.find<HTMLElement>('nav');
  }

  get page(): number {
    return this.pageModel.value;
  }

  get pageSize(): number {
    return this.sizeModel.value;
  }

  get entries(): string[] {
    return this.wrapper
      .findAll('.nui-pagination__item--page, .nui-pagination__item--ellipsis')
      .map((item) => item.text());
  }

  get currentPage(): string | undefined {
    const current = this.wrapper.find('[aria-current="page"]');
    return current.exists() ? current.text() : undefined;
  }

  get rangeText(): string {
    return this.wrapper.find('.nui-pagination__range').text();
  }

  get statusText(): string {
    return this.wrapper.find('.nui-pagination__status').text();
  }

  get hrefs(): Array<string | undefined> {
    return this.wrapper.findAll('.nui-pagination__page').map((page) => page.attributes('href'));
  }

  private control(selector: string): DOMWrapper<HTMLElement> {
    return this.wrapper.find<HTMLElement>(selector);
  }

  get previousDisabled(): boolean {
    return this.control('.nui-pagination__previous').attributes('disabled') !== undefined;
  }

  get nextDisabled(): boolean {
    return this.control('.nui-pagination__next').attributes('disabled') !== undefined;
  }

  get edgeControls(): number {
    return this.wrapper.findAll('.nui-pagination__item--edge').length;
  }

  labelOfPage(page: number): string | undefined {
    return this.pageControl(page).attributes('aria-label');
  }

  private pageControl(page: number): DOMWrapper<HTMLElement> {
    const found = this.wrapper
      .findAll<HTMLElement>('.nui-pagination__page')
      .find((control) => control.text() === String(page));

    if (!found) {
      throw new Error(`Page ${page} is not rendered`);
    }
    return found;
  }

  async clickPage(page: number): Promise<void> {
    await this.pageControl(page).trigger('click');
  }

  async clickPrevious(): Promise<void> {
    await this.control('.nui-pagination__previous').trigger('click');
  }

  async clickNext(): Promise<void> {
    await this.control('.nui-pagination__next').trigger('click');
  }

  async clickEdge(which: 'first' | 'last'): Promise<void> {
    const edges = this.wrapper.findAll<HTMLElement>('.nui-pagination__item--edge button');
    const edge = which === 'first' ? edges[0] : edges.at(-1);
    if (!edge) {
      throw new Error(`No ${which} control`);
    }
    await edge.trigger('click');
  }

  async choosePageSize(size: number): Promise<void> {
    await choosePageSize(this.wrapper, size);
  }

  override unmount(): void {
    this.stubs.restore();
    super.unmount();
  }
}

import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { createNuiConfig, type NuiConfigOptions } from '@numior/primitives';
import { nextTick } from 'vue';
import { NuiChart, type ChartSpec, type NuiChartProps } from '../../src';

export interface ChartMountOptions {
  readonly spec: ChartSpec;
  readonly label?: string;
  readonly props?: Omit<NuiChartProps, 'spec' | 'label'>;
  readonly config?: NuiConfigOptions;
}

const SLOT = /nui-chart__bar--slot-(\d)/;

const textsOf = (wrapper: VueWrapper, selector: string): string[] =>
  wrapper.findAll(selector).map((item) => item.text());

export class ChartDriver {
  private constructor(private readonly wrapper: VueWrapper) {}

  static mount({ spec, label = 'Revenue', props = {}, config }: ChartMountOptions): ChartDriver {
    return new ChartDriver(
      mount(NuiChart, {
        props: { spec, label, ...props },
        global: { plugins: config === undefined ? [] : [createNuiConfig(config)] },
        attachTo: document.body,
      }),
    );
  }

  get label(): string | undefined {
    return this.wrapper.find('.nui-chart').attributes('aria-label');
  }

  get legend(): string[] {
    return textsOf(this.wrapper, '.nui-chart__legend-item');
  }

  get legendLabel(): string | undefined {
    return this.wrapper.find('.nui-chart__legend').attributes('aria-label');
  }

  get barSlots(): number[] {
    return this.wrapper
      .findAll('.nui-chart__bar')
      .map((bar) => Number(SLOT.exec(bar.attributes('class') ?? '')?.[1] ?? -1));
  }

  get valueTicks(): string[] {
    return textsOf(this.wrapper, '.nui-chart__text--value-tick');
  }

  get categoryTicks(): string[] {
    return textsOf(this.wrapper, '.nui-chart__text--category-tick');
  }

  categoryTickX(text: string): number {
    const tick = this.wrapper
      .findAll('.nui-chart__text--category-tick')
      .find((item) => item.text() === text);

    return Number(tick?.attributes('x') ?? Number.NaN);
  }

  get caption(): string {
    return this.wrapper.find('.nui-chart__caption').text();
  }

  get tableHeaders(): string[] {
    return textsOf(this.wrapper, '.nui-chart__table thead th');
  }

  get tableRows(): string[][] {
    return this.wrapper
      .findAll('.nui-chart__table tbody tr')
      .map((row) => row.findAll('th, td').map((cell) => cell.text()));
  }

  get tableShown(): boolean {
    return this.wrapper.find('.nui-chart__data').classes().includes('nui-chart__data--shown');
  }

  get empty(): string | undefined {
    const notice = this.wrapper.find('.nui-chart__empty');

    return notice.exists() ? notice.text() : undefined;
  }

  get drawn(): boolean {
    return this.wrapper.find('.nui-chart__svg').exists();
  }

  async show(spec: ChartSpec): Promise<void> {
    await this.wrapper.setProps({ spec });
    await nextTick();
  }

  async setDocumentDirection(dir: 'ltr' | 'rtl'): Promise<void> {
    document.documentElement.dir = dir;
    await flushPromises();
  }

  unmount(): void {
    this.wrapper.unmount();
  }
}

import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { renderToString } from 'vue/server-renderer';
import { createNuiConfig, type NuiConfigOptions } from '@numior/primitives';
import { createSSRApp, nextTick } from 'vue';
import { NuiChart, type ChartHit, type ChartSpec, type NuiChartProps } from '../../src';

export interface ChartMountOptions {
  readonly spec: ChartSpec;
  readonly label?: string;
  readonly props?: Omit<NuiChartProps, 'spec' | 'label'>;
  readonly config?: NuiConfigOptions;
}

export interface ChartTooltipView {
  readonly title: string;
  readonly rows: readonly string[];
  readonly shown: boolean;
}

const BAR_SLOT = /nui-chart__bar--slot-(\d)/;

const STROKE_SLOT = /nui-chart__stroke--slot-(\d)/;

const AREA_SLOT = /nui-chart__area--slot-(\d)/;

const SLICE_SLOT = /nui-chart__slice--slot-(\d)/;

const textsOf = (wrapper: VueWrapper, selector: string): string[] =>
  wrapper.findAll(selector).map((item) => item.text());

export class ChartDriver {
  readonly selections: (ChartHit | null)[] = [];

  private readonly wrapper: VueWrapper;

  private constructor({ spec, label = 'Revenue', props = {}, config }: ChartMountOptions) {
    this.wrapper = mount(NuiChart, {
      props: {
        spec,
        label,
        ...props,
        selected: null,
        'onUpdate:selected': (hit: ChartHit | null) => {
          this.selections.push(hit);
          void this.wrapper.setProps({ selected: hit });
        },
      },
      global: { plugins: config === undefined ? [] : [createNuiConfig(config)] },
      attachTo: document.body,
    });
  }

  static mount(options: ChartMountOptions): ChartDriver {
    return new ChartDriver(options);
  }

  static async hydrate(spec: ChartSpec, dir: 'ltr' | 'rtl'): Promise<readonly string[]> {
    const host = document.createElement('div');
    const warnings: string[] = [];

    host.innerHTML = await renderToString(createSSRApp(NuiChart, { spec, label: 'Revenue' }));
    document.body.append(host);
    document.documentElement.dir = dir;

    const app = createSSRApp(NuiChart, { spec, label: 'Revenue' });

    app.config.warnHandler = (message) => {
      warnings.push(message);
    };

    app.mount(host);
    await flushPromises();
    app.unmount();
    host.remove();
    return warnings;
  }

  get tooltip(): ChartTooltipView | undefined {
    const tooltip = this.wrapper.find('.nui-chart__tooltip');

    return tooltip.exists()
      ? {
          title: tooltip.find('.nui-chart__tooltip-title').text(),
          rows: tooltip
            .findAll('.nui-chart__tooltip-row')
            .map(
              (row) =>
                `${row.find('.nui-chart__tooltip-name').text()} ${row.find('.nui-chart__tooltip-value').text()}`,
            ),
          shown: tooltip.classes().includes('nui-chart__tooltip--shown'),
        }
      : undefined;
  }

  get announcement(): string {
    return this.wrapper.find('.nui-chart__live').text();
  }

  get mutedMarks(): number {
    return this.wrapper.findAll(
      '.nui-chart__bar--muted, .nui-chart__slice--muted, .nui-chart__point--muted',
    ).length;
  }

  get activePoints(): number {
    return this.wrapper.findAll('.nui-chart__point--active').length;
  }

  get crosshairX(): number | undefined {
    const line = this.wrapper.find('.nui-chart__crosshair');

    return line.exists() ? Number(line.attributes('x1')) : undefined;
  }

  get focusable(): boolean {
    return this.wrapper.find('.nui-chart').attributes('tabindex') === '0';
  }

  async hover(x: number, y: number): Promise<void> {
    await this.pointAt('pointermove', x, y);
  }

  async leave(): Promise<void> {
    await this.wrapper.find('.nui-chart__frame').trigger('pointerleave');
  }

  async clickAt(x: number, y: number): Promise<void> {
    await this.pointAt('click', x, y);
  }

  private async pointAt(type: 'pointermove' | 'click', x: number, y: number): Promise<void> {
    this.wrapper
      .find('.nui-chart__frame')
      .element.dispatchEvent(new MouseEvent(type, { clientX: x, clientY: y, bubbles: true }));

    await nextTick();
  }

  async press(key: string): Promise<void> {
    await this.wrapper.find('.nui-chart').trigger('keydown', { key });
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
    return this.slotsOf('.nui-chart__bar', BAR_SLOT);
  }

  get strokeSlots(): number[] {
    return this.slotsOf('.nui-chart__stroke', STROKE_SLOT);
  }

  get areaSlots(): number[] {
    return this.slotsOf('.nui-chart__area', AREA_SLOT);
  }

  get sliceSlots(): number[] {
    return this.slotsOf('.nui-chart__slice', SLICE_SLOT);
  }

  get markerCount(): number {
    return this.wrapper.findAll('.nui-chart__point').length;
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

  private slotsOf(selector: string, pattern: RegExp): number[] {
    return this.wrapper
      .findAll(selector)
      .map((mark) => Number(pattern.exec(mark.attributes('class') ?? '')?.[1] ?? -1));
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

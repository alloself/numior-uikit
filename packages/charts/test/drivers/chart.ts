import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { vi } from 'vite-plus/test';
import { renderToString } from 'vue/server-renderer';
import { createNuiConfig, type Direction, type NuiConfigOptions } from '@numior/primitives';
import { createSSRApp, nextTick, shallowRef, toValue, type ShallowRef } from 'vue';
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

const THEME_STYLE_ID = 'chart-theme';

const DEFAULT_FONT_SIZE = 12;

const fontRule = (size: number): string =>
  `.nui-chart__font-probe { font-size: ${String(size)}px; }`;

const themeStyle = (): HTMLStyleElement => {
  const existing = document.getElementById(THEME_STYLE_ID);

  if (existing instanceof HTMLStyleElement) {
    return existing;
  }

  const style = document.createElement('style');

  style.id = THEME_STYLE_ID;
  style.textContent = fontRule(DEFAULT_FONT_SIZE);
  document.head.append(style);
  return style;
};

const textsOf = (wrapper: VueWrapper, selector: string): string[] =>
  wrapper.findAll(selector).map((item) => item.text());

export class ChartTheme {
  private readonly resized = new Set<ResizeObserverCallback>();

  readonly observed: Node[] = [];

  static install(): ChartTheme {
    return new ChartTheme();
  }

  private constructor() {
    const { resized, observed } = this;
    const NativeMutationObserver = MutationObserver;

    vi.stubGlobal(
      'ResizeObserver',
      class implements ResizeObserver {
        constructor(private readonly callback: ResizeObserverCallback) {}

        observe(): void {
          resized.add(this.callback);
        }

        unobserve(): void {
          resized.delete(this.callback);
        }

        disconnect(): void {
          resized.delete(this.callback);
        }
      },
    );

    vi.stubGlobal(
      'MutationObserver',
      class extends NativeMutationObserver {
        override observe(target: Node, options?: MutationObserverInit): void {
          observed.push(target);
          super.observe(target, options);
        }
      },
    );
  }

  async setFontSize(size: number): Promise<void> {
    themeStyle().textContent = fontRule(size);
    await this.restyle();
  }

  async setPageDirection(dir: Direction): Promise<void> {
    document.documentElement.dir = dir;
    await this.restyle();
  }

  private async restyle(): Promise<void> {
    for (const callback of this.resized) {
      callback([], new ResizeObserver(callback));
    }

    await nextTick();
  }

  static reset(): void {
    themeStyle().textContent = fontRule(DEFAULT_FONT_SIZE);
    vi.unstubAllGlobals();
  }
}

export class ChartDriver {
  readonly selections: (ChartHit | null)[] = [];

  private readonly wrapper: VueWrapper;

  private readonly direction: ShallowRef<Direction | undefined>;

  private constructor({ spec, label = 'Revenue', props = {}, config }: ChartMountOptions) {
    this.direction = shallowRef(toValue(config?.dir));
    themeStyle();

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
      global: {
        plugins: config === undefined ? [] : [createNuiConfig({ ...config, dir: this.direction })],
      },
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

  async rightClick(): Promise<void> {
    await this.wrapper.find('.nui-chart__frame').trigger('contextmenu');
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
    return this.slotsOf('.nui-chart__stroke:not(.nui-chart__stroke--gap)', STROKE_SLOT);
  }

  get gapSlots(): number[] {
    return this.slotsOf('.nui-chart__stroke--gap', STROKE_SLOT);
  }

  get areaSlots(): number[] {
    return this.slotsOf('.nui-chart__area', AREA_SLOT);
  }

  get sliceSlots(): number[] {
    return this.slotsOf('.nui-chart__slice', SLICE_SLOT);
  }

  get clippedMarks(): number {
    const clip = this.wrapper.find('clipPath');

    return clip.exists()
      ? this.wrapper.findAll(`[clip-path="url(#${clip.attributes('id') ?? ''})"] > path`).length
      : 0;
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

  async settle(): Promise<void> {
    await nextTick();
  }

  get sceneHeight(): number {
    return Number(this.wrapper.find('.nui-chart__svg').attributes('height'));
  }

  get fills(): boolean {
    const figure = this.wrapper.find('.nui-chart');

    return figure.classes('nui-chart--fill') && figure.attributes('style') === undefined;
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

  async setDirection(dir: Direction): Promise<void> {
    this.direction.value = dir;
    await nextTick();
  }

  unmount(): void {
    this.wrapper.unmount();
  }
}

import { flushPromises, mount, type DOMWrapper, type VueWrapper } from '@vue/test-utils';
import { createNuiConfig, type NuiConfigOptions } from '@numior/primitives';
import {
  defineComponent,
  h,
  nextTick,
  shallowRef,
  type Plugin,
  type ShallowRef,
  type Slots,
} from 'vue';
import { dismissPopoverNatively, TopLayerStubs } from '../../../vue/test/support/top-layer';
import {
  NuiDataGrid,
  type GridSort,
  type NuiDataGridFilters,
  type NuiDataGridExposed,
  type NuiDataGridProps,
  type NuiGridColumn,
} from '../../src';

export interface DataGridMountOptions<T> {
  readonly columns: readonly NuiGridColumn<T>[];
  readonly source: readonly T[];
  readonly props?: Omit<NuiDataGridProps<T>, 'columns' | 'source'>;
  readonly sort?: readonly GridSort[];
  readonly filters?: NuiDataGridFilters;
  readonly slots?: Slots;
  readonly width?: number;
  readonly height?: number;
  readonly dir?: 'ltr' | 'rtl';
  readonly config?: NuiConfigOptions;
}

export interface CellPosition {
  readonly row: number;
  readonly col: number;
}

interface GridModels {
  readonly sort: ShallowRef<readonly GridSort[]>;
  readonly filters: ShallowRef<NuiDataGridFilters>;
  readonly quick: ShallowRef<string>;
}

interface GridEvents {
  settled: number;
  progress: number;
  readonly waiters: Array<() => void>;
}

export interface KeyOptions {
  readonly ctrl?: boolean;
  readonly shift?: boolean;
  readonly alt?: boolean;
}

const defineValue = (element: HTMLElement, name: string, value: number): void => {
  Object.defineProperty(element, name, { value, configurable: true, writable: true });
};

const isExposed = (value: unknown): value is NuiDataGridExposed =>
  typeof value === 'object' &&
  value !== null &&
  'scrollToRow' in value &&
  typeof value.scrollToRow === 'function' &&
  'scrollToColumn' in value &&
  typeof value.scrollToColumn === 'function';

const numberAttribute = (element: Element | null | undefined, name: string): number =>
  Number(element?.getAttribute(name) ?? Number.NaN);

const positionOf = (cell: Element | null): CellPosition | undefined => {
  if (cell === null || !cell.matches('.nui-grid__cell')) {
    return undefined;
  }
  return {
    row: numberAttribute(cell.closest('[role="row"]'), 'aria-rowindex') - 2,
    col: numberAttribute(cell, 'aria-colindex') - 1,
  };
};

export class DataGridDriver<T> {
  static mount<T>(options: DataGridMountOptions<T>): DataGridDriver<T> {
    const source = shallowRef(options.source);
    const sort = shallowRef<readonly GridSort[]>(options.sort ?? []);
    const filters = shallowRef<NuiDataGridFilters>(options.filters ?? []);
    const quick = shallowRef('');
    const stubs = new TopLayerStubs();
    const exposed = shallowRef<NuiDataGridExposed | null>(null);
    const events: GridEvents = { settled: 0, progress: 0, waiters: [] };

    const setExposed = (value: unknown): void => {
      exposed.value = isExposed(value) ? value : null;
    };

    const Host = defineComponent({
      setup: () => () =>
        h('div', { dir: options.dir ?? 'ltr' }, [
          h(
            NuiDataGrid<T>,
            {
              ...options.props,
              columns: options.columns,
              source: source.value,
              sort: sort.value,
              'onUpdate:sort': (next: readonly GridSort[]) => {
                sort.value = next;
              },
              filters: filters.value,
              'onUpdate:filters': (next: NuiDataGridFilters) => {
                filters.value = next;
              },
              quick: quick.value,
              'onUpdate:quick': (next: string) => {
                quick.value = next;
              },
              onSettle: () => {
                events.settled += 1;

                for (const resolve of events.waiters.splice(0)) {
                  resolve();
                }
              },
              onProgress: () => {
                events.progress += 1;
              },
              ref: setExposed,
            },
            options.slots,
          ),
        ]),
    });

    const plugins: Plugin[] = options.config === undefined ? [] : [createNuiConfig(options.config)];
    const wrapper = mount(Host, { attachTo: document.body, global: { plugins } });

    const driver = new DataGridDriver<T>(
      wrapper,
      source,
      { sort, filters, quick },
      exposed,
      events,
      stubs,
    );

    driver.size(options.width ?? 500, options.height ?? 300);
    return driver;
  }

  private constructor(
    private readonly wrapper: VueWrapper,
    private readonly source: ShallowRef<readonly T[]>,
    private readonly models: GridModels,
    private readonly exposed: ShallowRef<NuiDataGridExposed | null>,
    private readonly events: GridEvents,
    private readonly stubs: TopLayerStubs,
  ) {}

  private nextSettle(): Promise<void> {
    return new Promise((resolve) => {
      this.events.waiters.push(resolve);
    });
  }

  private get element(): HTMLElement {
    return this.viewport.element;
  }

  private size(width: number, height: number): void {
    defineValue(this.element, 'clientWidth', width);
    defineValue(this.element, 'clientHeight', height);
    defineValue(this.element, 'scrollTop', 0);
    defineValue(this.element, 'scrollLeft', 0);
    this.element.dispatchEvent(new Event('scroll'));
  }

  get viewport(): DOMWrapper<HTMLElement> {
    return this.wrapper.find<HTMLElement>('.nui-grid__viewport');
  }

  get rowCount(): number {
    return numberAttribute(this.element, 'aria-rowcount');
  }

  get colCount(): number {
    return numberAttribute(this.element, 'aria-colcount');
  }

  get label(): string | undefined {
    return this.viewport.attributes('aria-label');
  }

  get scrollTop(): number {
    return this.element.scrollTop;
  }

  get scrollLeft(): number {
    return this.element.scrollLeft;
  }

  get renderedRows(): number[] {
    return this.wrapper
      .findAll('.nui-grid__body > [role="row"]')
      .map((row) => numberAttribute(row.element, 'aria-rowindex') - 2);
  }

  get headerTexts(): string[] {
    return this.wrapper.findAll('[role="columnheader"]').map((cell) => cell.text());
  }

  get activeCell(): CellPosition | undefined {
    return positionOf(this.element.querySelector('.nui-grid__cell[tabindex="0"]'));
  }

  get focusedCell(): CellPosition | undefined {
    return positionOf(document.activeElement);
  }

  get sort(): readonly GridSort[] {
    return this.models.sort.value;
  }

  get filters(): NuiDataGridFilters {
    return this.models.filters.value;
  }

  private get popover(): HTMLElement | null {
    return document.querySelector<HTMLElement>('.nui-grid-filter');
  }

  get filterTitle(): string | undefined {
    return this.popover?.querySelector('.nui-grid-filter__title')?.textContent?.trim();
  }

  get filterFocused(): boolean {
    return this.popover?.contains(document.activeElement) ?? false;
  }

  get filterValueLabels(): string[] {
    return [...(this.popover?.querySelectorAll('.nui-grid-filter__values label') ?? [])].map(
      (label) => label.textContent?.trim() ?? '',
    );
  }

  filterButton(col: number): HTMLElement | null {
    return this.header(col)?.querySelector<HTMLElement>('.nui-grid__filter') ?? null;
  }

  filterActive(col: number): boolean {
    return this.filterButton(col)?.classList.contains('nui-grid__filter--active') ?? false;
  }

  filterExpanded(col: number): boolean {
    return this.filterButton(col)?.getAttribute('aria-expanded') === 'true';
  }

  filterValue(label: string): string | undefined {
    return this.filterInput(label)?.value;
  }

  private filterInput(label: string): HTMLInputElement | undefined {
    const inputs = this.popover?.querySelectorAll<HTMLInputElement>('input') ?? [];

    return [...inputs].find((input) =>
      [...(input.labels ?? [])].some((entry) => entry.textContent?.trim() === label),
    );
  }

  get settledRuns(): number {
    return this.events.settled;
  }

  get progressReports(): number {
    return this.events.progress;
  }

  get announcement(): string {
    return this.wrapper.find('[role="status"]').text();
  }

  get busy(): boolean {
    return this.viewport.attributes('aria-busy') === 'true';
  }

  get sortOrders(): string[] {
    return this.wrapper.findAll('.nui-grid__sort-order').map((order) => order.text());
  }

  ariaSort(col: number): string | undefined {
    return this.header(col)?.getAttribute('aria-sort') ?? undefined;
  }

  sortable(col: number): boolean {
    return this.header(col)?.classList.contains('nui-grid__cell--sortable') ?? false;
  }

  private header(col: number): HTMLElement | null {
    return this.element.querySelector<HTMLElement>(
      `[role="columnheader"][aria-colindex="${col + 1}"]`,
    );
  }

  get emptyText(): string | undefined {
    const empty = this.wrapper.find('.nui-grid__empty');
    return empty.exists() ? empty.text() : undefined;
  }

  private row(position: number): Element | null {
    return this.element.querySelector(`[role="row"][aria-rowindex="${position + 2}"]`);
  }

  cell(position: number, col: number): HTMLElement | null {
    return this.row(position)?.querySelector<HTMLElement>(`[aria-colindex="${col + 1}"]`) ?? null;
  }

  cellText(position: number, col: number): string | undefined {
    return this.cell(position, col)?.textContent?.trim();
  }

  cellHtml(position: number, col: number): string | undefined {
    return this.cell(position, col)?.innerHTML;
  }

  paneOf(position: number, col: number): string | undefined {
    const pane = this.cell(position, col)?.closest('.nui-grid__pane');
    return ['start', 'centre', 'end'].find((name) =>
      pane?.classList.contains(`nui-grid__pane--${name}`),
    );
  }

  rowTransform(position: number): string | undefined {
    const row = this.row(position);
    return row instanceof HTMLElement ? row.style.transform : undefined;
  }

  async settle(): Promise<void> {
    await nextTick();
  }

  async scroll(position: { readonly top?: number; readonly left?: number }): Promise<void> {
    if (position.top !== undefined) {
      defineValue(this.element, 'scrollTop', position.top);
    }
    if (position.left !== undefined) {
      defineValue(this.element, 'scrollLeft', position.left);
    }
    this.element.dispatchEvent(new Event('scroll'));
    await nextTick();
  }

  async focusCell(position: number, col: number): Promise<void> {
    this.cell(position, col)?.focus();
    await nextTick();
  }

  async press(key: string, options: KeyOptions = {}): Promise<void> {
    const target = document.activeElement ?? this.element;

    target.dispatchEvent(
      new KeyboardEvent('keydown', {
        key,
        ctrlKey: options.ctrl ?? false,
        shiftKey: options.shift ?? false,
        altKey: options.alt ?? false,
        bubbles: true,
        cancelable: true,
      }),
    );

    await nextTick();
  }

  async clickHeader(col: number, options: KeyOptions = {}): Promise<void> {
    this.header(col)?.dispatchEvent(
      new MouseEvent('click', { bubbles: true, shiftKey: options.shift ?? false }),
    );

    await nextTick();
  }

  async sortBy(col: number, options: KeyOptions = {}): Promise<void> {
    const settled = this.nextSettle();

    this.header(col)?.dispatchEvent(
      new MouseEvent('click', { bubbles: true, shiftKey: options.shift ?? false }),
    );

    await settled;
    await nextTick();
  }

  async pressAndSettle(key: string, options: KeyOptions = {}): Promise<void> {
    const settled = this.nextSettle();

    (document.activeElement ?? this.element).dispatchEvent(
      new KeyboardEvent('keydown', {
        key,
        shiftKey: options.shift ?? false,
        bubbles: true,
        cancelable: true,
      }),
    );

    await settled;
    await nextTick();
  }

  async openFilter(col: number): Promise<void> {
    this.filterButton(col)?.click();
    await flushPromises();
  }

  async dismissFilter(): Promise<void> {
    const popover = this.popover;

    if (popover !== null) {
      dismissPopoverNatively(popover);
    }
    await nextTick();
  }

  async typeInFilter(label: string, value: string): Promise<void> {
    const input = this.filterInput(label);

    if (input !== undefined) {
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('blur'));
    }
    await nextTick();
  }

  async chooseValue(label: string): Promise<void> {
    const option = [
      ...(this.popover?.querySelectorAll<HTMLElement>('.nui-grid-filter__values label') ?? []),
    ].find((entry) => entry.textContent?.trim() === label);

    option?.querySelector<HTMLInputElement>('input')?.click();
    await nextTick();
  }

  async applyFilter(): Promise<void> {
    const settled = this.nextSettle();

    this.popover
      ?.querySelector('form')
      ?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    await settled;
    await nextTick();
  }

  async resetFilter(): Promise<void> {
    const settled = this.nextSettle();

    const buttons = this.popover?.querySelectorAll<HTMLButtonElement>(
      '.nui-grid-filter__actions button',
    );

    buttons?.[0]?.click();
    await settled;
    await nextTick();
  }

  async setQuick(text: string): Promise<void> {
    const settled = this.nextSettle();

    this.models.quick.value = text;
    await settled;
    await nextTick();
  }

  async setSort(next: readonly GridSort[]): Promise<void> {
    const settled = this.nextSettle();

    this.models.sort.value = next;
    await settled;
    await nextTick();
  }

  async setSource(rows: readonly T[]): Promise<void> {
    this.source.value = rows;
    await nextTick();
  }

  async scrollToRow(position: number): Promise<void> {
    this.exposed.value?.scrollToRow(position);
    await nextTick();
  }

  async scrollToColumn(key: string): Promise<void> {
    this.exposed.value?.scrollToColumn(key);
    await nextTick();
  }

  unmount(): void {
    this.wrapper.unmount();
    this.stubs.restore();
  }
}

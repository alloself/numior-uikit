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
import { choosePageSize } from '../../../vue/test/support/page-size';
import { dismissPopoverNatively, TopLayerStubs } from '../../../vue/test/support/top-layer';
import {
  NuiTable,
  type TableNodeId,
  type TableSort,
  type NuiTableFilters,
  type NuiTableExposed,
  type NuiTableHidden,
  type NuiTablePins,
  type NuiTableProps,
  type NuiTableColumnDef,
} from '../../src';

export interface TableMountOptions<T> {
  readonly columns: readonly NuiTableColumnDef<T>[];
  readonly rows: readonly T[];
  readonly props?: Omit<NuiTableProps<T>, 'columns' | 'rows'>;
  readonly sort?: readonly TableSort[];
  readonly filters?: NuiTableFilters;
  readonly groupBy?: readonly string[];
  readonly expanded?: readonly TableNodeId[];
  readonly pins?: NuiTablePins;
  readonly hidden?: NuiTableHidden;
  readonly selected?: readonly T[];
  readonly page?: number;
  readonly pageSize?: number;
  readonly slots?: Slots;
  readonly width?: number;
  readonly height?: number;
  readonly auto?: boolean;
  readonly dir?: 'ltr' | 'rtl';
  readonly config?: NuiConfigOptions;
}

type MountDefaults = Required<
  Pick<
    TableMountOptions<never>,
    'sort' | 'filters' | 'groupBy' | 'expanded' | 'pins' | 'hidden' | 'width' | 'height' | 'dir'
  >
>;

const MOUNT_DEFAULTS: MountDefaults = {
  sort: [],
  filters: [],
  groupBy: [],
  expanded: [],
  pins: {},
  hidden: [],
  width: 500,
  height: 300,
  dir: 'ltr',
};

const pluginsOf = (config: NuiConfigOptions | undefined): Plugin[] =>
  config === undefined ? [] : [createNuiConfig(config)];

export interface CellPosition {
  readonly row: number;
  readonly col: number;
}

export interface SelectAllState {
  readonly checked: boolean;
  readonly indeterminate: boolean;
  readonly disabled: boolean;
}

interface TableModels<T> {
  readonly sort: ShallowRef<readonly TableSort[]>;
  readonly filters: ShallowRef<NuiTableFilters>;
  readonly quick: ShallowRef<string>;
  readonly groupBy: ShallowRef<readonly string[]>;
  readonly expanded: ShallowRef<readonly TableNodeId[]>;
  readonly pins: ShallowRef<NuiTablePins>;
  readonly hidden: ShallowRef<NuiTableHidden>;
  readonly selected: ShallowRef<readonly T[]>;
  readonly page: ShallowRef<number>;
  readonly pageSize: ShallowRef<number>;
}

type TableProps<T> = Omit<NuiTableProps<T>, 'columns' | 'rows'>;

interface TableEvents<T> {
  settled: number;
  progress: number;
  readonly loads: T[];
  readonly clicks: T[];
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

const isExposed = (value: unknown): value is NuiTableExposed =>
  typeof value === 'object' &&
  value !== null &&
  'scrollToRow' in value &&
  typeof value.scrollToRow === 'function' &&
  'scrollToColumn' in value &&
  typeof value.scrollToColumn === 'function';

const numberAttribute = (element: Element | null | undefined, name: string): number =>
  Number(element?.getAttribute(name) ?? Number.NaN);

const headRowsOf = (viewport: Element): number =>
  viewport.querySelectorAll('.nui-table__header > [role="row"]').length;

const positionOf = (cell: Element | null, headRows: number): CellPosition | undefined => {
  if (cell === null || !cell.matches('.nui-table__cell')) {
    return undefined;
  }
  return {
    row: numberAttribute(cell.closest('[role="row"]'), 'aria-rowindex') - headRows - 1,
    col: numberAttribute(cell, 'aria-colindex') - 1,
  };
};

export class TableDriver<T> {
  static mount<T>(options: TableMountOptions<T>): TableDriver<T> {
    const settings = { ...MOUNT_DEFAULTS, ...options };
    const source = shallowRef(settings.rows);
    const sort = shallowRef<readonly TableSort[]>(settings.sort);
    const filters = shallowRef<NuiTableFilters>(settings.filters);
    const quick = shallowRef('');
    const groupBy = shallowRef<readonly string[]>(settings.groupBy);
    const expanded = shallowRef<readonly TableNodeId[]>(settings.expanded);
    const pins = shallowRef<NuiTablePins>(settings.pins);
    const hidden = shallowRef<NuiTableHidden>(settings.hidden);
    const selected = shallowRef<readonly T[]>(settings.selected ?? []);
    const page = shallowRef(settings.page ?? 1);
    const pageSize = shallowRef(settings.pageSize ?? 20);
    const props = shallowRef<TableProps<T>>(settings.props ?? {});
    const stubs = new TopLayerStubs();
    const exposed = shallowRef<NuiTableExposed | null>(null);
    const events: TableEvents<T> = { settled: 0, progress: 0, loads: [], clicks: [], waiters: [] };

    const setExposed = (value: unknown): void => {
      exposed.value = isExposed(value) ? value : null;
    };

    const Host = defineComponent({
      setup: () => () =>
        h('div', { dir: settings.dir }, [
          h(
            NuiTable<T>,
            {
              ...(settings.auto === true ? {} : { height: `${settings.height}px` }),
              ...props.value,
              columns: settings.columns,
              rows: source.value,
              sort: sort.value,
              'onUpdate:sort': (next: readonly TableSort[]) => {
                sort.value = next;
              },
              filters: filters.value,
              'onUpdate:filters': (next: NuiTableFilters) => {
                filters.value = next;
              },
              quick: quick.value,
              'onUpdate:quick': (next: string) => {
                quick.value = next;
              },
              groupBy: groupBy.value,
              'onUpdate:groupBy': (next: readonly string[]) => {
                groupBy.value = next;
              },
              expanded: expanded.value,
              'onUpdate:expanded': (next: readonly TableNodeId[]) => {
                expanded.value = next;
              },
              pins: pins.value,
              'onUpdate:pins': (next: NuiTablePins) => {
                pins.value = next;
              },
              hidden: hidden.value,
              'onUpdate:hidden': (next: NuiTableHidden) => {
                hidden.value = next;
              },
              selected: selected.value,
              'onUpdate:selected': (next: readonly T[]) => {
                selected.value = next;
              },
              page: page.value,
              'onUpdate:page': (next: number) => {
                page.value = next;
              },
              pageSize: pageSize.value,
              'onUpdate:pageSize': (next: number) => {
                pageSize.value = next;
              },
              onRowClick: (row: T) => {
                events.clicks.push(row);
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
              onLoad: (row: T) => {
                events.loads.push(row);
              },
              ref: setExposed,
            },
            settings.slots,
          ),
        ]),
    });

    const plugins = pluginsOf(settings.config);
    const wrapper = mount(Host, { attachTo: document.body, global: { plugins } });

    const models = {
      sort,
      filters,
      quick,
      groupBy,
      expanded,
      pins,
      hidden,
      selected,
      page,
      pageSize,
    };

    const driver = new TableDriver<T>(wrapper, source, props, models, exposed, events, stubs);

    driver.size(settings.width, settings.height);
    return driver;
  }

  private constructor(
    private readonly wrapper: VueWrapper,
    private readonly source: ShallowRef<readonly T[]>,
    private readonly props: ShallowRef<TableProps<T>>,
    private readonly models: TableModels<T>,
    private readonly exposed: ShallowRef<NuiTableExposed | null>,
    private readonly events: TableEvents<T>,
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
    return this.wrapper.find<HTMLElement>('.nui-table__viewport');
  }

  private get grid(): DOMWrapper<HTMLElement> {
    return this.wrapper.find<HTMLElement>('.nui-table__grid');
  }

  get rowCount(): number {
    return numberAttribute(this.grid.element, 'aria-rowcount');
  }

  get colCount(): number {
    return numberAttribute(this.grid.element, 'aria-colcount');
  }

  get label(): string | undefined {
    return this.grid.attributes('aria-label');
  }

  get scrollTop(): number {
    return this.element.scrollTop;
  }

  get scrollLeft(): number {
    return this.element.scrollLeft;
  }

  private get headRows(): number {
    return headRowsOf(this.element);
  }

  get renderedRows(): number[] {
    return this.wrapper
      .findAll('.nui-table__body > [role="row"]')
      .map((row) => numberAttribute(row.element, 'aria-rowindex') - this.headRows - 1);
  }

  get headerTexts(): string[] {
    return this.wrapper
      .findAll('.nui-table__row--head [role="columnheader"]')
      .map((cell) => cell.text());
  }

  get bands(): string[][] {
    return this.wrapper
      .findAll('.nui-table__row--band')
      .map((row) =>
        row
          .findAll('[role="columnheader"]')
          .map(
            (cell) =>
              `${cell.text()}:${cell.attributes('aria-colindex')}+${cell.attributes('aria-colspan')}`,
          ),
      );
  }

  get auto(): boolean {
    return this.wrapper.find('.nui-table').classes('nui-table--auto');
  }

  cellWraps(position: number, col: number): boolean {
    return this.cell(position, col)?.classList.contains('nui-table__cell--wrap') ?? false;
  }

  bandSpans(level: number): number[] {
    const row = this.wrapper.findAll('.nui-table__row--band')[level];

    return (row?.findAll('th') ?? []).map((cell) => Number(cell.attributes('colspan') ?? 1));
  }

  get activeCell(): CellPosition | undefined {
    return positionOf(this.element.querySelector('.nui-table__cell[tabindex="0"]'), this.headRows);
  }

  get focusedCell(): CellPosition | undefined {
    return positionOf(document.activeElement, this.headRows);
  }

  get sort(): readonly TableSort[] {
    return this.models.sort.value;
  }

  get filters(): NuiTableFilters {
    return this.models.filters.value;
  }

  get expanded(): readonly TableNodeId[] {
    return this.models.expanded.value;
  }

  get pins(): NuiTablePins {
    return this.models.pins.value;
  }

  get hidden(): NuiTableHidden {
    return this.models.hidden.value;
  }

  get selected(): readonly T[] {
    return this.models.selected.value;
  }

  get page(): number {
    return this.models.page.value;
  }

  get pageSize(): number {
    return this.models.pageSize.value;
  }

  get paginated(): boolean {
    return this.wrapper.find('.nui-table__pagination').exists();
  }

  get rangeText(): string | undefined {
    const range = this.wrapper.find('.nui-pagination__range');
    return range.exists() ? range.text() : undefined;
  }

  async nextPage(): Promise<void> {
    await this.wrapper.find('.nui-pagination__next').trigger('click');
    await nextTick();
  }

  async choosePageSize(size: number): Promise<void> {
    await choosePageSize(this.wrapper, size);
  }

  get clicks(): readonly T[] {
    return this.events.clicks;
  }

  get multiselectable(): boolean {
    return this.grid.attributes('aria-multiselectable') === 'true';
  }

  get skeletonRows(): number {
    return this.wrapper.findAll('.nui-table__row--skeleton').length;
  }

  get captionText(): string | undefined {
    const caption = this.wrapper.find('.nui-table__caption');
    return caption.exists() ? caption.text() : undefined;
  }

  get captionId(): string | undefined {
    const caption = this.wrapper.find('.nui-table__caption');
    return caption.exists() ? caption.attributes('id') : undefined;
  }

  get labelledBy(): string | undefined {
    return this.grid.attributes('aria-labelledby');
  }

  private selectInput(position: number): HTMLInputElement | null {
    return (
      this.row(position)?.querySelector<HTMLInputElement>('.nui-table__cell--select input') ?? null
    );
  }

  get headerCheckbox(): SelectAllState | undefined {
    const input = this.selectInput(-1);

    return input === null
      ? undefined
      : { checked: input.checked, indeterminate: input.indeterminate, disabled: input.disabled };
  }

  get selectAllLabel(): string | undefined {
    return this.selectInput(-1)?.getAttribute('aria-label') ?? undefined;
  }

  selectLabel(position: number): string | undefined {
    return this.selectInput(position)?.getAttribute('aria-label') ?? undefined;
  }

  rowSelected(position: number): boolean | undefined {
    const value = this.row(position)?.getAttribute('aria-selected');
    return value === null || value === undefined ? undefined : value === 'true';
  }

  rowChecked(position: number): boolean {
    return this.selectInput(position)?.checked ?? false;
  }

  rowPinned(position: number): boolean {
    return this.row(position)?.classList.contains('nui-table__row--pinned') ?? false;
  }

  rowOdd(position: number): boolean {
    return this.row(position)?.classList.contains('nui-table__row--odd') ?? false;
  }

  async checkRow(position: number): Promise<void> {
    this.selectInput(position)?.click();
    await nextTick();
  }

  async checkAll(): Promise<void> {
    this.selectInput(-1)?.click();
    await nextTick();
  }

  async clickRow(position: number, col: number): Promise<void> {
    this.cell(position, col)?.click();
    await nextTick();
  }

  async receive(next: Partial<TableProps<T>>): Promise<void> {
    this.props.value = { ...this.props.value, ...next };
    await nextTick();
  }

  get loads(): readonly T[] {
    return this.events.loads;
  }

  rowBusy(position: number): boolean {
    return this.row(position)?.getAttribute('aria-busy') === 'true';
  }

  treeLevel(position: number): string | undefined {
    const tree = this.row(position)?.querySelector<HTMLElement>('.nui-table__tree');
    return tree?.style.getPropertyValue('--_level');
  }

  get role(): string | undefined {
    return this.grid.attributes('role');
  }

  rowLevel(position: number): string | undefined {
    return this.row(position)?.getAttribute('aria-level') ?? undefined;
  }

  rowExpanded(position: number): string | undefined {
    return this.row(position)?.getAttribute('aria-expanded') ?? undefined;
  }

  groupLabel(position: number): string | undefined {
    const group = this.row(position)?.querySelector('.nui-table__group');

    if (group === null || group === undefined) {
      return undefined;
    }
    return [...group.querySelectorAll('.nui-table__text, .nui-table__count')]
      .map((part) => part.textContent?.trim() ?? '')
      .join(' ');
  }

  private get popover(): HTMLElement | null {
    return document.querySelector<HTMLElement>('.nui-table-filter');
  }

  get filterTitle(): string | undefined {
    return this.popover?.querySelector('.nui-table-filter__title')?.textContent?.trim();
  }

  get filterFocused(): boolean {
    return this.popover?.contains(document.activeElement) ?? false;
  }

  get filterValueLabels(): string[] {
    return [...(this.popover?.querySelectorAll('.nui-table-filter__values label') ?? [])].map(
      (label) => label.textContent?.trim() ?? '',
    );
  }

  private get columnMenu(): HTMLElement | null {
    return (
      this.element.closest('.nui-table')?.querySelector<HTMLElement>(':scope > .nui-menu') ?? null
    );
  }

  private menuEntries(): HTMLElement[] {
    const root = this.columnMenu;

    return [
      ...(root?.querySelectorAll<HTMLElement>(
        '[role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"]',
      ) ?? []),
    ];
  }

  private menuEntry(label: string): HTMLElement | undefined {
    return this.menuEntries().find(
      (entry) => entry.querySelector('.nui-menu-item__label')?.textContent?.trim() === label,
    );
  }

  get menuLabels(): string[] {
    const root = this.columnMenu;

    return this.menuEntries()
      .filter((entry) => entry.closest('.nui-menu') === root)
      .map((entry) => entry.querySelector('.nui-menu-item__label')?.textContent?.trim() ?? '');
  }

  get focusedMenuItem(): string | undefined {
    const active = document.activeElement;
    return active instanceof HTMLElement && this.columnMenu?.contains(active)
      ? active.querySelector('.nui-menu-item__label')?.textContent?.trim()
      : undefined;
  }

  menuItemState(label: string): string | undefined {
    const entry = this.menuEntry(label);
    return entry?.getAttribute('aria-checked') ?? entry?.getAttribute('aria-disabled') ?? undefined;
  }

  menuExpanded(col: number): boolean {
    return (
      this.header(col)?.querySelector('.nui-table__menu')?.getAttribute('aria-expanded') === 'true'
    );
  }

  async openColumnMenu(col: number): Promise<void> {
    this.header(col)?.querySelector<HTMLElement>('.nui-table__menu')?.click();
    await nextTick();
  }

  async chooseMenu(label: string): Promise<void> {
    this.menuEntry(label)?.click();
    await nextTick();
  }

  async chooseMenuAndSettle(label: string): Promise<void> {
    const settled = this.nextSettle();

    this.menuEntry(label)?.click();
    await settled;
    await nextTick();
  }

  filterButton(col: number): HTMLElement | null {
    return this.header(col)?.querySelector<HTMLElement>('.nui-table__filter') ?? null;
  }

  filterActive(col: number): boolean {
    return this.filterButton(col)?.classList.contains('nui-table__filter--active') ?? false;
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
    return this.grid.attributes('aria-busy') === 'true';
  }

  get sortOrders(): string[] {
    return this.wrapper.findAll('.nui-table__sort-order').map((order) => order.text());
  }

  ariaSort(col: number): string | undefined {
    return this.header(col)?.getAttribute('aria-sort') ?? undefined;
  }

  sortable(col: number): boolean {
    return this.header(col)?.classList.contains('nui-table__cell--sortable') ?? false;
  }

  private header(col: number): HTMLElement | null {
    return this.element.querySelector<HTMLElement>(
      `.nui-table__row--head [role="columnheader"][aria-colindex="${col + 1}"]`,
    );
  }

  get emptyText(): string | undefined {
    const empty = this.wrapper.find('.nui-table__empty');
    return empty.exists() ? empty.text() : undefined;
  }

  private row(position: number): Element | null {
    return this.element.querySelector(
      `[role="row"][aria-rowindex="${position + this.headRows + 1}"]`,
    );
  }

  cell(position: number, col: number): HTMLElement | null {
    return this.row(position)?.querySelector<HTMLElement>(`[aria-colindex="${col + 1}"]`) ?? null;
  }

  cellText(position: number, col: number): string | undefined {
    return this.cell(position, col)?.textContent?.trim();
  }

  cellHtml(position: number, col: number): string | undefined {
    return this.cell(position, col)?.querySelector('.nui-table__content')?.innerHTML;
  }

  paneOf(position: number, col: number): string | undefined {
    const cell = this.cell(position, col);

    if (cell === null) {
      return undefined;
    }
    if (cell.classList.contains('nui-table__cell--pin-start')) {
      return 'start';
    }
    return cell.classList.contains('nui-table__cell--pin-end') ? 'end' : 'centre';
  }

  gapBefore(position: number): string | undefined {
    const gap = this.row(position)?.previousElementSibling;

    return gap instanceof HTMLElement && gap.classList.contains('nui-table__gap')
      ? gap.style.getPropertyValue('--_gap')
      : undefined;
  }

  get tailGap(): string | undefined {
    const gap = this.element.querySelector<HTMLElement>(
      '.nui-table__body > .nui-table__gap:last-child',
    );

    return gap?.style.getPropertyValue('--_gap');
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

  async clickBand(label: string): Promise<void> {
    const cell = [
      ...this.element.querySelectorAll<HTMLElement>('.nui-table__row--band [role="columnheader"]'),
    ].find((candidate) => candidate.textContent?.trim() === label);

    cell?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
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
    const funnel = this.filterButton(col);

    if (funnel === null) {
      await this.openColumnMenu(col);
      this.menuEntry('Фильтр…')?.click();
    } else {
      funnel.click();
    }
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
      ...(this.popover?.querySelectorAll<HTMLElement>('.nui-table-filter__values label') ?? []),
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
      '.nui-table-filter__actions button',
    );

    buttons?.[0]?.click();
    await settled;
    await nextTick();
  }

  async toggleRow(position: number): Promise<void> {
    this.row(position)?.querySelector<HTMLElement>('.nui-table__toggle--expandable')?.click();
    await nextTick();
  }

  async toggleGroup(position: number): Promise<void> {
    this.row(position)?.querySelector<HTMLElement>('.nui-table__group')?.click();
    await nextTick();
  }

  async setGroupBy(keys: readonly string[]): Promise<void> {
    const settled = this.nextSettle();

    this.models.groupBy.value = keys;
    await settled;
    await nextTick();
  }

  async setQuick(text: string): Promise<void> {
    const settled = this.nextSettle();

    this.models.quick.value = text;
    await settled;
    await nextTick();
  }

  async setSort(next: readonly TableSort[]): Promise<void> {
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

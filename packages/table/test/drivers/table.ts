import { flushPromises, mount, type DOMWrapper, type VueWrapper } from '@vue/test-utils';
import { createNuiConfig, type NuiConfigOptions } from '@numior/primitives';
import { vi } from 'vitest';
import {
  defineComponent,
  h,
  nextTick,
  ref,
  shallowRef,
  type Plugin,
  type Ref,
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
  type NuiTableWidths,
  type NuiTableColumnOrder,
  type NuiTableReorderEvent,
  type NuiTableEditEvent,
  type NuiTableProps,
  type NuiTableColumnDef,
  type NuiTableRanges,
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
  readonly widths?: NuiTableWidths;
  readonly columnOrder?: NuiTableColumnOrder;
  readonly selected?: readonly T[];
  readonly page?: number;
  readonly pageSize?: number;
  readonly slots?: Slots;
  readonly width?: number;
  readonly onEdit?: (event: NuiTableEditEvent<T>) => void;
  readonly height?: number;
  readonly auto?: boolean;
  readonly dir?: 'ltr' | 'rtl';
  readonly config?: NuiConfigOptions;
}

type MountDefaults = Required<
  Pick<
    TableMountOptions<never>,
    | 'sort'
    | 'filters'
    | 'groupBy'
    | 'expanded'
    | 'pins'
    | 'hidden'
    | 'widths'
    | 'columnOrder'
    | 'width'
    | 'height'
    | 'dir'
  >
>;

const MOUNT_DEFAULTS: MountDefaults = {
  sort: [],
  filters: [],
  groupBy: [],
  expanded: [],
  pins: {},
  hidden: [],
  widths: {},
  columnOrder: [],
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
  readonly widths: ShallowRef<NuiTableWidths>;
  readonly columnOrder: ShallowRef<NuiTableColumnOrder>;
  readonly selected: ShallowRef<readonly T[]>;
  readonly page: ShallowRef<number>;
  readonly pageSize: ShallowRef<number>;
  readonly ranges: Ref<NuiTableRanges>;
}

type TableProps<T> = Omit<NuiTableProps<T>, 'columns' | 'rows'>;

interface TableEvents<T> {
  settled: number;
  progress: number;
  readonly loads: T[];
  readonly clicks: T[];
  readonly reorders: NuiTableReorderEvent<T>[];
  readonly edits: NuiTableEditEvent<T>[];
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

const LAYOUT_WIDTH = 4000;
const LAYOUT_HEIGHT = 300;
const HEAD_HEIGHT = 40;
const GRAB_NUDGE = 10;

const dragHandle = async (handle: HTMLElement | null, name: string, dx: number): Promise<void> => {
  if (handle === null) {
    throw new Error(`${name} has no resize handle`);
  }

  handle.dispatchEvent(
    new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerId: 1, clientX: 100 }),
  );

  window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientX: 100 + dx }));
  window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, clientX: 100 + dx }));
  await nextTick();
};

const RANGE_POINTER = 4;

interface Point {
  readonly x: number;
  readonly y: number;
}

const pointerInit = (point: Point, options: KeyOptions): PointerEventInit => ({
  bubbles: true,
  cancelable: true,
  button: 0,
  pointerId: RANGE_POINTER,
  pointerType: 'mouse',
  clientX: point.x,
  clientY: point.y,
  shiftKey: options.shift ?? false,
  ctrlKey: options.ctrl ?? false,
});

const ROW_EARLY = 10;
const ROW_MIDDLE = 20;
const ROW_LATE = 30;

type DropSide = 'before' | 'after' | 'inside';

interface DropMark {
  readonly kind: 'line' | 'box';
  readonly start: string;
  readonly size?: string | undefined;
  readonly inset?: string | undefined;
}

const defineRect = (element: Element, rect: DOMRect): void => {
  Object.defineProperty(element, 'getBoundingClientRect', {
    value: () => rect,
    configurable: true,
  });
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
    const widths = shallowRef<NuiTableWidths>(settings.widths);
    const columnOrder = shallowRef<NuiTableColumnOrder>(settings.columnOrder);
    const selected = shallowRef<readonly T[]>(settings.selected ?? []);
    const page = shallowRef(settings.page ?? 1);
    const pageSize = shallowRef(settings.pageSize ?? 20);
    const ranges = ref<NuiTableRanges>([]);
    const props = shallowRef<TableProps<T>>(settings.props ?? {});
    const stubs = new TopLayerStubs();
    const exposed = shallowRef<NuiTableExposed | null>(null);

    const events: TableEvents<T> = {
      settled: 0,
      progress: 0,
      loads: [],
      clicks: [],
      reorders: [],
      edits: [],
      waiters: [],
    };

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
              widths: widths.value,
              'onUpdate:widths': (next: NuiTableWidths) => {
                widths.value = next;
              },
              columnOrder: columnOrder.value,
              'onUpdate:columnOrder': (next: NuiTableColumnOrder) => {
                columnOrder.value = next;
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
              ranges: ranges.value,
              'onUpdate:ranges': (next: NuiTableRanges) => {
                ranges.value = next;
              },
              onRowClick: (row: T) => {
                events.clicks.push(row);
              },
              onReorder: (event: NuiTableReorderEvent<T>) => {
                events.reorders.push(event);
              },
              onEdit: (event: NuiTableEditEvent<T>) => {
                events.edits.push(event);
                settings.onEdit?.(event);
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
      widths,
      columnOrder,
      selected,
      page,
      pageSize,
      ranges,
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

  bandRules(level: number): Array<string | undefined> {
    const row = this.wrapper.findAll('.nui-table__row--band')[level];

    return (row?.findAll('th') ?? []).map((cell) =>
      [...cell.element.classList]
        .find((name) => name.startsWith('nui-table__cell--rule-'))
        ?.replace('nui-table__cell--rule-', ''),
    );
  }

  bandCell(label: string): HTMLElement | null {
    return (
      [
        ...this.element.querySelectorAll<HTMLElement>(
          '.nui-table__row--band [role="columnheader"]',
        ),
      ].find((cell) => cell.textContent?.trim() === label) ?? null
    );
  }

  bandResizer(label: string): HTMLElement | null {
    return this.bandCell(label)?.querySelector<HTMLElement>('.nui-table__resizer') ?? null;
  }

  async dragBandResizer(label: string, dx: number): Promise<void> {
    await dragHandle(this.bandResizer(label), `band ${label}`, dx);
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

  get widths(): NuiTableWidths {
    return this.models.widths.value;
  }

  get columnOrder(): NuiTableColumnOrder {
    return this.models.columnOrder.value;
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
      this.element
        .closest('.nui-table')
        ?.querySelector<HTMLElement>(':scope > .nui-menu:not(.nui-table__cell-menu)') ?? null
    );
  }

  private get cellMenu(): HTMLElement | null {
    return (
      this.element
        .closest('.nui-table')
        ?.querySelector<HTMLElement>(':scope > .nui-table__cell-menu') ?? null
    );
  }

  private cellMenuEntries(): HTMLElement[] {
    return [...(this.cellMenu?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
  }

  get cellMenuFocused(): boolean {
    return this.cellMenu?.contains(document.activeElement) ?? false;
  }

  get cellMenuLabels(): string[] {
    return this.cellMenuEntries().map(
      (entry) => entry.querySelector('.nui-menu-item__label')?.textContent?.trim() ?? '',
    );
  }

  cellMenuDisabled(label: string): boolean {
    return (
      this.cellMenuEntries()
        .find(
          (entry) => entry.querySelector('.nui-menu-item__label')?.textContent?.trim() === label,
        )
        ?.getAttribute('aria-disabled') === 'true'
    );
  }

  async closeCellMenu(): Promise<void> {
    if (this.cellMenu !== null) {
      dismissPopoverNatively(this.cellMenu);
    }
    await nextTick();
  }

  async chooseCellMenu(label: string): Promise<void> {
    this.cellMenuEntries()
      .find((entry) => entry.querySelector('.nui-menu-item__label')?.textContent?.trim() === label)
      ?.click();

    await flushPromises();
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

  get reorders(): readonly NuiTableReorderEvent<T>[] {
    return this.events.reorders;
  }

  get edits(): readonly NuiTableEditEvent<T>[] {
    return this.events.edits;
  }

  get dropMark(): DropMark | undefined {
    const box = this.wrapper.find<HTMLElement>('.nui-table__drop--box');

    if (box.exists()) {
      return {
        kind: 'box',
        start: box.element.style.getPropertyValue('--_drop'),
        size: box.element.style.getPropertyValue('--_size'),
      };
    }
    const line = this.wrapper.find<HTMLElement>('.nui-table__drop--y');

    return line.exists()
      ? {
          kind: 'line',
          start: line.element.style.getPropertyValue('--_drop'),
          inset: line.element.style.getPropertyValue('--_drop-inset'),
        }
      : undefined;
  }

  get ghostSize(): string | undefined {
    const ghost = this.wrapper.find<HTMLElement>('.nui-table__ghost--y');

    return ghost.exists() ? ghost.element.style.getPropertyValue('--_size') : undefined;
  }

  get ghostText(): string | undefined {
    const ghost = this.wrapper.find('.nui-table__ghost--y');
    return ghost.exists() ? ghost.text() : undefined;
  }

  rowGrip(position: number): HTMLButtonElement | null {
    return this.row(position)?.querySelector<HTMLButtonElement>('.nui-table__row-grip') ?? null;
  }

  gripColumn(position: number): number | undefined {
    const cell = this.rowGrip(position)?.closest('[aria-colindex]');
    return cell === null || cell === undefined
      ? undefined
      : Number(cell.getAttribute('aria-colindex'));
  }

  private layoutRows(): void {
    const frame = this.wrapper.find<HTMLElement>('.nui-table__frame').element;

    defineRect(frame, new DOMRect(0, 0, LAYOUT_WIDTH, LAYOUT_HEIGHT));

    for (const row of this.element.querySelectorAll<HTMLElement>(
      '.nui-table__body > [role="row"]',
    )) {
      const top = (Number(row.getAttribute('aria-rowindex')) - 1) * HEAD_HEIGHT;

      defineRect(row, new DOMRect(0, top, LAYOUT_WIDTH, HEAD_HEIGHT));

      if (row.firstElementChild) {
        defineRect(row.firstElementChild, new DOMRect(0, top, LAYOUT_WIDTH, HEAD_HEIGHT));
      }
    }
  }

  get ranges(): NuiTableRanges {
    return this.models.ranges.value;
  }

  rangeMarks(position: number, col: number): string[] {
    const cell = this.cell(position, col);

    const marks = [...(cell?.classList ?? [])].filter((name) =>
      name.startsWith('nui-table__cell--range'),
    );

    return [
      ...(cell?.getAttribute('aria-selected') === 'true' ? ['selected'] : []),
      ...marks.map((name) => name.replace('nui-table__cell--', '')),
    ];
  }

  private layoutBody(): void {
    const tracks = [...this.element.querySelectorAll<HTMLElement>('colgroup > col')].map(
      (track) => Number.parseFloat(track.style.inlineSize) || 0,
    );

    const frame = this.wrapper.find<HTMLElement>('.nui-table__frame').element;

    defineRect(
      this.element,
      new DOMRect(0, 0, this.element.clientWidth, this.element.clientHeight),
    );

    defineRect(frame, new DOMRect(0, 0, this.element.clientWidth, this.element.clientHeight));

    for (const row of this.element.querySelectorAll('.nui-table__body > [role="row"]')) {
      const top = (Number(row.getAttribute('aria-rowindex')) - 1) * HEAD_HEIGHT;
      let left = 0;

      for (const [index, cell] of [...row.children].entries()) {
        const width = tracks[index] ?? 0;

        defineRect(cell, new DOMRect(left, top, width, HEAD_HEIGHT));
        left += width;
      }
    }
  }

  private pointAt(position: number, col: number): Point {
    const rect = this.cell(position, col)?.getBoundingClientRect();

    if (rect === undefined) {
      throw new Error(`No cell at ${position}:${col}`);
    }
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }

  private pressDown(cell: HTMLElement | null, start: Point, options: KeyOptions): void {
    cell?.dispatchEvent(new PointerEvent('pointerdown', pointerInit(start, options)));

    const pressed = new MouseEvent('mousedown', pointerInit(start, options));

    cell?.dispatchEvent(pressed);

    if (!pressed.defaultPrevented) {
      cell?.focus();
    }
  }

  async dragRange(from: CellPosition, to: CellPosition, options: KeyOptions = {}): Promise<void> {
    this.layoutBody();
    const start = this.pointAt(from.row, from.col);
    const end = this.pointAt(to.row, to.col);

    this.pressDown(this.cell(from.row, from.col), start, options);
    window.dispatchEvent(new PointerEvent('pointermove', pointerInit(end, options)));
    window.dispatchEvent(new PointerEvent('pointerup', pointerInit(end, options)));
    this.cell(to.row, to.col)?.dispatchEvent(new MouseEvent('click', pointerInit(end, options)));
    await nextTick();
  }

  async blur(): Promise<void> {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    await nextTick();
  }

  selectText(position: number, col: number): void {
    const cell = this.cell(position, col);

    if (cell !== null) {
      window.getSelection()?.selectAllChildren(cell);
    }
  }

  get textSelection(): string {
    return window.getSelection()?.toString() ?? '';
  }

  async clickCell(position: number, col: number, options: KeyOptions = {}): Promise<void> {
    this.layoutBody();
    const point = this.pointAt(position, col);
    const cell = this.cell(position, col);

    this.pressDown(cell, point, options);
    window.dispatchEvent(new PointerEvent('pointerup', pointerInit(point, options)));
    cell?.dispatchEvent(new MouseEvent('click', pointerInit(point, options)));
    await nextTick();
  }

  async openCellMenu(position: number, col: number): Promise<boolean> {
    this.layoutBody();
    const point = this.pointAt(position, col);
    const event = new MouseEvent('contextmenu', { ...pointerInit(point, {}), button: 2 });

    this.cell(position, col)?.dispatchEvent(event);
    await nextTick();
    return event.defaultPrevented;
  }

  async holdCell(position: number, col: number, ms: number): Promise<void> {
    this.layoutBody();
    const point = this.pointAt(position, col);

    this.cell(position, col)?.dispatchEvent(
      new PointerEvent('pointerdown', { ...pointerInit(point, {}), pointerType: 'touch' }),
    );

    await vi.advanceTimersByTimeAsync(ms);
  }

  gripDisabled(position: number): boolean {
    return this.rowGrip(position)?.disabled ?? true;
  }

  rowDragging(position: number): boolean {
    return this.row(position)?.classList.contains('nui-table__row--dragging') ?? false;
  }

  private rowY(position: number, side: DropSide): number {
    const pinned = this.element.querySelectorAll('.nui-table__pinned > [role="row"]').length;
    const top = (this.headRows + pinned + position) * HEAD_HEIGHT;

    switch (side) {
      case 'before':
        return top + ROW_EARLY;
      case 'after':
        return top + ROW_LATE;
      case 'inside':
        return top + ROW_MIDDLE;
    }
  }

  async grabRow(position: number): Promise<void> {
    const grip = this.rowGrip(position);

    if (grip === null) {
      throw new Error(`Row ${position} has no drag grip`);
    }
    const y = this.rowY(position, 'before') + GRAB_NUDGE;

    this.layoutRows();

    grip.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerId: 3, clientY: y }),
    );

    window.dispatchEvent(
      new PointerEvent('pointermove', { pointerId: 3, clientY: y + GRAB_NUDGE }),
    );

    await nextTick();
  }

  async moveRowTo(position: number, side: DropSide): Promise<void> {
    this.layoutRows();

    window.dispatchEvent(
      new PointerEvent('pointermove', { pointerId: 3, clientY: this.rowY(position, side) }),
    );

    await nextTick();
  }

  async dropRow(): Promise<void> {
    window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 3 }));
    await nextTick();
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

  trackWidth(col: number): string | undefined {
    const head = this.header(col);
    const siblings = [...(head?.parentElement?.children ?? [])];

    const track =
      head === null
        ? undefined
        : this.element.querySelectorAll('colgroup > col')[siblings.indexOf(head)];

    return track instanceof HTMLElement ? track.style.inlineSize : undefined;
  }

  grip(col: number): HTMLElement | null {
    return this.header(col)?.querySelector<HTMLElement>('.nui-table__grip') ?? null;
  }

  layoutHeaders(): void {
    const tracks = [...this.element.querySelectorAll<HTMLElement>('colgroup > col')].map(
      (track) => Number.parseFloat(track.style.inlineSize) || 0,
    );

    const frame = this.wrapper.find<HTMLElement>('.nui-table__frame').element;
    let left = 0;

    defineRect(this.element, new DOMRect(0, 0, LAYOUT_WIDTH, LAYOUT_HEIGHT));
    defineRect(frame, new DOMRect(0, 0, LAYOUT_WIDTH, LAYOUT_HEIGHT));

    for (const [index, cell] of [
      ...(this.element.querySelector('.nui-table__row--head')?.children ?? []),
    ].entries()) {
      const width = tracks[index] ?? 0;

      defineRect(cell, new DOMRect(left, 0, width, HEAD_HEIGHT));
      left += width;
    }
  }

  async dragHeader(col: number, target: number, side: 'before' | 'after'): Promise<void> {
    const grip = this.grip(col);
    const source = this.header(col)?.getBoundingClientRect();
    const destination = this.header(target)?.getBoundingClientRect();

    if (grip === null || source === undefined || destination === undefined) {
      throw new Error(`Cannot drag column ${col} to column ${target}`);
    }
    const x = source.left + source.width / 2;

    const to =
      destination.left + destination.width / 2 + (side === 'after' ? GRAB_NUDGE : -GRAB_NUDGE);

    grip.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerId: 2, clientX: x }),
    );

    window.dispatchEvent(
      new PointerEvent('pointermove', { pointerId: 2, clientX: x + GRAB_NUDGE }),
    );

    window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 2, clientX: to }));
    window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 2, clientX: to }));
    await nextTick();
  }

  resizer(col: number): HTMLElement | null {
    return this.header(col)?.querySelector<HTMLElement>('.nui-table__resizer') ?? null;
  }

  async dragResizer(col: number, dx: number): Promise<void> {
    await dragHandle(this.resizer(col), `column ${col}`, dx);
  }

  rowTop(position: number): string | undefined {
    const row = this.row(position);
    const top = row instanceof HTMLElement ? row.style.getPropertyValue('--_top') : '';
    return top === '' ? undefined : top;
  }

  get canvasRest(): string | undefined {
    const rest = this.element.querySelector<HTMLElement>('.nui-table__canvas > .nui-table__rest');
    return rest?.style.getPropertyValue('--_rest');
  }

  get rowElements(): HTMLElement[] {
    return [...this.element.querySelectorAll<HTMLElement>('.nui-table__body > [role="row"]')];
  }

  get activeCellElement(): HTMLElement | null {
    return this.element.querySelector<HTMLElement>('.nui-table__cell--active');
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
